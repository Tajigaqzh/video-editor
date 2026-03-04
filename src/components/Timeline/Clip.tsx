import React from "react";
import type { Clip as ClipType, Track } from "@/store/timelineStore";
import { formatTime } from "@/utils/timeline/timelineUtils";

interface ClipProps {
  clip: ClipType;
  track: Track;
  zoomLevel: number;
  isSelected: boolean;
  onSelect?: (clipId: string, multi: boolean) => void;
}

const Clip: React.FC<ClipProps> = ({ clip, track, zoomLevel, isSelected, onSelect }) => {
  // Calculate clip width based on duration and zoom level (Requirement 6.6)
  const width = clip.duration * zoomLevel;

  // Determine if we should show duration text (Requirement 10.1, 10.6)
  const showDurationText = width > 60;

  // Determine clip color based on track type (Requirement 10.5)
  const backgroundColor = track.type === "video" ? "#1976d2" : "#388e3c";

  // Handle click for selection
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isMultiSelect = e.ctrlKey || e.metaKey;
    onSelect?.(clip.id, isMultiSelect);
  };

  return (
    <div
      className="clip"
      data-clip-id={clip.id}
      onClick={handleClick}
      style={{
        position: "absolute",
        left: `${clip.startTime * zoomLevel}px`,
        width: `${width}px`,
        height: "60px",
        top: "10px",
        backgroundColor,
        borderRadius: "4px",
        border: isSelected ? "2px solid #fff" : "1px solid rgba(255, 255, 255, 0.1)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: "11px",
        overflow: "hidden",
        cursor: "pointer",
        userSelect: "none",
        transition: "border 0.1s",
      }}
    >
      {/* Thumbnail (Requirement 2.5) */}
      {clip.thumbnailUrl && (
        <img
          src={clip.thumbnailUrl}
          alt={clip.mediaId}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.3,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Content overlay */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
          padding: "4px",
          textAlign: "center",
        }}
      >
        {/* Media name (Requirement 2.5) */}
        <div
          className="clip-name"
          style={{
            fontSize: "10px",
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
          }}
        >
          {clip.mediaId}
        </div>

        {/* Duration text - only show if width > 60px (Requirement 10.1, 10.6) */}
        {showDurationText && (
          <div
            className="clip-duration"
            style={{
              fontSize: "9px",
              opacity: 0.8,
            }}
          >
            {formatTime(clip.duration)}
          </div>
        )}
      </div>
    </div>
  );
};

export default Clip;
