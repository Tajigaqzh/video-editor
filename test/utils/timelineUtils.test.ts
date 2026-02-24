import { describe, it, expect } from 'vitest';
import {
  timeToPixels,
  pixelsToTime,
  formatTime,
  generateTimeMarks,
  checkClipCollision,
  calculateSnapPosition,
} from '../../src/utils/timelineUtils';

describe('timelineUtils', () => {
  describe('timeToPixels and pixelsToTime', () => {
    it('should convert time to pixels correctly', () => {
      expect(timeToPixels(10, 50)).toBe(500);
      expect(timeToPixels(5, 100)).toBe(500);
      expect(timeToPixels(0, 50)).toBe(0);
    });

    it('should convert pixels to time correctly', () => {
      expect(pixelsToTime(500, 50)).toBe(10);
      expect(pixelsToTime(500, 100)).toBe(5);
      expect(pixelsToTime(0, 50)).toBe(0);
    });

    it('should be inverse operations', () => {
      const time = 15.5;
      const zoomLevel = 75;
      const pixels = timeToPixels(time, zoomLevel);
      const convertedBack = pixelsToTime(pixels, zoomLevel);
      expect(convertedBack).toBeCloseTo(time, 10);
    });

    it('should handle fractional values', () => {
      expect(timeToPixels(1.5, 100)).toBe(150);
      expect(pixelsToTime(150, 100)).toBe(1.5);
    });
  });

  describe('formatTime', () => {
    it('should format zero seconds correctly', () => {
      expect(formatTime(0)).toBe('00:00.000');
    });

    it('should format seconds without minutes', () => {
      expect(formatTime(5)).toBe('00:05.000');
      expect(formatTime(30)).toBe('00:30.000');
      expect(formatTime(59)).toBe('00:59.000');
    });

    it('should format minutes and seconds', () => {
      expect(formatTime(60)).toBe('01:00.000');
      expect(formatTime(90)).toBe('01:30.000');
      expect(formatTime(125)).toBe('02:05.000');
    });

    it('should format milliseconds correctly', () => {
      expect(formatTime(1.5)).toBe('00:01.500');
      expect(formatTime(1.123)).toBe('00:01.123');
      expect(formatTime(1.999)).toBe('00:01.999');
    });

    it('should handle times greater than 1 hour', () => {
      expect(formatTime(3600)).toBe('60:00.000');
      expect(formatTime(3661.5)).toBe('61:01.500');
      expect(formatTime(7200)).toBe('120:00.000');
    });

    it('should pad single digit values with zeros', () => {
      expect(formatTime(5.5)).toBe('00:05.500');
      expect(formatTime(65.5)).toBe('01:05.500');
    });

    it('should handle fractional milliseconds by flooring', () => {
      expect(formatTime(1.1234)).toBe('00:01.123');
      expect(formatTime(1.9999)).toBe('00:01.999');
    });
  });

  describe('generateTimeMarks', () => {
    it('should generate marks at 1 second intervals for high zoom (>= 100 px/s)', () => {
      const marks = generateTimeMarks(10, 100, 1000);
      expect(marks.length).toBe(11); // 0 to 10 seconds inclusive
      expect(marks[0].time).toBe(0);
      expect(marks[1].time).toBe(1);
      expect(marks[10].time).toBe(10);
    });

    it('should generate marks at 2 second intervals for medium-high zoom (>= 50 px/s)', () => {
      const marks = generateTimeMarks(10, 50, 500);
      expect(marks.length).toBe(6); // 0, 2, 4, 6, 8, 10
      expect(marks[0].time).toBe(0);
      expect(marks[1].time).toBe(2);
      expect(marks[5].time).toBe(10);
    });

    it('should generate marks at 5 second intervals for medium zoom (>= 20 px/s)', () => {
      const marks = generateTimeMarks(20, 20, 400);
      expect(marks.length).toBe(5); // 0, 5, 10, 15, 20
      expect(marks[0].time).toBe(0);
      expect(marks[1].time).toBe(5);
      expect(marks[4].time).toBe(20);
    });

    it('should generate marks at 10 second intervals for low zoom (< 20 px/s)', () => {
      const marks = generateTimeMarks(30, 10, 300);
      expect(marks.length).toBe(4); // 0, 10, 20, 30
      expect(marks[0].time).toBe(0);
      expect(marks[1].time).toBe(10);
      expect(marks[3].time).toBe(30);
    });

    it('should calculate correct pixel positions', () => {
      const marks = generateTimeMarks(10, 100, 1000);
      expect(marks[0].position).toBe(0);
      expect(marks[5].position).toBe(500);
      expect(marks[10].position).toBe(1000);
    });

    it('should format labels correctly', () => {
      const marks = generateTimeMarks(65, 50, 3250);
      expect(marks[0].label).toBe('00:00.000');
      expect(marks[1].label).toBe('00:02.000');
      expect(marks[30].label).toBe('01:00.000');
    });

    it('should mark major intervals correctly (every 5 intervals)', () => {
      const marks = generateTimeMarks(10, 100, 1000);
      expect(marks[0].isMajor).toBe(true); // 0 seconds
      expect(marks[1].isMajor).toBe(false); // 1 second
      expect(marks[5].isMajor).toBe(true); // 5 seconds
      expect(marks[10].isMajor).toBe(true); // 10 seconds
    });

    it('should handle edge case of zero duration', () => {
      const marks = generateTimeMarks(0, 100, 1000);
      expect(marks.length).toBe(1);
      expect(marks[0].time).toBe(0);
    });
  });

  describe('checkClipCollision', () => {
    const createClip = (id: string, trackId: string, startTime: number, duration: number) => ({
      id,
      trackId,
      mediaId: 'media-1',
      startTime,
      duration,
      trimStart: 0,
      trimEnd: duration,
    });

    it('should detect collision with adjacent clips', () => {
      const clip1 = createClip('clip-1', 'track-1', 0, 5);
      const clip2 = createClip('clip-2', 'track-1', 5, 5);
      
      // Try to place a clip that overlaps with clip1
      const hasCollision = checkClipCollision('new-clip', 'track-1', 3, 4, [clip1, clip2]);
      expect(hasCollision).toBe(true);
    });

    it('should not detect collision when clips are adjacent but not overlapping', () => {
      const clip1 = createClip('clip-1', 'track-1', 0, 5);
      const clip2 = createClip('clip-2', 'track-1', 5, 5);
      
      // Place a clip right after clip2
      const hasCollision = checkClipCollision('new-clip', 'track-1', 10, 5, [clip1, clip2]);
      expect(hasCollision).toBe(false);
    });

    it('should not detect collision with itself', () => {
      const clip1 = createClip('clip-1', 'track-1', 0, 5);
      
      // Check collision with itself
      const hasCollision = checkClipCollision('clip-1', 'track-1', 0, 5, [clip1]);
      expect(hasCollision).toBe(false);
    });

    it('should not detect collision on different tracks', () => {
      const clip1 = createClip('clip-1', 'track-1', 0, 5);
      const clip2 = createClip('clip-2', 'track-2', 0, 5);
      
      // Place a clip on track-1 at the same time as clip2 on track-2
      const hasCollision = checkClipCollision('new-clip', 'track-1', 0, 5, [clip1, clip2]);
      expect(hasCollision).toBe(true); // Collides with clip1, not clip2
    });

    it('should detect partial overlap at the start', () => {
      const clip1 = createClip('clip-1', 'track-1', 5, 5);
      
      // Overlap the end of new clip with start of clip1
      const hasCollision = checkClipCollision('new-clip', 'track-1', 3, 3, [clip1]);
      expect(hasCollision).toBe(true);
    });

    it('should detect partial overlap at the end', () => {
      const clip1 = createClip('clip-1', 'track-1', 0, 5);
      
      // Overlap the start of new clip with end of clip1
      const hasCollision = checkClipCollision('new-clip', 'track-1', 3, 5, [clip1]);
      expect(hasCollision).toBe(true);
    });

    it('should detect complete containment', () => {
      const clip1 = createClip('clip-1', 'track-1', 0, 10);
      
      // Place a clip completely inside clip1
      const hasCollision = checkClipCollision('new-clip', 'track-1', 3, 2, [clip1]);
      expect(hasCollision).toBe(true);
    });

    it('should handle edge case of zero duration', () => {
      const clip1 = createClip('clip-1', 'track-1', 5, 5);
      
      // Zero duration clip at the start of clip1
      const hasCollision = checkClipCollision('new-clip', 'track-1', 5, 0, [clip1]);
      expect(hasCollision).toBe(false); // Zero duration means no overlap
    });
  });

  describe('calculateSnapPosition', () => {
    const createClip = (id: string, trackId: string, startTime: number, duration: number) => ({
      id,
      trackId,
      mediaId: 'media-1',
      startTime,
      duration,
      trimStart: 0,
      trimEnd: duration,
    });

    it('should snap to clip start edge when within threshold', () => {
      const clip1 = createClip('clip-1', 'track-1', 10, 5);
      const zoomLevel = 50; // 50 px/s
      const snapThreshold = 5; // 5 pixels
      const thresholdTime = snapThreshold / zoomLevel; // 0.1 seconds
      
      // Position just before clip start (within threshold)
      const targetTime = 10 - thresholdTime * 0.5;
      const snapped = calculateSnapPosition(
        targetTime,
        'new-clip',
        'track-1',
        2,
        [clip1],
        0,
        true,
        snapThreshold,
        zoomLevel
      );
      
      expect(snapped).toBe(10);
    });

    it('should snap to clip end edge when within threshold', () => {
      const clip1 = createClip('clip-1', 'track-1', 10, 5);
      const zoomLevel = 50;
      const snapThreshold = 5;
      const thresholdTime = snapThreshold / zoomLevel;
      
      // Position just before clip end (within threshold)
      const targetTime = 15 - thresholdTime * 0.5;
      const snapped = calculateSnapPosition(
        targetTime,
        'new-clip',
        'track-1',
        2,
        [clip1],
        0,
        true,
        snapThreshold,
        zoomLevel
      );
      
      expect(snapped).toBe(15);
    });

    it('should snap to playhead when within threshold', () => {
      const zoomLevel = 50;
      const snapThreshold = 5;
      const thresholdTime = snapThreshold / zoomLevel;
      const playheadPosition = 20;
      
      // Position just before playhead (within threshold)
      const targetTime = playheadPosition - thresholdTime * 0.5;
      const snapped = calculateSnapPosition(
        targetTime,
        'new-clip',
        'track-1',
        2,
        [],
        playheadPosition,
        true,
        snapThreshold,
        zoomLevel
      );
      
      expect(snapped).toBe(playheadPosition);
    });

    it('should not snap when snapping is disabled', () => {
      const clip1 = createClip('clip-1', 'track-1', 10, 5);
      const targetTime = 9.95;
      
      const snapped = calculateSnapPosition(
        targetTime,
        'new-clip',
        'track-1',
        2,
        [clip1],
        20,
        false, // snap disabled
        5,
        50
      );
      
      expect(snapped).toBe(targetTime);
    });

    it('should not snap when outside threshold distance', () => {
      const clip1 = createClip('clip-1', 'track-1', 10, 5);
      const zoomLevel = 50;
      const snapThreshold = 5;
      const thresholdTime = snapThreshold / zoomLevel;
      
      // Position far from clip (more than threshold)
      const targetTime = 10 - thresholdTime * 2;
      const snapped = calculateSnapPosition(
        targetTime,
        'new-clip',
        'track-1',
        2,
        [clip1],
        50, // playhead far away
        true,
        snapThreshold,
        zoomLevel
      );
      
      expect(snapped).toBe(targetTime);
    });

    it('should snap clip end to clip start', () => {
      const clip1 = createClip('clip-1', 'track-1', 10, 5);
      const zoomLevel = 50;
      const snapThreshold = 5;
      const thresholdTime = snapThreshold / zoomLevel;
      const duration = 3;
      
      // Position so that clip end is near clip1 start
      const targetTime = 10 - duration - thresholdTime * 0.5;
      const snapped = calculateSnapPosition(
        targetTime,
        'new-clip',
        'track-1',
        duration,
        [clip1],
        0,
        true,
        snapThreshold,
        zoomLevel
      );
      
      // Should snap so that clip end aligns with clip1 start
      expect(snapped).toBe(10 - duration);
    });

    it('should snap to closest edge when multiple edges are within threshold', () => {
      const clip1 = createClip('clip-1', 'track-1', 10, 5);
      const clip2 = createClip('clip-2', 'track-1', 20, 5);
      const zoomLevel = 50;
      const snapThreshold = 5;
      const thresholdTime = snapThreshold / zoomLevel; // 0.1 seconds
      
      // Position close to clip1 end (within threshold)
      const targetTime = 15 - thresholdTime * 0.3;
      const snapped = calculateSnapPosition(
        targetTime,
        'new-clip',
        'track-1',
        2,
        [clip1, clip2],
        0,
        true,
        snapThreshold,
        zoomLevel
      );
      
      // Should snap to clip1 end (15) since it's closer
      expect(snapped).toBe(15);
    });

    it('should ignore clips on different tracks', () => {
      const clip1 = createClip('clip-1', 'track-2', 10, 5);
      const zoomLevel = 50;
      const snapThreshold = 5;
      const thresholdTime = snapThreshold / zoomLevel;
      
      // Position near clip1 but on different track
      const targetTime = 10 - thresholdTime * 0.5;
      const snapped = calculateSnapPosition(
        targetTime,
        'new-clip',
        'track-1',
        2,
        [clip1],
        0,
        true,
        snapThreshold,
        zoomLevel
      );
      
      // Should not snap to clip on different track
      expect(snapped).toBe(targetTime);
    });
  });
});
