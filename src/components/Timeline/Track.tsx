import React, { useEffect, useMemo, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import type { Track as TrackType, Clip } from "@/store/timelineStore";
import { useTimelineStore } from "@/store/timelineStore";
import AudioWaveform from "./AudioWaveform";

interface TrackProps {
  track: TrackType;
  clips: Clip[];
  zoomLevel: number;
  visibleStart: number;
  visibleEnd: number;
  onDrop?: (e: React.DragEvent, trackId: string) => void;
}

const handleTrackDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  let dropEffect: DataTransfer["dropEffect"] = "copy";
  try {
    const raw = e.dataTransfer.getData("application/json");
    if (raw) {
      const data = JSON.parse(raw);
      if (data?.dragType === "clip") {
        dropEffect = "move";
      }
    }
  } catch {
    // ignore parse errors
  }
  e.dataTransfer.dropEffect = dropEffect;
};

const Track: React.FC<TrackProps> = ({
  track,
  clips,
  zoomLevel,
  visibleStart,
  visibleEnd,
  onDrop,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const removeTrack = useTimelineStore((state) => state.removeTrack);
  const getClipsByTrack = useTimelineStore((state) => state.getClipsByTrack);
  const mediaList = useTimelineStore((state) => state.project.media);
  const mediaById = useMemo(() => {
    const map = new Map<
      string,
      {
        type: string;
        thumbnailPath?: string;
        thumbnailStatus?: string;
      }
    >();
    for (const media of mediaList) {
      map.set(media.id, {
        type: media.type,
        thumbnailPath: media.thumbnailPath,
        thumbnailStatus: media.thumbnailStatus,
      });
    }
    return map;
  }, [mediaList]);

  useEffect(() => {
    let cancelled = false;
    const thumbnailsToResolve = clips
      .map((clip) => {
        const clipEnd = clip.startTime + clip.duration;
        if (clipEnd < visibleStart || clip.startTime > visibleEnd) {
          return null;
        }

        const media = mediaById.get(clip.mediaId);
        if (
          media?.type !== "video" ||
          media.thumbnailStatus !== "ready" ||
          !media.thumbnailPath ||
          thumbnailUrls[clip.mediaId]
        ) {
          return null;
        }
        return { mediaId: clip.mediaId, path: media.thumbnailPath };
      })
      .filter((item): item is { mediaId: string; path: string } => item !== null);

    if (thumbnailsToResolve.length === 0) return;

    const resolveThumbnails = async () => {
      const entries = await Promise.all(
        thumbnailsToResolve.map(async (item) => {
          try {
            const absolutePath = await invoke<string>("resolve_media_path", { path: item.path });
            return [item.mediaId, convertFileSrc(absolutePath)] as const;
          } catch (error) {
            console.warn("Failed to resolve thumbnail path:", error);
            return null;
          }
        }),
      );

      if (cancelled) return;

      setThumbnailUrls((prev) => {
        const next = { ...prev };
        for (const entry of entries) {
          if (!entry) continue;
          next[entry[0]] = entry[1];
        }
        return next;
      });
    };

    void resolveThumbnails();

    return () => {
      cancelled = true;
    };
  }, [clips, mediaById, thumbnailUrls, visibleEnd, visibleStart]);

  // Handle drag enter event
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Track dragEnter:", track.id, track.name);
    setIsDragOver(true);
  };

  // Handle drag leave event
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Track dragLeave:", track.id);
    setIsDragOver(false);
  };

  // Handle drop event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    console.log("Track drop event triggered for track:", track.id);
    console.log("Drop clientX:", e.clientX, "clientY:", e.clientY);

    if (onDrop) {
      onDrop(e, track.id);
    }
  };

  // Handle track deletion
  const handleDelete = () => {
    const trackClips = getClipsByTrack(track.id);

    // Requirement 9.6: Show confirmation dialog if track has clips
    if (trackClips.length > 0) {
      const confirmed = window.confirm(
        `确定要删除轨道 "${track.name}" 及其包含的 ${trackClips.length} 个片段吗？`,
      );
      if (!confirmed) return;
    }

    // Requirement 9.3: Delete track and all its clips
    // Requirement 9.5: Allow deletion of empty tracks
    removeTrack(track.id);
  };

  // Check if track is empty
  const isEmpty = clips.length === 0;

  return (
    <div
      className="track-container border-b border-gray-800"
      style={{
        height: `${track.height}px`,
        position: "relative",
        backgroundColor: isDragOver ? "#2a2a2a" : "#1e1e1e",
        transition: "background-color 0.2s",
        display: "flex",
      }}
      onDragEnter={handleDragEnter}
      onDragOver={handleTrackDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Track Header - Fixed on left */}
      <div
        className="track-header"
        style={{
          width: "120px",
          height: "100%",
          backgroundColor: "#252525",
          borderRight: "1px solid #333",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          flexShrink: 0,
          position: "sticky",
          left: 0,
          zIndex: 5,
        }}
      >
        {/* Track Name */}
        <div className="track-name flex-1">
          <div className="text-xs font-medium" style={{ color: "#ccc" }}>
            {track.name}
          </div>
          <div className="text-xs" style={{ color: "#666", marginTop: "2px" }}>
            {track.type === "video" ? "视频" : "音频"}
          </div>
        </div>

        {/* Delete Icon Button */}
        <button
          onClick={handleDelete}
          className="track-delete-icon"
          title="删除轨道"
          style={{
            width: "24px",
            height: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "transparent",
            color: "#666",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            transition: "all 0.2s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#d32f2f";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#666";
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {/* Track Content Area */}
      <div
        className="track-content"
        style={{
          flex: 1,
          height: "100%",
          position: "relative",
          pointerEvents: "auto",
          minWidth: "100%",
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleTrackDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Empty Track Placeholder - Requirement 1.5 */}
        {isEmpty && (
          <div
            className="track-empty-placeholder"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "#555",
              fontSize: "12px",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            拖入素材
          </div>
        )}

        {/* Clips */}
        {clips.map((clip) => {
          const media = mediaById.get(clip.mediaId);
          const thumbnailUrl = thumbnailUrls[clip.mediaId];

          return (
            <div
              key={clip.id}
              className="clip-placeholder"
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData(
                  "application/json",
                  JSON.stringify({
                    dragType: "clip",
                    clipId: clip.id,
                    trackId: track.id,
                    startTime: clip.startTime,
                  }),
                );
                console.log("Start dragging clip:", clip.id);
              }}
              style={{
                position: "absolute",
                left: `${clip.startTime * zoomLevel}px`,
                width: `${clip.duration * zoomLevel}px`,
                height: "60px",
                top: "10px",
                backgroundColor: track.type === "video" ? "#1976d2" : "#388e3c",
                borderRadius: "4px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: "11px",
                overflow: "hidden",
                cursor: "move",
                userSelect: "none",
              }}
            >
              {media?.type === "video" && thumbnailUrl && (
                <img
                  src={thumbnailUrl}
                  alt={clip.mediaId}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: 0.35,
                    pointerEvents: "none",
                  }}
                />
              )}
              {media?.type === "audio" && <AudioWaveform mediaId={clip.mediaId} />}
              <span style={{ position: "relative", zIndex: 2 }}>{clip.mediaId}</span>
            </div>
          );
        })}
      </div>

      {/* Drag Over Indicator */}
      {isDragOver && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: "2px dashed #1976d2",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
};

export default Track;
