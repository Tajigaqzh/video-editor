import React from "react";
import { useTimelineStore } from "@/store/timelineStore";
import { formatTime } from "@/utils/timeline/timelineUtils";

interface TimelineToolbarProps {
  className?: string;
}

const TimelineToolbar: React.FC<TimelineToolbarProps> = ({ className = "" }) => {
  const {
    project,
    playheadPosition,
    zoomLevel,
    snapEnabled,
    config,
    setZoomLevel,
    toggleSnap,
    addTrack,
    splitClipsAtPlayhead,
  } = useTimelineStore();

  // Handle zoom in
  const handleZoomIn = () => {
    const newZoom = Math.min(config.maxZoom, zoomLevel + 10);
    setZoomLevel(newZoom);
  };

  // Handle zoom out
  const handleZoomOut = () => {
    const newZoom = Math.max(config.minZoom, zoomLevel - 10);
    setZoomLevel(newZoom);
  };

  // Handle add video track
  const handleAddVideoTrack = () => {
    addTrack("video");
  };

  // Handle add audio track
  const handleAddAudioTrack = () => {
    addTrack("audio");
  };

  const canSplitAtPlayhead = React.useMemo(() => {
    const epsilon = 1e-6;
    return project.tracks.some((track) => {
      if (track.locked) return false;
      return track.clips.some((clip) => {
        const clipStart = clip.startTime;
        const clipEnd = clip.startTime + clip.duration;
        return playheadPosition > clipStart + epsilon && playheadPosition < clipEnd - epsilon;
      });
    });
  }, [playheadPosition, project.tracks]);

  const handleSplitAtPlayhead = () => {
    splitClipsAtPlayhead();
  };

  return (
    <div
      className={`timeline-toolbar flex items-center gap-3 px-4 py-2 border-b border-gray-700 ${className}`}
      style={{
        height: "48px",
        backgroundColor: "#252525",
      }}
    >
      {/* Current Time Display */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">时间:</span>
        <span className="text-sm font-mono text-white">{formatTime(playheadPosition)}</span>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-600" />

      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">缩放:</span>
        <button
          onClick={handleZoomOut}
          disabled={zoomLevel <= config.minZoom}
          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed rounded transition-colors"
          title="缩小 (Zoom Out)"
        >
          −
        </button>
        <span className="text-xs text-gray-300 font-mono min-w-[60px] text-center">
          {zoomLevel} px/s
        </span>
        <button
          onClick={handleZoomIn}
          disabled={zoomLevel >= config.maxZoom}
          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed rounded transition-colors"
          title="放大 (Zoom In)"
        >
          +
        </button>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-600" />

      {/* Snap Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSnap}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            snapEnabled
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-gray-700 hover:bg-gray-600 text-gray-300"
          }`}
          title={snapEnabled ? "吸附已启用" : "吸附已禁用"}
        >
          {snapEnabled ? "🧲 吸附" : "吸附"}
        </button>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-600" />

      {/* Split Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSplitAtPlayhead}
          disabled={!canSplitAtPlayhead}
          aria-label="在红线位置拆分素材"
          className="w-8 h-8 bg-amber-700 hover:bg-amber-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors inline-flex items-center justify-center"
          title="在红线位置拆分素材"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="6" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <path d="M20 4 8.5 15.5" />
            <path d="m8.5 8.5 4 4" />
            <path d="M20 20 13 13" />
          </svg>
        </button>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-600" />

      {/* Add Track Buttons */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">添加轨道:</span>
        <button
          onClick={handleAddVideoTrack}
          className="px-3 py-1 text-xs bg-blue-700 hover:bg-blue-600 text-white rounded transition-colors"
          title="添加视频轨道"
        >
          + 视频
        </button>
        <button
          onClick={handleAddAudioTrack}
          className="px-3 py-1 text-xs bg-green-700 hover:bg-green-600 text-white rounded transition-colors"
          title="添加音频轨道"
        >
          + 音频
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Zoom Level Info */}
      <div className="text-xs text-gray-500">
        范围: {config.minZoom}-{config.maxZoom} px/s
      </div>
    </div>
  );
};

export default TimelineToolbar;
