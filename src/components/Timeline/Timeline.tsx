import React, { useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTimelineStore } from "@/store/timelineStore";
import { calculateSnapPosition, checkClipCollision } from "@/utils/timeline/timelineUtils";
import { enqueueProxyTranscode } from "@/services/proxyQueue";
import { enqueueWaveformGeneration } from "@/services/waveformQueue";
import { enqueueThumbnailGeneration } from "@/services/thumbnailQueue";
import { selectProxyProfileForMedia } from "@/utils/media/proxyProfile";
import TimelineToolbar from "./TimelineToolbar";
import Timescale from "./Timescale";
import Playhead from "./Playhead";
import Track from "./Track";

interface TimelineProps {
  className?: string;
  style?: React.CSSProperties;
}

const handleTimelineDrop = () => {
  console.log("Timeline container drop event");
};

const handleTimelineDragOver = (event: React.DragEvent) => {
  event.preventDefault();
  let dropEffect: DataTransfer["dropEffect"] = "copy";

  try {
    const raw = event.dataTransfer.getData("application/json");
    if (raw) {
      const data = JSON.parse(raw);
      if (data?.dragType === "clip") {
        dropEffect = "move";
      }
    }
  } catch {
    // ignore parse errors
  }

  event.dataTransfer.dropEffect = dropEffect;
};

export interface TimelineRef {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  addTrack: (type: "video" | "audio") => void;
  removeTrack: (trackId: string) => void;
}

const Timeline = React.forwardRef<TimelineRef, TimelineProps>(
  ({ className = "", style = {} }, ref) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const timelineBodyRef = useRef<HTMLDivElement>(null);
    const [scrollLeft, setScrollLeft] = useState(0);

    const {
      project,
      zoomLevel,
      addTrack,
      removeTrack,
      setPlayheadPosition,
      getTotalDuration,
      playheadPosition,
      snapEnabled,
      config,
    } = useTimelineStore();

    const tracks = project.tracks;
    const totalDuration = getTotalDuration();
    const displayDuration = Math.max(60, totalDuration);
    const viewportWidth = scrollContainerRef.current?.clientWidth ?? 0;
    const visibleStart = Math.max(0, scrollLeft / zoomLevel - 2);
    const visibleEnd = (scrollLeft + viewportWidth) / zoomLevel + 2;

    React.useEffect(() => {
      if (viewportWidth <= 0 || zoomLevel <= 0) return;
      const mediaById = new Map(project.media.map((media) => [media.id, media]));

      for (const track of tracks) {
        if (track.type !== "video") continue;

        for (const clip of track.clips) {
          const clipEnd = clip.startTime + clip.duration;
          if (clipEnd < visibleStart || clip.startTime > visibleEnd) {
            continue;
          }

          const media = mediaById.get(clip.mediaId);
          if (!media || media.type !== "video" || !media.originalPath) {
            continue;
          }

          if (media.thumbnailStatus === "none" || media.thumbnailStatus === "failed") {
            enqueueThumbnailGeneration(media.id, media.originalPath, {
              mode: "first_screen",
              priority: 20,
            });
          }
        }
      }
    }, [project.media, tracks, viewportWidth, visibleEnd, visibleStart, zoomLevel]);

    React.useImperativeHandle(ref, () => ({
      play: () => {
        console.log("Play");
      },
      pause: () => {
        console.log("Pause");
      },
      seek: (time: number) => {
        setPlayheadPosition(time);
      },
      addTrack: (type: "video" | "audio") => {
        addTrack(type);
      },
      removeTrack: (trackId: string) => {
        removeTrack(trackId);
      },
    }));

    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
      setScrollLeft(event.currentTarget.scrollLeft);
    };

    const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
      if (!scrollContainerRef.current) return;
      if (event.shiftKey) {
        event.preventDefault();
        scrollContainerRef.current.scrollLeft += event.deltaY;
      }
    };

    const handleClipMove = (dragData: any, event: React.DragEvent, targetTrackId: string) => {
      const { clipId } = dragData;
      const allClips = project.tracks.flatMap((t) => t.clips);
      const movingClip = allClips.find((clip) => clip.id === clipId);
      if (!movingClip) return;

      const currentScrollLeft = scrollContainerRef.current?.scrollLeft || 0;
      const timelineRect = scrollContainerRef.current?.getBoundingClientRect();
      if (!timelineRect) return;

      const dropX = event.clientX - timelineRect.left + currentScrollLeft - 120;
      const baseTime = Math.max(0, dropX / zoomLevel);
      const effectiveSnapPx = Math.max(config.snapThreshold, 12);
      const snappedTime = calculateSnapPosition(
        baseTime,
        movingClip.id,
        targetTrackId,
        movingClip.duration,
        allClips,
        playheadPosition,
        snapEnabled,
        effectiveSnapPx,
        zoomLevel,
      );
      const newStartTime = Math.max(0, snappedTime);

      if (
        checkClipCollision(
          movingClip.id,
          targetTrackId,
          newStartTime,
          movingClip.duration,
          allClips,
        )
      ) {
        return;
      }

      const { updateClip } = useTimelineStore.getState();
      updateClip(clipId, {
        trackId: targetTrackId,
        startTime: newStartTime,
      });
    };

    const handleMediaDrop = async (mediaItem: any, event: React.DragEvent, trackId: string) => {
      if (mediaItem.type !== "video" && mediaItem.type !== "audio") return;

      const track = tracks.find((t) => t.id === trackId);
      if (!track) return;

      if (track.type !== mediaItem.type) {
        const mediaTypeLabel = mediaItem.type === "video" ? "视频" : "音频";
        alert(`${mediaTypeLabel} 文件只能拖放到 ${mediaTypeLabel} 轨道`);
        return;
      }

      const trackClips = track.clips;
      const lastEnd = trackClips.reduce(
        (maxEnd, clip) => Math.max(maxEnd, clip.startTime + clip.duration),
        0,
      );
      const dropTime = lastEnd;

      let duration = 5;
      const { addMedia, addClip } = useTimelineStore.getState();

      try {
        const videoInfo = await invoke<any>("get_video_info", {
          path: mediaItem.path,
        });
        duration = videoInfo.duration || 5;

        const existingMedia = project.media.find((m) => m.id === mediaItem.id);
        if (!existingMedia) {
          const proxyProfile = selectProxyProfileForMedia({
            width: videoInfo.width,
            height: videoInfo.height,
          });

          const newMedia = {
            id: mediaItem.id,
            name: mediaItem.name,
            type: mediaItem.type as any,
            path: mediaItem.path,
            originalPath: mediaItem.path,
            duration,
            width: videoInfo.width,
            height: videoInfo.height,
            fps: videoInfo.fps,
            codec: videoInfo.codec,
            fileSize: videoInfo.file_size || 0,
            createdAt: new Date().toISOString(),
            sampleRate: videoInfo.sample_rate,
            channels: videoInfo.channels,
            proxyStatus: "none" as const,
            proxyProfile,
            proxyUpdatedAt: new Date().toISOString(),
            waveformStatus: "none" as const,
            waveformUpdatedAt: new Date().toISOString(),
          };

          addMedia(newMedia);

          if (newMedia.type === "video" && newMedia.originalPath) {
            enqueueProxyTranscode(
              newMedia.id,
              newMedia.originalPath,
              newMedia.proxyProfile ?? "medium",
            );
            enqueueThumbnailGeneration(newMedia.id, newMedia.originalPath, {
              mode: "first_screen",
              priority: 12,
            });
          }

          if ((newMedia.type === "video" || newMedia.type === "audio") && newMedia.originalPath) {
            enqueueWaveformGeneration(newMedia.id, newMedia.originalPath);
          }
        }
      } catch (error) {
        console.warn("Failed to get video info:", error);
      }

      const newClip = {
        id: `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        trackId,
        mediaId: mediaItem.id,
        startTime: dropTime,
        duration,
        trimStart: 0,
        trimEnd: duration,
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        opacity: 1,
        effects: [],
      };

      addClip(newClip);

      if (track.type === "video") {
        try {
          await invoke<string>("stream_decode_frame", {
            path: mediaItem.path,
            timestamp: 0,
          });
        } catch (error) {
          console.error("Failed to extract first frame:", error);
        }
      }

      void event;
    };

    const handleTrackDrop = (event: React.DragEvent, trackId: string) => {
      event.preventDefault();
      event.stopPropagation();

      try {
        const data = event.dataTransfer.getData("application/json");
        if (!data) return;

        const dragData = JSON.parse(data);
        const dragType = dragData.dragType || "media";

        if (dragType === "clip") {
          handleClipMove(dragData, event, trackId);
        } else if (dragType === "media") {
          void handleMediaDrop(dragData, event, trackId);
        }
      } catch (error) {
        console.error("Error handling drop:", error);
      }
    };

    return (
      <div
        className={`timeline-container flex flex-col h-full ${className}`}
        style={{
          backgroundColor: "#1a1a1a",
          color: "#ffffff",
          ...style,
        }}
        onDragOver={handleTimelineDragOver}
        onDrop={handleTimelineDrop}
      >
        <TimelineToolbar />

        <div
          ref={scrollContainerRef}
          className="timeline-scroll-container flex-1 overflow-auto"
          onScroll={handleScroll}
          onWheel={handleWheel}
          style={{ position: "relative" }}
        >
          <div
            className="timeline-header border-b border-gray-700"
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              display: "flex",
            }}
          >
            <div
              style={{
                width: "120px",
                height: "40px",
                backgroundColor: "#252525",
                borderRight: "1px solid #333",
                flexShrink: 0,
                position: "sticky",
                left: 0,
                zIndex: 11,
              }}
            />
            <div style={{ flex: 1, minWidth: "100%" }}>
              <Timescale
                duration={displayDuration}
                zoomLevel={zoomLevel}
                scrollLeft={scrollLeft}
                onSeek={setPlayheadPosition}
              />
            </div>
          </div>

          <div
            ref={timelineBodyRef}
            className="timeline-body"
            style={{
              minHeight: "400px",
              position: "relative",
            }}
          >
            {tracks.length === 0 ? (
              <div
                className="flex items-center justify-center"
                style={{
                  height: "200px",
                  color: "#666",
                }}
              >
                <div className="text-center">
                  <p className="text-sm mb-2">时间轴为空</p>
                  <p className="text-xs">点击工具栏添加轨道</p>
                </div>
              </div>
            ) : (
              <div className="tracks-container">
                {tracks
                  .toSorted((a, b) => b.order - a.order)
                  .map((track) => (
                    <Track
                      key={track.id}
                      track={track}
                      clips={track.clips}
                      zoomLevel={zoomLevel}
                      visibleStart={visibleStart}
                      visibleEnd={visibleEnd}
                      onDrop={handleTrackDrop}
                    />
                  ))}
              </div>
            )}

            <Playhead scrollContainerRef={scrollContainerRef} timelineBodyRef={timelineBodyRef} />
          </div>
        </div>
      </div>
    );
  },
);

Timeline.displayName = "Timeline";

export default Timeline;
