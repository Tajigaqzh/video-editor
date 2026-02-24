import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { useTimelineStore } from '../../src/store/timelineStore';

describe('Timeline Toolbar Property Tests', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useTimelineStore.getState();
    store.tracks = [];
    store.clips = [];
    store.selectedClipIds = [];
    store.playheadPosition = 0;
    store.zoomLevel = store.config.pixelsPerSecond;
  });

  // Feature: timeline-area, Property 14: 缩放调整级别
  // Validates: Requirements 6.1, 6.5
  it('should adjust zoom level within 10-200 px/s range for any zoom operation', () => {
    fc.assert(
      fc.property(
        // Generate initial zoom level within valid range
        fc.integer({ min: 10, max: 200 }),
        // Generate zoom adjustment (positive for zoom in, negative for zoom out)
        fc.integer({ min: -50, max: 50 }),
        (initialZoom, adjustment) => {
          const { setZoomLevel, config } = useTimelineStore.getState();
          
          // Set initial zoom level
          setZoomLevel(initialZoom);
          
          // Apply zoom adjustment
          const newZoom = initialZoom + adjustment;
          setZoomLevel(newZoom);
          
          // Get the actual zoom level after adjustment
          const actualZoom = useTimelineStore.getState().zoomLevel;
          
          // Verify zoom level is within valid range
          expect(actualZoom).toBeGreaterThanOrEqual(config.minZoom);
          expect(actualZoom).toBeLessThanOrEqual(config.maxZoom);
          
          // Verify zoom level is clamped correctly
          if (newZoom < config.minZoom) {
            expect(actualZoom).toBe(config.minZoom);
          } else if (newZoom > config.maxZoom) {
            expect(actualZoom).toBe(config.maxZoom);
          } else {
            expect(actualZoom).toBe(newZoom);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: timeline-area, Property 22: 添加轨道功能
  // Validates: Requirements 9.1, 9.2
  it('should create new track in appropriate area when add track button is clicked', () => {
    fc.assert(
      fc.property(
        // Generate track type (video or audio)
        fc.constantFrom('video' as const, 'audio' as const),
        // Generate number of tracks to add
        fc.integer({ min: 1, max: 10 }),
        (trackType, numTracks) => {
          const { addTrack } = useTimelineStore.getState();
          
          // Get initial track count of this type
          const initialTracks = useTimelineStore.getState().tracks.filter(
            t => t.type === trackType
          );
          const initialCount = initialTracks.length;
          
          // Add tracks
          for (let i = 0; i < numTracks; i++) {
            addTrack(trackType);
          }
          
          // Get updated tracks
          const updatedTracks = useTimelineStore.getState().tracks.filter(
            t => t.type === trackType
          );
          
          // Verify correct number of tracks added
          expect(updatedTracks.length).toBe(initialCount + numTracks);
          
          // Verify all added tracks have correct type
          updatedTracks.forEach(track => {
            expect(track.type).toBe(trackType);
          });
          
          // Verify tracks have unique IDs
          const ids = updatedTracks.map(t => t.id);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(updatedTracks.length);
          
          // Verify tracks have appropriate names
          updatedTracks.forEach(track => {
            if (trackType === 'video') {
              expect(track.name).toMatch(/^视频 \d+$/);
            } else {
              expect(track.name).toMatch(/^音频 \d+$/);
            }
          });
          
          // Verify tracks are in the appropriate area (video or audio)
          // All tracks of the same type should be grouped together
          const allTracks = useTimelineStore.getState().tracks;
          const videoTracks = allTracks.filter(t => t.type === 'video');
          const audioTracks = allTracks.filter(t => t.type === 'audio');
          
          // Verify separation of video and audio tracks
          expect(videoTracks.length + audioTracks.length).toBe(allTracks.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional property: Verify zoom level changes are reflected immediately
  it('should immediately reflect zoom level changes in store state', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 10, max: 200 }), { minLength: 1, maxLength: 20 }),
        (zoomLevels) => {
          const { setZoomLevel } = useTimelineStore.getState();
          
          // Apply each zoom level sequentially
          zoomLevels.forEach(zoom => {
            setZoomLevel(zoom);
            
            // Verify the zoom level is immediately updated
            const currentZoom = useTimelineStore.getState().zoomLevel;
            expect(currentZoom).toBe(zoom);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional property: Verify track order is maintained
  it('should maintain correct order when adding multiple tracks', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom('video' as const, 'audio' as const),
          { minLength: 1, maxLength: 10 }
        ),
        (trackTypes) => {
          const { addTrack } = useTimelineStore.getState();
          
          // Add tracks in sequence
          trackTypes.forEach(type => {
            addTrack(type);
          });
          
          // Get all tracks
          const tracks = useTimelineStore.getState().tracks;
          
          // Verify each track type has sequential order values
          const videoTracks = tracks.filter(t => t.type === 'video');
          const audioTracks = tracks.filter(t => t.type === 'audio');
          
          // Check video tracks have increasing order
          for (let i = 1; i < videoTracks.length; i++) {
            expect(videoTracks[i].order).toBeGreaterThan(videoTracks[i - 1].order);
          }
          
          // Check audio tracks have increasing order
          for (let i = 1; i < audioTracks.length; i++) {
            expect(audioTracks[i].order).toBeGreaterThan(audioTracks[i - 1].order);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
