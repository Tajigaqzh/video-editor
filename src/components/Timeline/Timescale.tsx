import React from "react";
import { generateTimeMarks, pixelsToTime } from "@/utils/timeline/timelineUtils";

interface TimescaleProps {
  duration: number; // 总时长（秒）
  zoomLevel: number; // 缩放级别（px/s）
  scrollLeft: number; // 滚动位置
  onSeek: (time: number) => void;
}

const Timescale: React.FC<TimescaleProps> = ({ duration, zoomLevel, scrollLeft, onSeek }) => {
  // Generate time markers based on current zoom level
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
  const markers = generateTimeMarks(duration, zoomLevel, viewportWidth);

  // Handle click on timescale to position playhead
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left + scrollLeft;
    const time = pixelsToTime(clickX, zoomLevel);
    onSeek(time);
  };

  return (
    <div
      className="timescale"
      onClick={handleClick}
      style={{
        height: "40px",
        backgroundColor: "#2a2a2a",
        position: "relative",
        cursor: "pointer",
        userSelect: "none",
        minWidth: `${duration * zoomLevel}px`,
      }}
    >
      {/* Render time markers */}
      {markers.map((marker, index) => (
        <div
          key={index}
          className="time-marker"
          style={{
            position: "absolute",
            left: `${marker.position}px`,
            top: 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          {/* Tick mark */}
          <div
            style={{
              width: "1px",
              height: marker.isMajor ? "12px" : "8px",
              backgroundColor: marker.isMajor ? "#888" : "#555",
              marginBottom: "2px",
            }}
          />
          {/* Time label (only for major marks) */}
          {marker.isMajor && (
            <span
              style={{
                fontSize: "10px",
                color: "#aaa",
                whiteSpace: "nowrap",
              }}
            >
              {marker.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default Timescale;
