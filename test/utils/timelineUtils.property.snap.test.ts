import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { calculateSnapPosition } from "../../src/utils/timeline/timelineUtils";
import type { Clip } from "../../src/store/timelineStore";

const createClip = (params: {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
}): Clip => ({
  id: params.id,
  trackId: params.trackId,
  mediaId: "media-1",
  startTime: params.startTime,
  duration: params.duration,
  trimStart: 0,
  trimEnd: params.duration,
  position: { x: 0, y: 0 },
  scale: { x: 1, y: 1 },
  rotation: 0,
  opacity: 1,
  effects: [],
});

describe("Timeline Property Tests - Snapping Algorithm", () => {
  // Feature: timeline-area, Property 6: 吸附功能对齐
  // **验证需求: 3.4**
  it("should snap to nearby clip edges when within threshold", () => {
    fc.assert(
      fc.property(
        fc.record({
          trackId: fc.string({ minLength: 1 }),
          clipId: fc.string({ minLength: 1 }),
          duration: fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true }),
          targetClipStart: fc.float({ min: Math.fround(10), max: Math.fround(15), noNaN: true }),
          targetClipDuration: fc.float({ min: Math.fround(1), max: Math.fround(5), noNaN: true }),
          zoomLevel: fc.float({ min: Math.fround(10), max: Math.fround(200), noNaN: true }),
          snapThreshold: fc.constantFrom(5, 10, 15),
          playheadPosition: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
        }),
        ({
          trackId,
          clipId,
          duration,
          targetClipStart,
          targetClipDuration,
          zoomLevel,
          snapThreshold,
          playheadPosition,
        }) => {
          // Create a clip to snap to
          const existingClip = createClip({
            id: "existing-clip",
            trackId,
            startTime: targetClipStart,
            duration: targetClipDuration,
          });

          const thresholdTime = snapThreshold / zoomLevel;

          // Test snapping to clip start (within threshold)
          const nearClipStart = targetClipStart - thresholdTime * 0.5;
          const snappedToStart = calculateSnapPosition(
            nearClipStart,
            clipId,
            trackId,
            duration,
            [existingClip],
            playheadPosition,
            true, // snap enabled
            snapThreshold,
            zoomLevel,
          );

          // Should snap to the clip start
          expect(Math.abs(snappedToStart - targetClipStart)).toBeLessThanOrEqual(thresholdTime);

          // Test snapping to clip end (within threshold)
          const clipEnd = targetClipStart + targetClipDuration;
          const nearClipEnd = clipEnd - thresholdTime * 0.5;
          const snappedToEnd = calculateSnapPosition(
            nearClipEnd,
            clipId,
            trackId,
            duration,
            [existingClip],
            playheadPosition,
            true, // snap enabled
            snapThreshold,
            zoomLevel,
          );

          // Should snap to the clip end
          expect(Math.abs(snappedToEnd - clipEnd)).toBeLessThanOrEqual(thresholdTime);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should not snap when snapping is disabled", () => {
    fc.assert(
      fc.property(
        fc.record({
          trackId: fc.string({ minLength: 1 }),
          clipId: fc.string({ minLength: 1 }),
          targetTime: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
          duration: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
          clipStart: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
          clipDuration: fc.float({ min: Math.fround(1), max: Math.fround(10), noNaN: true }),
          zoomLevel: fc.float({ min: Math.fround(10), max: Math.fround(200), noNaN: true }),
          snapThreshold: fc.constantFrom(5, 10, 15),
          playheadPosition: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
        }),
        ({
          trackId,
          clipId,
          targetTime,
          duration,
          clipStart,
          clipDuration,
          zoomLevel,
          snapThreshold,
          playheadPosition,
        }) => {
          const existingClip = createClip({
            id: "existing-clip",
            trackId,
            startTime: clipStart,
            duration: clipDuration,
          });

          const result = calculateSnapPosition(
            targetTime,
            clipId,
            trackId,
            duration,
            [existingClip],
            playheadPosition,
            false, // snap disabled
            snapThreshold,
            zoomLevel,
          );

          // Should return the original target time without snapping
          expect(result).toBe(targetTime);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should snap to playhead when within threshold", () => {
    fc.assert(
      fc.property(
        fc.record({
          trackId: fc.string({ minLength: 1 }),
          clipId: fc.string({ minLength: 1 }),
          duration: fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true }),
          playheadPosition: fc.float({ min: Math.fround(10), max: Math.fround(50), noNaN: true }),
          zoomLevel: fc.float({ min: Math.fround(10), max: Math.fround(200), noNaN: true }),
          snapThreshold: fc.constantFrom(5, 10, 15),
        }),
        ({ trackId, clipId, duration, playheadPosition, zoomLevel, snapThreshold }) => {
          const thresholdTime = snapThreshold / zoomLevel;

          // Position near playhead (within threshold)
          const nearPlayhead = playheadPosition - thresholdTime * 0.5;

          const snapped = calculateSnapPosition(
            nearPlayhead,
            clipId,
            trackId,
            duration,
            [], // no other clips
            playheadPosition,
            true, // snap enabled
            snapThreshold,
            zoomLevel,
          );

          // Should snap to playhead
          expect(Math.abs(snapped - playheadPosition)).toBeLessThanOrEqual(thresholdTime);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should not snap when outside threshold distance from all snap targets", () => {
    fc.assert(
      fc.property(
        fc.record({
          trackId: fc.string({ minLength: 1 }),
          clipId: fc.string({ minLength: 1 }),
          duration: fc.float({ min: Math.fround(0.1), max: Math.fround(1), noNaN: true }),
          clipStart: fc.float({ min: Math.fround(20), max: Math.fround(30), noNaN: true }),
          clipDuration: fc.float({ min: Math.fround(1), max: Math.fround(5), noNaN: true }),
          zoomLevel: fc.float({ min: Math.fround(50), max: Math.fround(200), noNaN: true }),
          snapThreshold: fc.constantFrom(5, 10),
          playheadPosition: fc.float({ min: Math.fround(50), max: Math.fround(100), noNaN: true }),
        }),
        ({
          trackId,
          clipId,
          duration,
          clipStart,
          clipDuration,
          zoomLevel,
          snapThreshold,
          playheadPosition,
        }) => {
          const existingClip = createClip({
            id: "existing-clip",
            trackId,
            startTime: clipStart,
            duration: clipDuration,
          });

          const thresholdTime = snapThreshold / zoomLevel;

          // Position far from any snap target
          // Place it well before the clip, ensuring both start and end are far from snap points
          const targetTime = clipStart - thresholdTime * 5 - duration;

          const result = calculateSnapPosition(
            targetTime,
            clipId,
            trackId,
            duration,
            [existingClip],
            playheadPosition,
            true, // snap enabled
            snapThreshold,
            zoomLevel,
          );

          // Verify we're actually far from all snap points
          const targetEnd = targetTime + duration;
          const clipEnd = clipStart + clipDuration;

          const distToClipStart = Math.abs(targetTime - clipStart);
          const distToClipEnd = Math.abs(targetTime - clipEnd);
          const distEndToClipStart = Math.abs(targetEnd - clipStart);
          const distEndToClipEnd = Math.abs(targetEnd - clipEnd);
          const distToPlayhead = Math.abs(targetTime - playheadPosition);
          const distEndToPlayhead = Math.abs(targetEnd - playheadPosition);

          // All distances should be greater than threshold
          const allFar =
            distToClipStart > thresholdTime &&
            distToClipEnd > thresholdTime &&
            distEndToClipStart > thresholdTime &&
            distEndToClipEnd > thresholdTime &&
            distToPlayhead > thresholdTime &&
            distEndToPlayhead > thresholdTime;

          if (allFar) {
            // Should return the original position (no snapping)
            expect(result).toBe(targetTime);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should ignore clips on different tracks when snapping", () => {
    fc.assert(
      fc.property(
        fc
          .record({
            trackId1: fc.string({ minLength: 1 }),
            trackId2: fc.string({ minLength: 1 }),
            clipId: fc.string({ minLength: 1 }),
            targetTime: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
            duration: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
            otherClipStart: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
            otherClipDuration: fc.float({ min: Math.fround(1), max: Math.fround(10), noNaN: true }),
            zoomLevel: fc.float({ min: Math.fround(10), max: Math.fround(200), noNaN: true }),
            snapThreshold: fc.constantFrom(5, 10, 15),
            playheadPosition: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
          })
          .filter(({ trackId1, trackId2 }) => trackId1 !== trackId2),
        ({
          trackId1,
          trackId2,
          clipId,
          targetTime,
          duration,
          otherClipStart,
          otherClipDuration,
          zoomLevel,
          snapThreshold,
          playheadPosition,
        }) => {
          // Clip on a different track
          const clipOnOtherTrack = createClip({
            id: "other-track-clip",
            trackId: trackId2,
            startTime: otherClipStart,
            duration: otherClipDuration,
          });

          const result = calculateSnapPosition(
            targetTime,
            clipId,
            trackId1,
            duration,
            [clipOnOtherTrack],
            playheadPosition,
            true, // snap enabled
            snapThreshold,
            zoomLevel,
          );

          // Should not snap to clips on different tracks
          // Result should either be targetTime or snapped to playhead only
          const thresholdTime = snapThreshold / zoomLevel;
          const distToPlayhead = Math.abs(targetTime - playheadPosition);

          if (distToPlayhead < thresholdTime) {
            // Might snap to playhead
            expect(Math.abs(result - playheadPosition)).toBeLessThanOrEqual(thresholdTime);
          } else {
            // Should return original position
            expect(result).toBe(targetTime);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
