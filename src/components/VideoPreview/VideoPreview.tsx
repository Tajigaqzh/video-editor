import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { useTimelineStore } from "@/store/timelineStore";

interface VideoPreviewProps {
  width?: number;
  height?: number;
}

const SYNC_TOLERANCE_SECONDS = 0.2;

const VideoPreview: React.FC<VideoPreviewProps> = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const playheadPositionRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceMediaId, setSourceMediaId] = useState<string | null>(null);

  const { project, playheadPosition, setPlayheadPosition } = useTimelineStore();

  useEffect(() => {
    playheadPositionRef.current = playheadPosition;
  }, [playheadPosition]);

  const allVideoClips = useMemo(
    () => project.tracks.filter((track) => track.type === "video").flatMap((track) => track.clips),
    [project.tracks],
  );

  const activeVideoClip = useMemo(
    () =>
      allVideoClips.find((clip) => {
        const clipEnd = clip.startTime + clip.duration;
        return playheadPosition >= clip.startTime && playheadPosition < clipEnd;
      }),
    [allVideoClips, playheadPosition],
  );

  const activeMedia = useMemo(
    () => project.media.find((media) => media.id === activeVideoClip?.mediaId),
    [project.media, activeVideoClip],
  );

  const getPreviewPath = useCallback((media: (typeof project.media)[number]): string => {
    if (
      media.proxyStatus === "ready" &&
      typeof media.proxyPath === "string" &&
      media.proxyPath.length > 0
    ) {
      return media.proxyPath;
    }
    if (typeof media.originalPath === "string" && media.originalPath.length > 0) {
      return media.originalPath;
    }
    return media.path;
  }, []);

  const resolvePlayableUrl = useCallback(async (path: string): Promise<string> => {
    const absolutePath = await invoke<string>("resolve_media_path", { path });
    return convertFileSrc(absolutePath);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSource = async () => {
      if (!activeMedia) {
        setSourceUrl(null);
        setSourceMediaId(null);
        return;
      }

      const previewPath = getPreviewPath(activeMedia);
      try {
        const url = await resolvePlayableUrl(previewPath);
        if (cancelled) return;
        setSourceUrl(url);
        setSourceMediaId(activeMedia.id);
      } catch (error) {
        console.error("Failed to resolve preview media path:", error);
        if (cancelled) return;
        setSourceUrl(null);
        setSourceMediaId(null);
      }
    };

    void loadSource();

    return () => {
      cancelled = true;
    };
  }, [activeMedia, getPreviewPath, resolvePlayableUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeVideoClip) {
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    const clipTime = Math.max(0, playheadPosition - activeVideoClip.startTime);
    setCurrentTime(clipTime);
    setDuration(activeVideoClip.duration);

    if (!sourceUrl) return;

    const shouldSeek = Math.abs(video.currentTime - clipTime) > SYNC_TOLERANCE_SECONDS;
    if (!isPlaying && shouldSeek) {
      video.currentTime = clipTime;
    }

    if (isPlaying && shouldSeek) {
      video.currentTime = clipTime;
    }
  }, [activeVideoClip, isPlaying, playheadPosition, sourceUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!activeVideoClip || !sourceUrl) {
      video.pause();
      return;
    }

    const clipTime = Math.max(0, playheadPositionRef.current - activeVideoClip.startTime);
    if (Math.abs(video.currentTime - clipTime) > SYNC_TOLERANCE_SECONDS) {
      video.currentTime = clipTime;
    }

    if (isPlaying) {
      void video.play().catch((error) => {
        console.warn("Video play() failed:", error);
        setIsPlaying(false);
      });
    } else {
      video.pause();
    }
  }, [activeVideoClip, isPlaying, sourceUrl, sourceMediaId]);

  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    let lastTime = performance.now();
    const maxEndTime =
      allVideoClips.length > 0
        ? Math.max(...allVideoClips.map((clip) => clip.startTime + clip.duration))
        : 0;

    if (maxEndTime <= 0) {
      setIsPlaying(false);
      return;
    }

    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const nextTime = playheadPositionRef.current + delta;
      if (nextTime >= maxEndTime) {
        setPlayheadPosition(maxEndTime);
        setIsPlaying(false);
        return;
      }

      setPlayheadPosition(nextTime);
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [allVideoClips, isPlaying, setPlayheadPosition]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        setIsPlaying((prev) => !prev);
        return;
      }

      if (event.code === "ArrowLeft") {
        event.preventDefault();
        if (!activeVideoClip) return;
        setPlayheadPosition(Math.max(activeVideoClip.startTime, playheadPositionRef.current - 1));
        return;
      }

      if (event.code === "ArrowRight") {
        event.preventDefault();
        if (!activeVideoClip) return;
        const maxTime = activeVideoClip.startTime + activeVideoClip.duration;
        setPlayheadPosition(Math.min(maxTime, playheadPositionRef.current + 1));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeVideoClip, setPlayheadPosition]);

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: "#141414" }}>
      <div
        className="flex-1 flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: "#000" }}
      >
        {sourceUrl ? (
          <video
            ref={videoRef}
            src={sourceUrl}
            className="max-h-full max-w-full"
            controls={false}
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={() => {
              if (!activeVideoClip || !videoRef.current) return;
              const clipTime = Math.max(0, playheadPositionRef.current - activeVideoClip.startTime);
              videoRef.current.currentTime = clipTime;
              if (isPlaying) {
                void videoRef.current.play().catch((error) => {
                  console.warn("Video play() failed after metadata loaded:", error);
                  setIsPlaying(false);
                });
              }
            }}
            onError={(event) => {
              console.error("Video element error:", event);
            }}
          />
        ) : (
          <div className="text-gray-500 text-sm">暂无可预览视频</div>
        )}
      </div>

      <div
        style={{
          height: "60px",
          backgroundColor: "#1a1a1a",
          borderTop: "1px solid #333",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingLeft: "20px",
          paddingRight: "20px",
          gap: "20px",
        }}
      >
        <button
          onClick={() => {
            if (!activeVideoClip) return;
            setPlayheadPosition(Math.max(activeVideoClip.startTime, playheadPosition - 1));
          }}
          style={{
            width: "40px",
            height: "40px",
            backgroundColor: "#333",
            border: "none",
            borderRadius: "4px",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(event) => (event.currentTarget.style.backgroundColor = "#444")}
          onMouseLeave={(event) => (event.currentTarget.style.backgroundColor = "#333")}
          title="上一秒 (←)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>

        <button
          onClick={() => setIsPlaying((prev) => !prev)}
          style={{
            width: "48px",
            height: "48px",
            backgroundColor: "#1976d2",
            border: "none",
            borderRadius: "50%",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(event) => (event.currentTarget.style.backgroundColor = "#1565c0")}
          onMouseLeave={(event) => (event.currentTarget.style.backgroundColor = "#1976d2")}
          title={isPlaying ? "暂停 (Space)" : "播放 (Space)"}
        >
          {!isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          )}
        </button>

        <button
          onClick={() => {
            if (!activeVideoClip) return;
            const maxTime = activeVideoClip.startTime + activeVideoClip.duration;
            setPlayheadPosition(Math.min(maxTime, playheadPosition + 1));
          }}
          style={{
            width: "40px",
            height: "40px",
            backgroundColor: "#333",
            border: "none",
            borderRadius: "4px",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(event) => (event.currentTarget.style.backgroundColor = "#444")}
          onMouseLeave={(event) => (event.currentTarget.style.backgroundColor = "#333")}
          title="下一秒 (→)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
        </button>

        <div
          style={{
            color: "#aaa",
            fontSize: "14px",
            fontFamily: "monospace",
            minWidth: "100px",
          }}
        >
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
};

export default VideoPreview;
