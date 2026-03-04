import { beforeEach, describe, expect, it } from "vitest";
import fc from "fast-check";
import { fireEvent, render } from "@testing-library/react";
import Playhead from "@/components/Timeline/Playhead";
import { useTimelineStore } from "@/store/timelineStore";
import type { ProjectData } from "@/store/timelineStore";

const TRACK_HEADER_OFFSET = 120;
const AUTO_SCROLL_THRESHOLD = 50;

const createProjectWithDefaults = (): ProjectData => ({
  metadata: {
    name: "playhead-property-test",
    version: "1.0.0",
    createdAt: "2026-01-01T00:00:00.000Z",
    modifiedAt: "2026-01-01T00:00:00.000Z",
  },
  timeline: {
    fps: 30,
    resolution: { width: 1920, height: 1080 },
    duration: 0,
    playheadPosition: 0,
  },
  media: [],
  tracks: [],
  settings: {
    autoSave: true,
    autoSaveInterval: 300,
    snapToGrid: true,
    snapThreshold: 5,
    showRuler: true,
    showGuides: true,
    defaultTransitionDuration: 0.5,
    theme: "dark",
  },
  history: {
    undoStack: [],
    redoStack: [],
    maxHistorySize: 100,
  },
});

describe("Playhead Property Tests", () => {
  beforeEach(() => {
    const store = useTimelineStore.getState();
    store.setProject(createProjectWithDefaults());
    store.setPlayheadPosition(0);
    store.setZoomLevel(store.config.pixelsPerSecond);
  });

  it("should auto-scroll to keep playhead visible when it moves beyond viewport", () => {
    fc.assert(
      fc.property(
        fc.record({
          targetTime: fc.float({ min: 0, max: 300, noNaN: true }),
          zoomLevel: fc.float({ min: 10, max: 200, noNaN: true }),
          viewportWidth: fc.integer({ min: 500, max: 2000 }),
          initialScrollLeft: fc.float({ min: 0, max: 1000, noNaN: true }),
        }),
        ({ targetTime, zoomLevel, viewportWidth, initialScrollLeft }) => {
          const store = useTimelineStore.getState();
          store.setPlayheadPosition(0);
          store.setZoomLevel(zoomLevel);

          let scrollLeft = initialScrollLeft;
          const scrollContainerRef = {
            current: {
              get scrollLeft() {
                return scrollLeft;
              },
              set scrollLeft(value: number) {
                scrollLeft = value;
              },
              clientWidth: viewportWidth,
              getBoundingClientRect: () => ({
                left: 0,
                top: 0,
                right: viewportWidth,
                bottom: 600,
                width: viewportWidth,
                height: 600,
                x: 0,
                y: 0,
                toJSON: () => ({}),
              }),
            },
          };

          const timelineBodyRef = {
            current: {
              getBoundingClientRect: () => ({
                left: 0,
                top: 0,
                right: viewportWidth,
                bottom: 600,
                width: viewportWidth,
                height: 600,
                x: 0,
                y: 0,
                toJSON: () => ({}),
              }),
            },
          };

          const { container, unmount } = render(
            <div style={{ position: "relative", width: `${viewportWidth}px`, height: "600px" }}>
              <Playhead
                scrollContainerRef={
                  scrollContainerRef as unknown as React.RefObject<HTMLDivElement | null>
                }
                timelineBodyRef={
                  timelineBodyRef as unknown as React.RefObject<HTMLDivElement | null>
                }
              />
            </div>,
          );

          const playheadLine = container.querySelector(".playhead-line") as HTMLElement | null;
          expect(playheadLine).toBeTruthy();

          fireEvent.mouseDown(playheadLine as HTMLElement);

          const clientX = targetTime * zoomLevel + TRACK_HEADER_OFFSET - initialScrollLeft;
          fireEvent.mouseMove(document, { clientX });
          fireEvent.mouseUp(document);

          const expectedPlayheadPixelX = targetTime * zoomLevel + TRACK_HEADER_OFFSET;
          const styleLeft = parseFloat((playheadLine as HTMLElement).style.left);
          expect(styleLeft).toBeCloseTo(expectedPlayheadPixelX, 1);

          const shouldScrollRight =
            expectedPlayheadPixelX - initialScrollLeft > viewportWidth - AUTO_SCROLL_THRESHOLD;
          const shouldScrollLeft =
            expectedPlayheadPixelX - initialScrollLeft < AUTO_SCROLL_THRESHOLD;

          let expectedScroll = initialScrollLeft;
          if (shouldScrollRight) {
            expectedScroll = expectedPlayheadPixelX - viewportWidth + AUTO_SCROLL_THRESHOLD;
          } else if (shouldScrollLeft) {
            expectedScroll = Math.max(0, expectedPlayheadPixelX - AUTO_SCROLL_THRESHOLD);
          }

          expect(scrollLeft).toBeCloseTo(expectedScroll, 3);

          unmount();
        },
      ),
      { numRuns: 50 },
    );
  });

  it("should render playhead at position matching store state", () => {
    fc.assert(
      fc.property(
        fc.record({
          playheadPosition: fc.float({ min: 0, max: 300, noNaN: true }),
          zoomLevel: fc.float({ min: 10, max: 200, noNaN: true }),
        }),
        ({ playheadPosition, zoomLevel }) => {
          const store = useTimelineStore.getState();
          store.setPlayheadPosition(playheadPosition);
          store.setZoomLevel(zoomLevel);

          const scrollContainerRef = {
            current: {
              scrollLeft: 0,
              clientWidth: 1920,
            },
          };

          const timelineBodyRef = {
            current: {
              getBoundingClientRect: () => ({
                left: 0,
                top: 0,
                right: 1920,
                bottom: 600,
                width: 1920,
                height: 600,
                x: 0,
                y: 0,
                toJSON: () => ({}),
              }),
            },
          };

          const { container, unmount } = render(
            <div style={{ position: "relative", width: "1920px", height: "600px" }}>
              <Playhead
                scrollContainerRef={
                  scrollContainerRef as unknown as React.RefObject<HTMLDivElement | null>
                }
                timelineBodyRef={
                  timelineBodyRef as unknown as React.RefObject<HTMLDivElement | null>
                }
              />
            </div>,
          );

          const expectedX = playheadPosition * zoomLevel + TRACK_HEADER_OFFSET;
          const playheadLine = container.querySelector(".playhead-line") as HTMLElement | null;
          expect(playheadLine).toBeTruthy();
          expect(parseFloat(playheadLine?.style.left ?? "0")).toBeCloseTo(expectedX, 3);

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should render playhead with correct visual properties", () => {
    fc.assert(
      fc.property(
        fc.record({
          playheadPosition: fc.float({ min: 0, max: 100, noNaN: true }),
          zoomLevel: fc.float({ min: 10, max: 200, noNaN: true }),
        }),
        ({ playheadPosition, zoomLevel }) => {
          const store = useTimelineStore.getState();
          store.setPlayheadPosition(playheadPosition);
          store.setZoomLevel(zoomLevel);

          const scrollContainerRef = {
            current: {
              scrollLeft: 0,
              clientWidth: 1920,
            },
          };

          const timelineBodyRef = {
            current: {
              getBoundingClientRect: () => ({
                left: 0,
                top: 0,
                right: 1920,
                bottom: 600,
                width: 1920,
                height: 600,
                x: 0,
                y: 0,
                toJSON: () => ({}),
              }),
            },
          };

          const { container, unmount } = render(
            <div style={{ position: "relative", width: "1920px", height: "600px" }}>
              <Playhead
                scrollContainerRef={
                  scrollContainerRef as unknown as React.RefObject<HTMLDivElement | null>
                }
                timelineBodyRef={
                  timelineBodyRef as unknown as React.RefObject<HTMLDivElement | null>
                }
              />
            </div>,
          );

          const playheadLine = container.querySelector(".playhead-line") as HTMLElement | null;
          expect(playheadLine).toBeTruthy();

          expect(playheadLine?.style.backgroundColor).toBe("rgb(255, 0, 0)");
          expect(playheadLine?.style.width).toBe("2px");
          expect(playheadLine?.style.position).toBe("absolute");

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });
});
