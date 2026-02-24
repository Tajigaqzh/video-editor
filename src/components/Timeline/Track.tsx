import React, { useState } from 'react';
import type { Track as TrackType, Clip } from '@/store/timelineStore';
import { useTimelineStore } from '@/store/timelineStore';

interface TrackProps {
  track: TrackType;
  clips: Clip[];
  zoomLevel: number;
  onDrop?: (e: React.DragEvent, trackId: string) => void;
}

const Track: React.FC<TrackProps> = ({ track, clips, zoomLevel, onDrop }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const removeTrack = useTimelineStore((state) => state.removeTrack);
  const getClipsByTrack = useTimelineStore((state) => state.getClipsByTrack);

  // Handle drag enter event
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Track dragEnter:', track.id, track.name);
    setIsDragOver(true);
  };

  // Handle drag over event
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    // console.log('Track dragOver:', track.id, track.name); // 注释掉避免刷屏
  };

  // Handle drag leave event
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Track dragLeave:', track.id);
    setIsDragOver(false);
  };

  // Handle drop event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    console.log('Track drop event triggered for track:', track.id);
    console.log('Drop clientX:', e.clientX, 'clientY:', e.clientY);
    
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
        `确定要删除轨道 "${track.name}" 及其包含的 ${trackClips.length} 个片段吗？`
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
        position: 'relative',
        backgroundColor: isDragOver ? '#2a2a2a' : '#1e1e1e',
        transition: 'background-color 0.2s',
        display: 'flex',
      }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Track Header - Fixed on left */}
      <div
        className="track-header"
        style={{
          width: '120px',
          height: '100%',
          backgroundColor: '#252525',
          borderRight: '1px solid #333',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          flexShrink: 0,
          position: 'sticky',
          left: 0,
          zIndex: 5,
        }}
      >
        {/* Track Name */}
        <div className="track-name flex-1">
          <div
            className="text-xs font-medium"
            style={{ color: '#ccc' }}
          >
            {track.name}
          </div>
          <div
            className="text-xs"
            style={{ color: '#666', marginTop: '2px' }}
          >
            {track.type === 'video' ? '视频' : '音频'}
          </div>
        </div>

        {/* Delete Icon Button */}
        <button
          onClick={handleDelete}
          className="track-delete-icon"
          title="删除轨道"
          style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            color: '#666',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#d32f2f';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#666';
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Track Content Area */}
      <div
        className="track-content"
        style={{
          flex: 1,
          height: '100%',
          position: 'relative',
          pointerEvents: 'auto',
          minWidth: '100%',
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Empty Track Placeholder - Requirement 1.5 */}
        {isEmpty && (
          <div
            className="track-empty-placeholder"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#555',
              fontSize: '12px',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            拖入素材
          </div>
        )}

        {/* Clips */}
        {clips.map((clip) => (
          <div
            key={clip.id}
            className="clip-placeholder"
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'clip',
                clipId: clip.id,
                trackId: track.id,
                startTime: clip.startTime,
              }));
              console.log('Start dragging clip:', clip.id);
            }}
            style={{
              position: 'absolute',
              left: `${clip.startTime * zoomLevel}px`,
              width: `${clip.duration * zoomLevel}px`,
              height: '60px',
              top: '10px',
              backgroundColor: track.type === 'video' ? '#1976d2' : '#388e3c',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '11px',
              overflow: 'hidden',
              cursor: 'move',
              userSelect: 'none',
            }}
          >
            {clip.mediaId}
          </div>
        ))}
      </div>

      {/* Drag Over Indicator */}
      {isDragOver && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: '2px dashed #1976d2',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
};

export default Track;
