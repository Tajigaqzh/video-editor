import React, { useRef, useState, useEffect } from 'react';
import { useTimelineStore } from '@/store/timelineStore';
import { formatTime } from '@/utils/timelineUtils';

interface PlayheadProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  timelineBodyRef: React.RefObject<HTMLDivElement | null>;
}

const Playhead: React.FC<PlayheadProps> = ({ scrollContainerRef, timelineBodyRef }) => {
  const { playheadPosition, zoomLevel, setPlayheadPosition } = useTimelineStore();
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const playheadRef = useRef<HTMLDivElement>(null);

  // Calculate playhead position in pixels (加上 120px 轨道头部偏移)
  const playheadX = playheadPosition * zoomLevel + 120;

  // Handle playhead drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setShowTooltip(true);
  };

  // Handle playhead dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!scrollContainerRef.current || !timelineBodyRef.current) return;

      // Calculate new position based on mouse position
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const bodyRect = timelineBodyRef.current.getBoundingClientRect();
      const mouseX = e.clientX - bodyRect.left + scrollLeft - 120; // 减去 120px 轨道头部偏移
      
      // Convert pixels to time
      const newTime = Math.max(0, mouseX / zoomLevel);
      setPlayheadPosition(newTime);

      // Auto-scroll to keep playhead visible (Requirement 5.5)
      autoScrollToPlayhead(mouseX + 120, scrollLeft); // 传递实际像素位置（包含偏移）
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setShowTooltip(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, zoomLevel, setPlayheadPosition, scrollContainerRef, timelineBodyRef]);

  // Auto-scroll to keep playhead visible (Requirement 5.5)
  const autoScrollToPlayhead = (playheadPixelX: number, currentScrollLeft: number) => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const viewportWidth = container.clientWidth;
    const scrollThreshold = 50; // Pixels from edge to trigger scroll

    // Check if playhead is near right edge
    if (playheadPixelX - currentScrollLeft > viewportWidth - scrollThreshold) {
      container.scrollLeft = playheadPixelX - viewportWidth + scrollThreshold;
    }
    // Check if playhead is near left edge
    else if (playheadPixelX - currentScrollLeft < scrollThreshold) {
      container.scrollLeft = Math.max(0, playheadPixelX - scrollThreshold);
    }
  };

  // Handle mouse enter/leave for tooltip
  const handleMouseEnter = () => {
    if (!isDragging) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      setShowTooltip(false);
    }
  };

  return (
    <>
      {/* Playhead line - Requirement 5.1: Red vertical line through all tracks */}
      <div
        ref={playheadRef}
        className="playhead-line"
        style={{
          position: 'absolute',
          left: `${playheadX}px`,
          top: 0,
          bottom: 0,
          width: '2px',
          backgroundColor: '#ff0000',
          zIndex: 5,
          cursor: isDragging ? 'grabbing' : 'grab',
          pointerEvents: 'auto',
        }}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Playhead handle (top triangle) */}
      <div
        style={{
          position: 'absolute',
          left: `${playheadX - 6}px`,
          top: 0,
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '8px solid #ff0000',
          zIndex: 6,
          cursor: isDragging ? 'grabbing' : 'grab',
          pointerEvents: 'auto',
        }}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Time tooltip - Requirement 5.4: Display current time */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            left: `${playheadX}px`,
            top: '12px',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: '#ffffff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 7,
            pointerEvents: 'none',
          }}
        >
          {formatTime(playheadPosition)}
        </div>
      )}
    </>
  );
};

export default Playhead;
