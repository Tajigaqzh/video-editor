import { useState, useRef, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { ALL_SUPPORT_MEDIA_EXTENSIONS } from "@/constants/media";
import { getFileType, getFileName } from "@/hooks/useMediaFile";
import { useTimelineStore, type Media, type MediaType } from "@/store/timelineStore";
import { enqueueProxyTranscode } from "@/services/proxyQueue";
import { enqueueWaveformGeneration } from "@/services/waveformQueue";
import { enqueueThumbnailGeneration } from "@/services/thumbnailQueue";
import { selectProxyProfileForMedia } from "@/utils/media/proxyProfile";
import {
  type MediaFile,
  type MediaFolder,
  type MediaItem,
  findFolder,
  addItemsToFolder,
  removeItemFromFolder,
} from "@/utils/media/mediaOperations";
import ContextMenu from "./ContextMenu";
import RenameDialog from "./RenameDialog";

export default function MediaLibrary() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("素材");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    itemId?: string;
    itemName?: string;
  } | null>(null);
  const [renameDialog, setRenameDialog] = useState<{ itemId: string; itemName: string } | null>(
    null,
  );
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const tabs = [
    {
      id: "素材",
      icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    },
    {
      id: "音频",
      icon: "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3",
    },
    {
      id: "文本",
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    },
    { id: "转场", icon: "M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" },
  ];

  // 获取当前文件夹的内容
  const getCurrentItems = (): MediaItem[] => {
    if (!currentFolder) return mediaItems;

    const folder = findFolder(mediaItems, currentFolder);
    return folder ? folder.children : [];
  };

  const handleAddFiles = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: "Media",
            extensions: ALL_SUPPORT_MEDIA_EXTENSIONS,
          },
        ],
      });

      if (selected) {
        const files = Array.isArray(selected) ? selected : [selected];
        const newFiles: MediaFile[] = files.map((filePath) => ({
          id: crypto.randomUUID(),
          name: getFileName(filePath),
          path: filePath,
          url: convertFileSrc(filePath),
          type: getFileType(filePath),
        }));

        setMediaItems((prev) => addItemsToFolder(prev, currentFolder, newFiles));

        // 同时添加到 store 中
        const { addMedia } = useTimelineStore.getState();
        for (const file of newFiles) {
          try {
            const videoInfo = await invoke<any>("get_video_info", {
              path: file.path,
            });

            const proxyProfile = selectProxyProfileForMedia({
              width: videoInfo.width,
              height: videoInfo.height,
            });

            const media: Media = {
              id: file.id,
              name: file.name,
              type: file.type as MediaType,
              path: file.path,
              originalPath: file.path,
              duration: videoInfo.duration || 0,
              width: videoInfo.width,
              height: videoInfo.height,
              fps: videoInfo.fps,
              codec: videoInfo.codec,
              fileSize: videoInfo.file_size || 0,
              createdAt: new Date().toISOString(),
              sampleRate: videoInfo.sample_rate,
              channels: videoInfo.channels,
              proxyStatus: "none",
              proxyProfile,
              proxyUpdatedAt: new Date().toISOString(),
              waveformStatus: "none",
              waveformUpdatedAt: new Date().toISOString(),
            };

            addMedia(media);
            if (media.type === "video" && media.originalPath) {
              enqueueProxyTranscode(media.id, media.originalPath, media.proxyProfile ?? "medium");
              enqueueThumbnailGeneration(media.id, media.originalPath, {
                mode: "first_screen",
                priority: 12,
              });
            }
            if ((media.type === "video" || media.type === "audio") && media.originalPath) {
              enqueueWaveformGeneration(media.id, media.originalPath);
            }
            console.log("✅ Media added to store:", file.name);
          } catch (err) {
            console.error("Failed to get video info for", file.name, ":", err);
          }
        }
      }
    } catch (error) {
      console.error("Error selecting files:", error);
    }
  };

  const handleCreateFolder = () => {
    const timestamp = Date.now();
    const folderName = `新建文件夹_${timestamp}`;
    const newFolder: MediaFolder = {
      id: crypto.randomUUID(),
      name: folderName,
      type: "folder",
      children: [],
    };
    setMediaItems((prev) => addItemsToFolder(prev, currentFolder, [newFolder]));
  };

  const handleOpenFolder = (folderId: string, folderName: string) => {
    setCurrentFolder(folderId);
    setFolderPath((prev) => [...prev, folderName]);
  };

  const handleGoBack = () => {
    if (folderPath.length === 0) return;

    const newPath = [...folderPath];
    newPath.pop();
    setFolderPath(newPath);

    if (newPath.length === 0) {
      setCurrentFolder(null);
    } else {
      // 需要找到对应路径的文件夹ID
      let items = mediaItems;
      let folderId: string | null = null;

      for (const pathName of newPath) {
        const folder = items.find(
          (item) => item.type === "folder" && item.name === pathName,
        ) as MediaFolder;
        if (folder) {
          folderId = folder.id;
          items = folder.children;
        }
      }
      setCurrentFolder(folderId);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    // Tauri 拖放需要特殊处理，这里先预留
  };

  const handleContextMenu = (e: React.MouseEvent, itemId?: string, itemName?: string) => {
    e.preventDefault();
    e.stopPropagation();

    // 获取菜单尺寸（估算）
    const menuWidth = 200;
    const menuHeight = itemId ? 150 : 100;

    // 计算位置，确保不超出视口
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }

    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    setContextMenu({ x, y, itemId, itemName });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // 监听全局点击事件，关闭右键菜单
  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (_e: MouseEvent) => {
      setContextMenu(null);
    };

    // 延迟添加监听器，避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("contextmenu", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("contextmenu", handleClickOutside);
    };
  }, [contextMenu]);

  const handleContextMenuAction = (action: string) => {
    if (action === "newFolder") {
      handleCreateFolder();
    } else if (action === "addFiles") {
      handleAddFiles();
    } else if (action === "rename" && contextMenu?.itemId && contextMenu?.itemName) {
      setRenameDialog({ itemId: contextMenu.itemId, itemName: contextMenu.itemName });
    } else if (action === "delete" && contextMenu?.itemId) {
      handleRemoveItem(contextMenu.itemId);
    }
    handleCloseContextMenu();
  };

  const handleRenameItem = (itemId: string, newName: string) => {
    const renameInFolder = (items: MediaItem[]): MediaItem[] => {
      return items.map((item) => {
        if (item.id === itemId) {
          return { ...item, name: newName };
        }
        if (item.type === "folder") {
          return {
            ...item,
            children: renameInFolder((item as MediaFolder).children),
          } as MediaFolder;
        }
        return item;
      });
    };

    setMediaItems((prev) => renameInFolder(prev));
    setRenameDialog(null);
  };

  const handleRemoveItem = (id: string) => {
    setMediaItems((prev) => removeItemFromFolder(prev, id));
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "#141414" }}>
      <div className="px-2 py-2 border-b border-gray-700 flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-12 h-12 flex flex-col items-center justify-center rounded transition-colors ${
              activeTab === tab.id
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:bg-gray-700/30 hover:text-white"
            }`}
          >
            <svg className="w-4 h-4 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            <span className="text-xs">{tab.id}</span>
          </button>
        ))}
      </div>

      <div
        ref={dropZoneRef}
        className={`flex-1 overflow-auto p-4 ${
          isDragging ? "bg-gray-700 border-2 border-dashed border-blue-500" : ""
        }`}
        style={!isDragging ? { backgroundColor: "#141414" } : undefined}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onContextMenu={handleContextMenu}
      >
        {/* 素材标签页 */}
        {activeTab === "素材" && (
          <>
            {/* 面包屑导航 */}
            {folderPath.length > 0 && (
              <div className="flex items-center gap-2 mb-4 text-xs text-gray-400">
                <button
                  onClick={handleGoBack}
                  className="hover:text-white transition-colors p-1"
                  title="返回上一级"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setCurrentFolder(null);
                    setFolderPath([]);
                  }}
                  className="hover:text-white transition-colors"
                >
                  根目录
                </button>
                {folderPath.map((name, index) => (
                  <span key={index} className="flex items-center gap-2">
                    <span>/</span>
                    <span>{name}</span>
                  </span>
                ))}
              </div>
            )}

            {/* 素材列表 */}
            <div className="flex flex-wrap gap-2">
              {/* 空状态提示 - 列表为空时显示 */}
              {getCurrentItems().length === 0 && (
                <div
                  onClick={handleAddFiles}
                  className="w-full h-48 bg-gray-800/50 hover:bg-gray-800/70 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-white cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </div>
                    <span className="text-base font-medium">导入</span>
                  </div>
                  <p className="text-xs">视频、音频、图片</p>
                </div>
              )}

              {getCurrentItems().map((item) => (
                <div key={item.id}>
                  {item.type === "folder" ? (
                    <div
                      className="relative w-24 h-20 bg-gray-700 rounded overflow-hidden group cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                      onDoubleClick={() => handleOpenFolder(item.id, item.name)}
                      onContextMenu={(e) => handleContextMenu(e, item.id, item.name)}
                    >
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <svg className="w-10 h-10" fill="#DDB921" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                        <p className="text-white text-xs mt-1 truncate px-1 w-full text-center">
                          {item.name}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div
                      className="relative w-24 h-20 bg-gray-700 rounded overflow-hidden group cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "copy";
                        e.dataTransfer.setData(
                          "application/json",
                          JSON.stringify({
                            ...item,
                            dragType: "media",
                          }),
                        );
                        console.log("Drag start:", item);
                      }}
                      onDragEnd={(e) => {
                        console.log("Drag end, dropEffect:", e.dataTransfer.dropEffect);
                      }}
                      onContextMenu={(e) => handleContextMenu(e, item.id, item.name)}
                    >
                      {item.type === "video" && (
                        <video
                          src={(item as MediaFile).url}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {item.type === "image" && (
                        <img
                          src={(item as MediaFile).url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {item.type === "audio" && (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                        <p className="text-white text-xs truncate">{item.name}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* 音频标签页 */}
        {activeTab === "音频" && (
          <div className="flex items-center justify-center h-full">
            <span className="text-gray-500">音频内容区域</span>
          </div>
        )}

        {/* 文本标签页 */}
        {activeTab === "文本" && (
          <div className="flex items-center justify-center h-full">
            <span className="text-gray-500">文本内容区域</span>
          </div>
        )}

        {/* 转场标签页 */}
        {activeTab === "转场" && (
          <div className="flex items-center justify-center h-full">
            <span className="text-gray-500">转场内容区域</span>
          </div>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          itemId={contextMenu.itemId}
          onAction={handleContextMenuAction}
        />
      )}

      {/* 重命名弹框 */}
      {renameDialog && (
        <RenameDialog
          oldName={renameDialog.itemName}
          onConfirm={(newName) => handleRenameItem(renameDialog.itemId, newName)}
          onCancel={() => setRenameDialog(null)}
        />
      )}
    </div>
  );
}
