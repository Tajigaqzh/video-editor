import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";
import { render, fireEvent } from "@testing-library/react";
import Timescale from "../../src/components/Timeline/Timescale";
import { pixelsToTime, generateTimeMarks } from "../../src/utils/timeline/timelineUtils";

describe("Timescale Property Tests", () => {
  // Feature: timeline-area, Property 11: 播放头点击定位
  // Validates: Requirements 5.2
  it("should position playhead at clicked time position for any click location", () => {
    fc.assert(
      fc.property(
        // Generate duration, zoom level, and click position
        fc.record({
          duration: fc.float({ min: 10, max: 300, noNaN: true }),
          zoomLevel: fc.float({ min: 10, max: 200, noNaN: true }),
          clickX: fc.float({ min: 0, max: 1000, noNaN: true }),
          scrollLeft: fc.float({ min: 0, max: 500, noNaN: true }),
        }),
        ({ duration, zoomLevel, clickX, scrollLeft }) => {
          const onSeek = vi.fn();

          const { container } = render(
            <Timescale
              duration={duration}
              zoomLevel={zoomLevel}
              scrollLeft={scrollLeft}
              onSeek={onSeek}
            />,
          );

          const timescaleElement = container.querySelector(".timescale");
          expect(timescaleElement).toBeTruthy();

          if (timescaleElement) {
            // Mock getBoundingClientRect to return predictable values
            const mockRect = {
              left: 0,
              top: 0,
              right: 1000,
              bottom: 40,
              width: 1000,
              height: 40,
              x: 0,
              y: 0,
              toJSON: () => ({}),
            };

            vi.spyOn(timescaleElement, "getBoundingClientRect").mockReturnValue(mockRect);

            // Simulate click at position
            fireEvent.click(timescaleElement, {
              clientX: clickX,
              clientY: 20,
            });

            // Verify onSeek was called
            expect(onSeek).toHaveBeenCalled();

            // Calculate expected time
            const expectedTime = pixelsToTime(clickX + scrollLeft, zoomLevel);

            // Verify the time passed to onSeek matches expected time
            const actualTime = onSeek.mock.calls[0][0];
            expect(Math.abs(actualTime - expectedTime)).toBeLessThan(0.001);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: timeline-area, Property 15: 刻度密度随缩放变化
  // Validates: Requirements 6.2, 6.3
  it("should adjust tick mark density based on zoom level", () => {
    fc.assert(
      fc.property(
        // Generate different zoom levels
        fc.record({
          duration: fc.constant(60), // Fixed duration for comparison
          zoomLevel: fc.float({ min: 10, max: 200, noNaN: true }),
        }),
        ({ duration, zoomLevel }) => {
          const viewportWidth = 1920;
          const markers = generateTimeMarks(duration, zoomLevel, viewportWidth);

          // Verify markers are generated
          expect(markers.length).toBeGreaterThan(0);

          // Calculate interval based on zoom level (from generateTimeMarks logic)
          let expectedInterval: number;
          if (zoomLevel >= 100) {
            expectedInterval = 1; // 1 second
          } else if (zoomLevel >= 50) {
            expectedInterval = 2; // 2 seconds
          } else if (zoomLevel >= 20) {
            expectedInterval = 5; // 5 seconds
          } else {
            expectedInterval = 10; // 10 seconds
          }

          // Verify that markers follow the expected interval
          if (markers.length >= 2) {
            const timeDiff = markers[1].time - markers[0].time;
            expect(timeDiff).toBe(expectedInterval);
          }

          // Verify that higher zoom levels produce more markers (denser)
          const expectedMarkerCount = Math.floor(duration / expectedInterval) + 1;
          expect(markers.length).toBeGreaterThanOrEqual(expectedMarkerCount - 1);
          expect(markers.length).toBeLessThanOrEqual(expectedMarkerCount + 1);

          // Verify major marks are at 5x interval
          const majorMarks = markers.filter((m) => m.isMajor);
          if (majorMarks.length >= 2) {
            const majorTimeDiff = majorMarks[1].time - majorMarks[0].time;
            expect(majorTimeDiff).toBe(expectedInterval * 5);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Additional property: Verify markers are in ascending order
  it("should generate time markers in ascending time order", () => {
    fc.assert(
      fc.property(
        fc.record({
          duration: fc.float({ min: 10, max: 300, noNaN: true }),
          zoomLevel: fc.float({ min: 10, max: 200, noNaN: true }),
        }),
        ({ duration, zoomLevel }) => {
          const viewportWidth = 1920;
          const markers = generateTimeMarks(duration, zoomLevel, viewportWidth);

          // Verify markers are in ascending order
          for (let i = 1; i < markers.length; i++) {
            expect(markers[i].time).toBeGreaterThan(markers[i - 1].time);
            expect(markers[i].position).toBeGreaterThan(markers[i - 1].position);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Additional property: Verify marker positions match time-to-pixel conversion
  it("should position markers correctly based on time and zoom level", () => {
    fc.assert(
      fc.property(
        fc.record({
          duration: fc.float({ min: 10, max: 300, noNaN: true }),
          zoomLevel: fc.float({ min: 10, max: 200, noNaN: true }),
        }),
        ({ duration, zoomLevel }) => {
          const viewportWidth = 1920;
          const markers = generateTimeMarks(duration, zoomLevel, viewportWidth);

          // Verify each marker's position matches time * zoomLevel
          for (const marker of markers) {
            const expectedPosition = marker.time * zoomLevel;
            expect(Math.abs(marker.position - expectedPosition)).toBeLessThan(0.001);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
