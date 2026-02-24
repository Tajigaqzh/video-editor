import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatTime } from '../../src/utils/timelineUtils';

describe('Timeline Utils Property Tests', () => {
  // Feature: timeline-area, Property 12: 时间格式化一致性
  // Validates: Requirements 5.4, 10.2
  it('should format time consistently in MM:SS.mmm format for any valid time value', () => {
    fc.assert(
      fc.property(
        // Generate time values from 0 to 3600 seconds (1 hour)
        fc.float({ min: 0, max: 3600, noNaN: true }),
        (seconds) => {
          const formatted = formatTime(seconds);
          
          // Verify format matches MM:SS.mmm pattern
          const formatRegex = /^\d{2}:\d{2}\.\d{3}$/;
          expect(formatted).toMatch(formatRegex);
          
          // Parse the formatted string
          const parts = formatted.split(':');
          const minutes = parseInt(parts[0], 10);
          const secondsParts = parts[1].split('.');
          const secs = parseInt(secondsParts[0], 10);
          const ms = parseInt(secondsParts[1], 10);
          
          // Verify minutes are in valid range
          expect(minutes).toBeGreaterThanOrEqual(0);
          expect(minutes).toBeLessThanOrEqual(60);
          
          // Verify seconds are in valid range (0-59)
          expect(secs).toBeGreaterThanOrEqual(0);
          expect(secs).toBeLessThanOrEqual(59);
          
          // Verify milliseconds are in valid range (0-999)
          expect(ms).toBeGreaterThanOrEqual(0);
          expect(ms).toBeLessThanOrEqual(999);
          
          // Verify the formatted time represents approximately the same duration
          const reconstructedSeconds = minutes * 60 + secs + ms / 1000;
          expect(Math.abs(reconstructedSeconds - seconds)).toBeLessThan(0.001);
        }
      ),
      { numRuns: 100 }
    );
  });
});
