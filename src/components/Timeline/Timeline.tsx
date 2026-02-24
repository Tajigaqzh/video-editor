import React, { useRef, useState } from 'react';
import { useTimelineStore } from '@/store/timelineStore';
import TimelineToolbar from './TimelineToolbar';
import Timescale from './Timescale';
import Playhead from './Playhead';
import Track from './Track';

interface TimelineProps {
  className?: string;
  style?: React.CSSProperties;
}

export interface TimelineRef {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  addTrack: (type: 'video' | 'audio') => void;
  removeTrack: (trackId: string) => void;
}

const Timeline = React.forwardRef<TimelineRef, TimelineProps>(
  ({ className = '', style = {} }, ref) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const timelineBodyRef = useRef<HTMLDivElement>(null);
    const [scrollLeft, setScrollLeft] = useState(0);
    
    // Connect to timeline store
    const {
      tracks,
      clips,
      zoomLevel,
      addTrack,
      removeTrack,
      setPlayheadPosition,
      getTotalDuration,
      getClipsByTrack,
    } = useTimelineStore();

    // Calculate total duration for timeline
    const totalDuration = getTotalDuration();
    // Display duration - minimum 60 seconds as per requirement 1.3
    const displayDuration = Math.max(60, totalDuration);

    // Expose methods via ref
    React.useImperativeHandle(ref, () => ({
      play: () => {
        // TODO: Implement play functionality
        console.log('Play');
      },
      pause: () => {
        // TODO: Implement pause functionality
        console.log('Pause');
      },
      seek: (time: number) => {
        setPlayheadPosition(time);
      },
      addTrack: (type: 'video' | 'audio') => {
        addTrack(type);
      },
      removeTrack: (trackId: string) => {
        removeTrack(trackId);
      },
    }));

    // Handle scroll events
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      // Store scroll position for timescale
      // This enables requirements 8.1, 8.2 (scroll functionality)
      const target = e.currentTarget;
      setScrollLeft(target.scrollLeft);
    };

    // Handle wheel events for scrolling
    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
      if (!scrollContainerRef.current) return;

      // Requirement 8.4: Vertical scroll with mouse wheel (no modifier)
      // Requirement 8.5: Horizontal scroll with Shift + wheel
      if (e.shiftKey) {
        // Horizontal scroll
        e.preventDefault();
        scrollContainerRef.current.scrollLeft += e.deltaY;
      }
      // Vertical scroll is handled by default browser behavior
    };

    // Handle drop from media library
    const handleTrackDrop = (e: React.DragEvent, trackId: string) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('handleTrackDrop called for track:', trackId);
      
      try {
        const data = e.dataTransfer.getData("application/json");
        console.log('Drop data:', data);
        
        if (!data) {
          console.warn('No data in drop event');
          return;
        }
        
        const dragData = JSON.parse(data);
        console.log('Parsed drag data:', dragData);
        
        // 检查是拖动片段还是从素材库拖入新素材
        if (dragData.type === 'clip') {
          // 拖动现有片段
          handleClipMove(dragData, e, trackId);
        } else {
          // 从素材库拖入新素材
          handleMediaDrop(dragData, e, trackId);
        }
      } catch (error) {
        console.error('❌ Error handling drop:', error);
      }
    };

    // 处理片段移动
    const handleClipMove = (dragData: any, e: React.DragEvent, targetTrackId: string) => {
      const { clipId, trackId: sourceTrackId } = dragData;
      
      // 计算新的开始时间
      const scrollLeft = scrollContainerRef.current?.scrollLeft || 0;
      const timelineRect = scrollContainerRef.current?.getBoundingClientRect();
      
      if (!timelineRect) {
        console.warn('Timeline scroll container rect not found');
        return;
      }
      
      const dropX = e.clientX - timelineRect.left + scrollLeft - 120;
      const newStartTime = Math.max(0, dropX / zoomLevel);
      
      console.log('Moving clip:', clipId, 'to time:', newStartTime);
      
      // 更新片段位置
      const { updateClip } = useTimelineStore.getState();
      updateClip(clipId, {
        trackId: targetTrackId,
        startTime: newStartTime,
      });
    };

    // 处理从素材库拖入新素材
    const handleMediaDrop = (mediaItem: any, e: React.DragEvent, trackId: string) => {
      // 只处理视频和音频文件
      if (mediaItem.type !== 'video' && mediaItem.type !== 'audio') {
        console.warn('只支持视频和音频文件，当前类型:', mediaItem.type);
        return;
      }
      
      // 检查轨道类型是否匹配
      const track = tracks.find(t => t.id === trackId);
      if (!track) {
        console.warn('Track not found:', trackId);
        return;
      }
      
      console.log('Track type:', track.type, 'Media type:', mediaItem.type);
      
      if (track.type !== mediaItem.type) {
        alert(`${mediaItem.type === 'video' ? '视频' : '音频'}文件只能拖放到${mediaItem.type === 'video' ? '视频' : '音频'}轨道`);
        return;
      }
      
      // 计算拖放位置对应的时间
      // 如果轨道是空的，自动放在 00:00 位置
      const trackClips = clips.filter(c => c.trackId === trackId);
      let dropTime = 0;
      
      if (trackClips.length > 0) {
        // 轨道已有片段，根据鼠标位置计算时间
        const scrollLeft = scrollContainerRef.current?.scrollLeft || 0;
        const timelineRect = scrollContainerRef.current?.getBoundingClientRect();
        
        if (!timelineRect) {
          console.warn('Timeline scroll container rect not found');
          return;
        }
        
        // 计算鼠标相对于时间轴内容区域的位置
        // 120px 是轨道头部的宽度
        const dropX = e.clientX - timelineRect.left + scrollLeft - 120;
        dropTime = Math.max(0, dropX / zoomLevel);
        
        console.log('Drop calculation:', {
          clientX: e.clientX,
          timelineLeft: timelineRect.left,
          scrollLeft,
          dropX,
          dropTime,
          zoomLevel
        });
      } else {
        console.log('Empty track, placing clip at 00:00');
      }
      
      // 创建新的片段
      const { addClip } = useTimelineStore.getState();
      addClip({
        trackId,
        mediaId: mediaItem.name,
        startTime: dropTime,
        duration: 5, // 默认5秒，实际应该从视频元数据获取
        trimStart: 0,
        trimEnd: 5,
        thumbnailUrl: mediaItem.url,
        filePath: mediaItem.path, // 保存原始文件路径
      });
      
      console.log('✅ Clip added successfully:', mediaItem.name, 'at', dropTime, 'path:', mediaItem.path);
    };

    // Handle drop on timeline container (fallback)
    const handleTimelineDrop = (e: React.DragEvent) => {
      console.log('Timeline container drop event');
      // Let it bubble to track handlers
    };

    const handleTimelineDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      // console.log('Timeline dragOver'); // 避免刷屏
    };

    return (
      <div
        className={`timeline-container flex flex-col h-full ${className}`}
        style={{
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          ...style,
        }}
        onDragOver={handleTimelineDragOver}
        onDrop={handleTimelineDrop}
      >
        {/* Toolbar Area */}
        <TimelineToolbar />

        {/* Scrollable Content Area */}
        <div
          ref={scrollContainerRef}
          className="timeline-scroll-container flex-1 overflow-auto"
          onScroll={handleScroll}
          onWheel={handleWheel}
          style={{
            position: 'relative',
          }}
        >
          {/* Timescale Area - Requirement 1.1, 5.2, 6.2, 6.3 */}
          <div
            className="timeline-header border-b border-gray-700"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              display: 'flex',
            }}
          >
            {/* Empty space for track headers */}
            <div
              style={{
                width: '120px',
                height: '40px',
                backgroundColor: '#252525',
                borderRight: '1px solid #333',
                flexShrink: 0,
                position: 'sticky',
                left: 0,
                zIndex: 11,
              }}
            />
            {/* Timescale */}
            <div style={{ flex: 1, minWidth: '100%' }}>
              <Timescale
                duration={displayDuration}
                zoomLevel={zoomLevel}
                scrollLeft={scrollLeft}
                onSeek={setPlayheadPosition}
              />
            </div>
          </div>

          {/* Tracks Area */}
          <div
            ref={timelineBodyRef}
            className="timeline-body"
            style={{
              minHeight: '400px',
              position: 'relative',
            }}
          >
            {/* Track List - Placeholder for task 8 */}
            {tracks.length === 0 ? (
              <div
                className="flex items-center justify-center"
                style={{
                  height: '200px',
                  color: '#666',
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
                  .sort((a, b) => b.order - a.order) // Higher order on top
                  .map((track) => (
                    <Track
                      key={track.id}
                      track={track}
                      clips={getClipsByTrack(track.id)}
                      zoomLevel={zoomLevel}
                      onDrop={handleTrackDrop}
                    />
                  ))}
              </div>
            )}

            {/* Playhead - Task 7: Playhead component */}
            <Playhead
              scrollContainerRef={scrollContainerRef}
              timelineBodyRef={timelineBodyRef}
            />
          </div>
        </div>
      </div>
    );
  }
);

Timeline.displayName = 'Timeline';

export default Timeline;
