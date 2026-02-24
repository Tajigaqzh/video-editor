import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { checkClipCollision } from '../../src/utils/timelineUtils';
import type { Clip } from '../../src/store/timelineStore';

describe('Timeline Property Tests - Collision Detection', () => {
  // Feature: timeline-area, Property 7: 片段无重叠约束
  // **验证需求: 3.6**
  it('should prevent clip overlap on the same track', () => {
    fc.assert(
      fc.property(
        fc.record({
          trackId: fc.string({ minLength: 1 }),
          clips: fc.array(
            fc.record({
              id: fc.string({ minLength: 1 }),
              startTime: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
              duration: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          newClip: fc.record({
            id: fc.string({ minLength: 1 }),
            startTime: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
            duration: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
          }),
        }),
        ({ trackId, clips, newClip }) => {
          // Create full clip objects with required properties
          const fullClips: Clip[] = clips.map((clip, index) => ({
            id: `clip-${index}`,
            trackId,
            mediaId: `media-${index}`,
            startTime: clip.startTime,
            duration: clip.duration,
            trimStart: 0,
            trimEnd: clip.duration,
          }));

          // Sort clips by start time to place them without overlap
          fullClips.sort((a, b) => a.startTime - b.startTime);
          
          // Adjust clips to ensure no overlap
          const nonOverlappingClips: Clip[] = [];
          for (const clip of fullClips) {
            if (nonOverlappingClips.length === 0) {
              nonOverlappingClips.push(clip);
            } else {
              const lastClip = nonOverlappingClips[nonOverlappingClips.length - 1];
              const lastClipEnd = lastClip.startTime + lastClip.duration;
              
              if (clip.startTime >= lastClipEnd) {
                // No overlap, add as is
                nonOverlappingClips.push(clip);
              } else {
                // Would overlap, adjust start time
                nonOverlappingClips.push({
                  ...clip,
                  startTime: lastClipEnd,
                });
              }
            }
          }

          // Now test collision detection with a new clip
          const newClipFull: Clip = {
            id: 'new-clip',
            trackId,
            mediaId: 'new-media',
            startTime: newClip.startTime,
            duration: newClip.duration,
            trimStart: 0,
            trimEnd: newClip.duration,
          };

          const hasCollision = checkClipCollision(
            newClipFull.id,
            trackId,
            newClipFull.startTime,
            newClipFull.duration,
            nonOverlappingClips
          );

          // Manually check if there should be a collision
          const newClipEnd = newClipFull.startTime + newClipFull.duration;
          const shouldCollide = nonOverlappingClips.some(clip => {
            const clipEnd = clip.startTime + clip.duration;
            return !(newClipEnd <= clip.startTime || newClipFull.startTime >= clipEnd);
          });

          // The collision detection should match our manual check
          expect(hasCollision).toBe(shouldCollide);

          // If no collision detected, verify clips don't actually overlap
          if (!hasCollision) {
            for (const clip of nonOverlappingClips) {
              const clipEnd = clip.startTime + clip.duration;
              const noOverlap = newClipEnd <= clip.startTime || newClipFull.startTime >= clipEnd;
              expect(noOverlap).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not detect collision with the clip itself', () => {
    fc.assert(
      fc.property(
        fc.record({
          trackId: fc.string({ minLength: 1 }),
          clipId: fc.string({ minLength: 1 }),
          startTime: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
          duration: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
        }),
        ({ trackId, clipId, startTime, duration }) => {
          const clip: Clip = {
            id: clipId,
            trackId,
            mediaId: 'media-1',
            startTime,
            duration,
            trimStart: 0,
            trimEnd: duration,
          };

          // Check collision with itself - should always be false
          const hasCollision = checkClipCollision(
            clipId,
            trackId,
            startTime,
            duration,
            [clip]
          );

          expect(hasCollision).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not detect collision on different tracks', () => {
    fc.assert(
      fc.property(
        fc.record({
          trackId1: fc.string({ minLength: 1 }),
          trackId2: fc.string({ minLength: 1 }),
          clipId: fc.string({ minLength: 1 }),
          startTime: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
          duration: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
        }).filter(({ trackId1, trackId2 }) => trackId1 !== trackId2),
        ({ trackId1, trackId2, clipId, startTime, duration }) => {
          const clipOnTrack2: Clip = {
            id: 'other-clip',
            trackId: trackId2,
            mediaId: 'media-1',
            startTime,
            duration,
            trimStart: 0,
            trimEnd: duration,
          };

          // Check collision on track1 with clip on track2 - should always be false
          const hasCollision = checkClipCollision(
            clipId,
            trackId1,
            startTime,
            duration,
            [clipOnTrack2]
          );

          expect(hasCollision).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
