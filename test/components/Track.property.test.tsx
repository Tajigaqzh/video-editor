import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { useTimelineStore } from '../../src/store/timelineStore';
import type { TrackType } from '../../src/store/timelineStore';

describe('Track Property Tests', () => {
  const resetStore = () => {
    // Reset store state
    useTimelineStore.setState({
      tracks: [],
      clips: [],
      selectedClipIds: [],
      playheadPosition: 0,
      dragState: {
        isDragging: false,
        dragType: null,
        startX: 0,
        startTime: 0,
      },
    });
  };

  beforeEach(() => {
    resetStore();
  });

  // Feature: timeline-area, Property 23: 删除轨道及其片段
  // **验证需求: 9.3**
  it('should remove track and all its clips when track is deleted', () => {
    fc.assert(
      fc.property(
        fc.record({
          trackType: fc.constantFrom<TrackType>('video', 'audio'),
          clips: fc.array(
            fc.record({
              mediaId: fc.string({ minLength: 1 }),
              startTime: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
              duration: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
              trimStart: fc.float({ min: Math.fround(0), max: Math.fround(10), noNaN: true }),
              trimEnd: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
        }),
        ({ trackType, clips }) => {
          resetStore();
          const { addTrack, addClip, removeTrack, getClipsByTrack } = useTimelineStore.getState();
          
          // Add a track
          addTrack(trackType);
          const trackId = useTimelineStore.getState().tracks[0].id;
          
          // Add clips to the track
          clips.forEach(clipData => {
            addClip({
              trackId,
              mediaId: clipData.mediaId,
              startTime: clipData.startTime,
              duration: clipData.duration,
              trimStart: clipData.trimStart,
              trimEnd: clipData.trimEnd,
            });
          });
          
          // Verify clips were added
          const clipsBeforeDelete = getClipsByTrack(trackId);
          expect(clipsBeforeDelete).toHaveLength(clips.length);
          
          // Remove the track
          removeTrack(trackId);
          
          // Verify track is removed
          const tracksAfterDelete = useTimelineStore.getState().tracks;
          expect(tracksAfterDelete.find(t => t.id === trackId)).toBeUndefined();
          
          // Verify all clips associated with the track are removed
          const clipsAfterDelete = useTimelineStore.getState().clips.filter(
            c => c.trackId === trackId
          );
          expect(clipsAfterDelete).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: timeline-area, Property 24: 空轨道可删除
  // **验证需求: 9.5**
  it('should allow deletion of empty tracks', () => {
    fc.assert(
      fc.property(
        fc.record({
          trackType: fc.constantFrom<TrackType>('video', 'audio'),
          trackCount: fc.integer({ min: 1, max: 5 }),
        }),
        ({ trackType, trackCount }) => {
          resetStore();
          const { addTrack, removeTrack } = useTimelineStore.getState();
          
          // Add multiple tracks
          const trackIds: string[] = [];
          for (let i = 0; i < trackCount; i++) {
            addTrack(trackType);
            const tracks = useTimelineStore.getState().tracks;
            trackIds.push(tracks[tracks.length - 1].id);
          }
          
          // Verify tracks were added
          expect(useTimelineStore.getState().tracks).toHaveLength(trackCount);
          
          // Remove each empty track
          trackIds.forEach(trackId => {
            const tracksBefore = useTimelineStore.getState().tracks.length;
            removeTrack(trackId);
            const tracksAfter = useTimelineStore.getState().tracks.length;
            
            // Verify track was removed
            expect(tracksAfter).toBe(tracksBefore - 1);
            expect(useTimelineStore.getState().tracks.find(t => t.id === trackId)).toBeUndefined();
          });
          
          // Verify all tracks are removed
          expect(useTimelineStore.getState().tracks).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not affect other tracks when deleting one track', () => {
    fc.assert(
      fc.property(
        fc.record({
          trackTypes: fc.array(
            fc.constantFrom<TrackType>('video', 'audio'),
            { minLength: 2, maxLength: 5 }
          ),
          deleteIndex: fc.nat(),
        }),
        ({ trackTypes, deleteIndex }) => {
          resetStore();
          const { addTrack, removeTrack } = useTimelineStore.getState();
          
          // Add multiple tracks
          const trackIds: string[] = [];
          trackTypes.forEach(type => {
            addTrack(type);
            const tracks = useTimelineStore.getState().tracks;
            trackIds.push(tracks[tracks.length - 1].id);
          });
          
          // Select a track to delete
          const indexToDelete = deleteIndex % trackIds.length;
          const trackIdToDelete = trackIds[indexToDelete];
          
          // Store other track IDs
          const otherTrackIds = trackIds.filter((_, i) => i !== indexToDelete);
          
          // Remove the selected track
          removeTrack(trackIdToDelete);
          
          // Verify the deleted track is gone
          const remainingTracks = useTimelineStore.getState().tracks;
          expect(remainingTracks.find(t => t.id === trackIdToDelete)).toBeUndefined();
          
          // Verify other tracks still exist
          otherTrackIds.forEach(trackId => {
            expect(remainingTracks.find(t => t.id === trackId)).toBeDefined();
          });
          
          // Verify correct number of tracks remain
          expect(remainingTracks).toHaveLength(trackTypes.length - 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should only remove clips from the deleted track, not from other tracks', () => {
    fc.assert(
      fc.property(
        fc.record({
          track1Clips: fc.array(
            fc.record({
              mediaId: fc.string({ minLength: 1 }),
              startTime: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
              duration: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          track2Clips: fc.array(
            fc.record({
              mediaId: fc.string({ minLength: 1 }),
              startTime: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
              duration: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
        }),
        ({ track1Clips, track2Clips }) => {
          resetStore();
          const { addTrack, addClip, removeTrack, getClipsByTrack } = useTimelineStore.getState();
          
          // Add two tracks
          addTrack('video');
          addTrack('audio');
          const tracks = useTimelineStore.getState().tracks;
          const track1Id = tracks[0].id;
          const track2Id = tracks[1].id;
          
          // Add clips to track 1
          track1Clips.forEach(clipData => {
            addClip({
              trackId: track1Id,
              mediaId: clipData.mediaId,
              startTime: clipData.startTime,
              duration: clipData.duration,
              trimStart: 0,
              trimEnd: clipData.duration,
            });
          });
          
          // Add clips to track 2
          track2Clips.forEach(clipData => {
            addClip({
              trackId: track2Id,
              mediaId: clipData.mediaId,
              startTime: clipData.startTime,
              duration: clipData.duration,
              trimStart: 0,
              trimEnd: clipData.duration,
            });
          });
          
          // Verify clips were added
          expect(getClipsByTrack(track1Id)).toHaveLength(track1Clips.length);
          expect(getClipsByTrack(track2Id)).toHaveLength(track2Clips.length);
          
          // Remove track 1
          removeTrack(track1Id);
          
          // Verify track 1 clips are removed
          expect(getClipsByTrack(track1Id)).toHaveLength(0);
          
          // Verify track 2 clips are still present
          expect(getClipsByTrack(track2Id)).toHaveLength(track2Clips.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
