import { describe, it, expect, beforeEach } from 'vitest';
import { useTimelineStore } from '../../src/store/timelineStore';

describe('Timeline Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useTimelineStore.getState();
    store.tracks = [];
    store.clips = [];
    store.selectedClipIds = [];
    store.playheadPosition = 0;
  });

  describe('初始化状态', () => {
    it('should have empty tracks and clips on initialization', () => {
      const { tracks, clips } = useTimelineStore.getState();
      expect(tracks).toEqual([]);
      expect(clips).toEqual([]);
    });

    it('should have default playhead position at 0', () => {
      const { playheadPosition } = useTimelineStore.getState();
      expect(playheadPosition).toBe(0);
    });

    it('should have snap enabled by default', () => {
      const { snapEnabled } = useTimelineStore.getState();
      expect(snapEnabled).toBe(true);
    });

    it('should have default zoom level', () => {
      const { zoomLevel, config } = useTimelineStore.getState();
      expect(zoomLevel).toBe(config.pixelsPerSecond);
    });

    it('should have empty selection', () => {
      const { selectedClipIds } = useTimelineStore.getState();
      expect(selectedClipIds).toEqual([]);
    });
  });

  describe('添加轨道功能', () => {
    it('should add a video track', () => {
      const { addTrack, tracks } = useTimelineStore.getState();
      
      addTrack('video');
      
      const updatedTracks = useTimelineStore.getState().tracks;
      expect(updatedTracks).toHaveLength(1);
      expect(updatedTracks[0].type).toBe('video');
      expect(updatedTracks[0].name).toBe('视频 1');
    });

    it('should add an audio track', () => {
      const { addTrack } = useTimelineStore.getState();
      
      addTrack('audio');
      
      const updatedTracks = useTimelineStore.getState().tracks;
      expect(updatedTracks).toHaveLength(1);
      expect(updatedTracks[0].type).toBe('audio');
      expect(updatedTracks[0].name).toBe('音频 1');
    });

    it('should add multiple tracks with incremental names', () => {
      const { addTrack } = useTimelineStore.getState();
      
      addTrack('video');
      addTrack('video');
      addTrack('audio');
      
      const updatedTracks = useTimelineStore.getState().tracks;
      expect(updatedTracks).toHaveLength(3);
      expect(updatedTracks[0].name).toBe('视频 1');
      expect(updatedTracks[1].name).toBe('视频 2');
      expect(updatedTracks[2].name).toBe('音频 1');
    });

    it('should assign unique IDs to tracks', () => {
      const { addTrack } = useTimelineStore.getState();
      
      addTrack('video');
      addTrack('video');
      
      const updatedTracks = useTimelineStore.getState().tracks;
      expect(updatedTracks[0].id).not.toBe(updatedTracks[1].id);
    });

    it('should set correct order for tracks', () => {
      const { addTrack } = useTimelineStore.getState();
      
      addTrack('video');
      addTrack('video');
      
      const updatedTracks = useTimelineStore.getState().tracks;
      expect(updatedTracks[0].order).toBe(1);
      expect(updatedTracks[1].order).toBe(2);
    });
  });

  describe('删除轨道功能', () => {
    it('should remove a track by ID', () => {
      const { addTrack, removeTrack } = useTimelineStore.getState();
      
      addTrack('video');
      const trackId = useTimelineStore.getState().tracks[0].id;
      
      removeTrack(trackId);
      
      const updatedTracks = useTimelineStore.getState().tracks;
      expect(updatedTracks).toHaveLength(0);
    });

    it('should remove all clips associated with the track', () => {
      const { addTrack, addClip, removeTrack } = useTimelineStore.getState();
      
      addTrack('video');
      const trackId = useTimelineStore.getState().tracks[0].id;
      
      addClip({
        trackId,
        mediaId: 'media-1',
        startTime: 0,
        duration: 5,
        trimStart: 0,
        trimEnd: 5,
      });
      
      addClip({
        trackId,
        mediaId: 'media-2',
        startTime: 5,
        duration: 3,
        trimStart: 0,
        trimEnd: 3,
      });
      
      expect(useTimelineStore.getState().clips).toHaveLength(2);
      
      removeTrack(trackId);
      
      const updatedClips = useTimelineStore.getState().clips;
      expect(updatedClips).toHaveLength(0);
    });

    it('should not affect other tracks when removing one', () => {
      const { addTrack, removeTrack } = useTimelineStore.getState();
      
      addTrack('video');
      addTrack('audio');
      const videoTrackId = useTimelineStore.getState().tracks[0].id;
      
      removeTrack(videoTrackId);
      
      const updatedTracks = useTimelineStore.getState().tracks;
      expect(updatedTracks).toHaveLength(1);
      expect(updatedTracks[0].type).toBe('audio');
    });
  });

  describe('添加片段功能', () => {
    it('should add a clip to a track', () => {
      const { addTrack, addClip } = useTimelineStore.getState();
      
      addTrack('video');
      const trackId = useTimelineStore.getState().tracks[0].id;
      
      addClip({
        trackId,
        mediaId: 'media-1',
        startTime: 0,
        duration: 5,
        trimStart: 0,
        trimEnd: 5,
      });
      
      const updatedClips = useTimelineStore.getState().clips;
      expect(updatedClips).toHaveLength(1);
      expect(updatedClips[0].trackId).toBe(trackId);
      expect(updatedClips[0].mediaId).toBe('media-1');
    });

    it('should assign unique IDs to clips', () => {
      const { addTrack, addClip } = useTimelineStore.getState();
      
      addTrack('video');
      const trackId = useTimelineStore.getState().tracks[0].id;
      
      addClip({
        trackId,
        mediaId: 'media-1',
        startTime: 0,
        duration: 5,
        trimStart: 0,
        trimEnd: 5,
      });
      
      addClip({
        trackId,
        mediaId: 'media-2',
        startTime: 5,
        duration: 3,
        trimStart: 0,
        trimEnd: 3,
      });
      
      const updatedClips = useTimelineStore.getState().clips;
      expect(updatedClips[0].id).not.toBe(updatedClips[1].id);
    });

    it('should preserve clip properties', () => {
      const { addTrack, addClip } = useTimelineStore.getState();
      
      addTrack('video');
      const trackId = useTimelineStore.getState().tracks[0].id;
      
      addClip({
        trackId,
        mediaId: 'media-1',
        startTime: 2.5,
        duration: 5.3,
        trimStart: 1.0,
        trimEnd: 6.3,
        thumbnailUrl: 'http://example.com/thumb.jpg',
      });
      
      const clip = useTimelineStore.getState().clips[0];
      expect(clip.startTime).toBe(2.5);
      expect(clip.duration).toBe(5.3);
      expect(clip.trimStart).toBe(1.0);
      expect(clip.trimEnd).toBe(6.3);
      expect(clip.thumbnailUrl).toBe('http://example.com/thumb.jpg');
    });
  });

  describe('删除片段功能', () => {
    it('should remove a single clip', () => {
      const { addTrack, addClip, removeClip } = useTimelineStore.getState();
      
      addTrack('video');
      const trackId = useTimelineStore.getState().tracks[0].id;
      
      addClip({
        trackId,
        mediaId: 'media-1',
        startTime: 0,
        duration: 5,
        trimStart: 0,
        trimEnd: 5,
      });
      
      const clipId = useTimelineStore.getState().clips[0].id;
      removeClip(clipId);
      
      const updatedClips = useTimelineStore.getState().clips;
      expect(updatedClips).toHaveLength(0);
    });

    it('should remove clip from selection when deleted', () => {
      const { addTrack, addClip, selectClip, removeClip } = useTimelineStore.getState();
      
      addTrack('video');
      const trackId = useTimelineStore.getState().tracks[0].id;
      
      addClip({
        trackId,
        mediaId: 'media-1',
        startTime: 0,
        duration: 5,
        trimStart: 0,
        trimEnd: 5,
      });
      
      const clipId = useTimelineStore.getState().clips[0].id;
      selectClip(clipId, false);
      
      expect(useTimelineStore.getState().selectedClipIds).toContain(clipId);
      
      removeClip(clipId);
      
      expect(useTimelineStore.getState().selectedClipIds).not.toContain(clipId);
    });

    it('should remove multiple clips', () => {
      const { addTrack, addClip, removeClips } = useTimelineStore.getState();
      
      addTrack('video');
      const trackId = useTimelineStore.getState().tracks[0].id;
      
      addClip({
        trackId,
        mediaId: 'media-1',
        startTime: 0,
        duration: 5,
        trimStart: 0,
        trimEnd: 5,
      });
      
      addClip({
        trackId,
        mediaId: 'media-2',
        startTime: 5,
        duration: 3,
        trimStart: 0,
        trimEnd: 3,
      });
      
      const clipIds = useTimelineStore.getState().clips.map(c => c.id);
      removeClips(clipIds);
      
      const updatedClips = useTimelineStore.getState().clips;
      expect(updatedClips).toHaveLength(0);
    });
  });

  describe('更新片段功能', () => {
    it('should update clip properties', () => {
      const { addTrack, addClip, updateClip } = useTimelineStore.getState();
      
      addTrack('video');
      const trackId = useTimelineStore.getState().tracks[0].id;
      
      addClip({
        trackId,
        mediaId: 'media-1',
        startTime: 0,
        duration: 5,
        trimStart: 0,
        trimEnd: 5,
      });
      
      const clipId = useTimelineStore.getState().clips[0].id;
      
      updateClip(clipId, {
        startTime: 2,
        duration: 3,
      });
      
      const updatedClip = useTimelineStore.getState().clips[0];
      expect(updatedClip.startTime).toBe(2);
      expect(updatedClip.duration).toBe(3);
      expect(updatedClip.mediaId).toBe('media-1'); // unchanged
    });
  });

  describe('选择器功能', () => {
    it('getClipsByTrack should return clips for a specific track', () => {
      const { addTrack, addClip, getClipsByTrack } = useTimelineStore.getState();
      
      addTrack('video');
      addTrack('audio');
      const videoTrackId = useTimelineStore.getState().tracks[0].id;
      const audioTrackId = useTimelineStore.getState().tracks[1].id;
      
      addClip({
        trackId: videoTrackId,
        mediaId: 'media-1',
        startTime: 0,
        duration: 5,
        trimStart: 0,
        trimEnd: 5,
      });
      
      addClip({
        trackId: audioTrackId,
        mediaId: 'media-2',
        startTime: 0,
        duration: 3,
        trimStart: 0,
        trimEnd: 3,
      });
      
      const videoClips = getClipsByTrack(videoTrackId);
      expect(videoClips).toHaveLength(1);
      expect(videoClips[0].mediaId).toBe('media-1');
    });

    it('getTotalDuration should return 0 for empty timeline', () => {
      const { getTotalDuration } = useTimelineStore.getState();
      expect(getTotalDuration()).toBe(0);
    });

    it('getTotalDuration should return the end time of the last clip', () => {
      const { addTrack, addClip, getTotalDuration } = useTimelineStore.getState();
      
      addTrack('video');
      const trackId = useTimelineStore.getState().tracks[0].id;
      
      addClip({
        trackId,
        mediaId: 'media-1',
        startTime: 0,
        duration: 5,
        trimStart: 0,
        trimEnd: 5,
      });
      
      addClip({
        trackId,
        mediaId: 'media-2',
        startTime: 10,
        duration: 3,
        trimStart: 0,
        trimEnd: 3,
      });
      
      expect(getTotalDuration()).toBe(13); // 10 + 3
    });

    it('getClipAtPosition should return clip at given time', () => {
      const { addTrack, addClip, getClipAtPosition } = useTimelineStore.getState();
      
      addTrack('video');
      const trackId = useTimelineStore.getState().tracks[0].id;
      
      addClip({
        trackId,
        mediaId: 'media-1',
        startTime: 5,
        duration: 5,
        trimStart: 0,
        trimEnd: 5,
      });
      
      const clip = getClipAtPosition(trackId, 7);
      expect(clip).not.toBeNull();
      expect(clip?.mediaId).toBe('media-1');
    });

    it('getClipAtPosition should return null if no clip at position', () => {
      const { addTrack, addClip, getClipAtPosition } = useTimelineStore.getState();
      
      addTrack('video');
      const trackId = useTimelineStore.getState().tracks[0].id;
      
      addClip({
        trackId,
        mediaId: 'media-1',
        startTime: 5,
        duration: 5,
        trimStart: 0,
        trimEnd: 5,
      });
      
      const clip = getClipAtPosition(trackId, 2);
      expect(clip).toBeNull();
    });
  });
});
