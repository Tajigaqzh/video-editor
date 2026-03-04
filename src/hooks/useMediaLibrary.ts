import { useCallback, useState } from "react";
import { useTimelineStore, Media, MediaType } from "@/store/timelineStore";
import {
  copyMediaToTemp,
  getTempSize,
  cleanupTempFiles,
  getMediaType,
  formatFileSize,
} from "@/utils/media/mediaManager";
import { invoke } from "@tauri-apps/api/core";
import { enqueueProxyTranscode } from "@/services/proxyQueue";
import { enqueueWaveformGeneration } from "@/services/waveformQueue";
import { enqueueThumbnailGeneration } from "@/services/thumbnailQueue";
import { selectProxyProfileForMedia } from "@/utils/media/proxyProfile";

/**
 * 媒体库管理 Hook
 * 处理媒体文件的添加、删除和管理
 * 媒体文件自动复制到应用 temp 文件夹
 */
export function useMediaLibrary() {
  const { project, addMedia, removeMedia } = useTimelineStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempSize, setTempSize] = useState(0);

  // 获取 temp 文件夹大小
  const updateTempSize = useCallback(async () => {
    try {
      const size = await getTempSize();
      setTempSize(size);
    } catch (err) {
      console.error("Failed to get temp size:", err);
    }
  }, []);

  // 添加媒体文件
  const addMediaFile = useCallback(
    async (filePath: string) => {
      setIsLoading(true);
      setError(null);

      try {
        // 获取视频信息
        const videoInfo = await invoke<any>("get_video_info", {
          path: filePath,
        });

        // 复制文件到应用 temp 文件夹
        const relativePath = await copyMediaToTemp(filePath);

        // 获取文件名
        const fileName = filePath.split(/[\\/]/).pop() || "unknown";
        const mediaType = getMediaType(filePath);

        // 创建媒体对象
        const proxyProfile = selectProxyProfileForMedia({
          width: videoInfo.width,
          height: videoInfo.height,
        });

        const media: Media = {
          id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: fileName,
          type: mediaType as MediaType,
          path: relativePath, // 使用 temp 文件夹中的相对路径
          originalPath: filePath, // 保存原始文件路径（用于 FFmpeg）
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

        // 添加到媒体库
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

        // 更新 temp 文件夹大小
        await updateTempSize();

        return media;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [addMedia, updateTempSize],
  );

  // 删除媒体文件
  const deleteMedia = useCallback(
    async (mediaId: string) => {
      try {
        const media = project.media.find((m) => m.id === mediaId);
        if (!media) return;

        // 从媒体库中删除
        removeMedia(mediaId);

        // 删除 temp 文件夹中的文件
        try {
          await invoke("remove_media_from_temp", {
            relativePath: media.path,
          });
        } catch (err) {
          console.warn("Failed to remove temp file:", err);
        }

        // 更新 temp 文件夹大小
        await updateTempSize();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
        throw err;
      }
    },
    [project.media, removeMedia, updateTempSize],
  );

  // 清理过期文件
  const cleanupOldFiles = useCallback(async () => {
    try {
      // 获取所有正在使用的缓存路径（含素材、代理、波形、缩略图）
      const usedFiles = Array.from(
        new Set(
          project.media
            .flatMap((media) => [
              media.path,
              media.proxyPath,
              media.waveformPath,
              media.thumbnailPath,
              media.thumbnailDir,
            ])
            .filter((path): path is string => typeof path === "string" && path.length > 0),
        ),
      );

      // 清理不在使用的文件（策略参数可在需要时由调用方传入）
      await cleanupTempFiles(usedFiles);

      // 更新 temp 文件夹大小
      await updateTempSize();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      throw err;
    }
  }, [project.media, updateTempSize]);

  // 初始化时获取 temp 文件夹大小
  const initialize = useCallback(async () => {
    await updateTempSize();
  }, [updateTempSize]);

  return {
    // 状态
    isLoading,
    error,
    tempSize,
    tempSizeFormatted: formatFileSize(tempSize),

    // 操作
    addMediaFile,
    deleteMedia,
    cleanupOldFiles,
    initialize,
    updateTempSize,
  };
}
