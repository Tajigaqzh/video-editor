import React, { useEffect } from 'react';
import { useTimelineStore } from '@/store/timelineStore';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { open } from '@tauri-apps/plugin-dialog';

/**
 * 媒体库面板组件
 * 展示媒体库中的所有文件，支持添加和删除
 * 媒体文件自动保存到应用 temp 文件夹
 */
export function MediaLibraryPanel() {
  const { project } = useTimelineStore();
  const {
    isLoading,
    error,
    tempSizeFormatted,
    addMediaFile,
    deleteMedia,
    cleanupOldFiles,
    initialize,
  } = useMediaLibrary();

  // 初始化
  useEffect(() => {
    initialize();
  }, [initialize]);

  // 处理添加媒体文件
  const handleAddMedia = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'Media Files',
            extensions: ['mp4', 'avi', 'mov', 'mkv', 'mp3', 'wav', 'jpg', 'png'],
          },
        ],
      });

      if (!selected) return;

      const files = Array.isArray(selected) ? selected : [selected];

      for (const file of files) {
        try {
          await addMediaFile(file);
        } catch (err) {
          console.error(`Failed to add ${file}:`, err);
        }
      }
    } catch (err) {
      console.error('Failed to open file dialog:', err);
    }
  };

  // 处理删除媒体文件
  const handleDeleteMedia = async (mediaId: string) => {
    if (confirm('确定要删除这个媒体文件吗？')) {
      try {
        await deleteMedia(mediaId);
      } catch (err) {
        console.error('Failed to delete media:', err);
      }
    }
  };

  // 处理清理过期文件
  const handleCleanup = async () => {
    try {
      await cleanupOldFiles();
      alert('清理完成');
    } catch (err) {
      console.error('Failed to cleanup:', err);
    }
  };

  return (
    <div className="media-library-panel">
      <div className="panel-header">
        <h3>媒体库</h3>
        <div className="header-actions">
          <button onClick={handleAddMedia} disabled={isLoading}>
            {isLoading ? '加载中...' : '添加媒体'}
          </button>
          <button onClick={handleCleanup} disabled={isLoading}>
            清理过期文件
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="temp-info">
        <span>Temp 文件夹大小: {tempSizeFormatted}</span>
      </div>

      <div className="media-list">
        {project.media.length === 0 ? (
          <div className="empty-state">
            <p>还没有添加任何媒体文件</p>
            <p>点击"添加媒体"按钮开始</p>
          </div>
        ) : (
          <div className="media-items">
            {project.media.map((media) => (
              <div
                key={media.id}
                className="media-item"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'copy';
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    dragType: 'media',  // 用于区分是媒体还是片段
                    type: media.type,   // 媒体类型：video/audio/image
                    id: media.id,
                    name: media.name,
                    path: media.path,
                    duration: media.duration,
                    width: media.width,
                    height: media.height,
                    fps: media.fps,
                  }));
                }}
              >
                <div className="media-info">
                  <div className="media-name">{media.name}</div>
                  <div className="media-meta">
                    <span className="media-type">{media.type}</span>
                    <span className="media-duration">
                      {media.duration.toFixed(2)}s
                    </span>
                    {media.width && media.height && (
                      <span className="media-resolution">
                        {media.width}x{media.height}
                      </span>
                    )}
                  </div>
                  <div className="media-path">{media.path}</div>
                </div>
                <button
                  className="delete-btn"
                  onClick={() => handleDeleteMedia(media.id)}
                  disabled={isLoading}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .media-library-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #1e1e1e;
          color: #e0e0e0;
          border-right: 1px solid #333;
        }

        .panel-header {
          padding: 12px;
          border-bottom: 1px solid #333;
        }

        .panel-header h3 {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 600;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .header-actions button {
          flex: 1;
          padding: 6px 12px;
          background: #0e639c;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: background 0.2s;
        }

        .header-actions button:hover:not(:disabled) {
          background: #1177bb;
        }

        .header-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-message {
          padding: 8px 12px;
          background: #5f2c2c;
          color: #ff6b6b;
          font-size: 12px;
          border-bottom: 1px solid #333;
        }

        .temp-info {
          padding: 8px 12px;
          background: #2d2d2d;
          font-size: 12px;
          border-bottom: 1px solid #333;
        }

        .media-list {
          flex: 1;
          overflow-y: auto;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #666;
          text-align: center;
        }

        .empty-state p {
          margin: 4px 0;
          font-size: 12px;
        }

        .media-items {
          display: flex;
          flex-direction: column;
        }

        .media-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-bottom: 1px solid #2d2d2d;
          transition: background 0.2s;
          cursor: move;
          user-select: none;
        }

        .media-item:hover {
          background: #2d2d2d;
        }

        .media-item:active {
          opacity: 0.7;
        }

        .media-info {
          flex: 1;
          min-width: 0;
        }

        .media-name {
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .media-meta {
          display: flex;
          gap: 8px;
          margin-top: 4px;
          font-size: 11px;
          color: #999;
        }

        .media-type {
          background: #0e639c;
          padding: 2px 6px;
          border-radius: 2px;
          text-transform: uppercase;
        }

        .media-path {
          font-size: 10px;
          color: #666;
          margin-top: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .delete-btn {
          padding: 4px 8px;
          background: #5f2c2c;
          color: #ff6b6b;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
          transition: background 0.2s;
          margin-left: 8px;
          flex-shrink: 0;
        }

        .delete-btn:hover:not(:disabled) {
          background: #7a3a3a;
        }

        .delete-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
