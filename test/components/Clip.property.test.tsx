import { describe, expect, it, vi } from "vitest";
import fc from "fast-check";
import { fireEvent, render } from "@testing-library/react";
import Clip from "@/components/Timeline/Clip";
import type { Clip as ClipType, Track } from "@/store/timelineStore";

const createTrack = (type: "video" | "audio"): Track => ({
  id: `track_${type}`,
  name: `${type}_track`,
  type,
  order: 1,
  height: 80,
  visible: true,
  locked: false,
  clips: [],
  transitions: [],
});

const createClip = (overrides: Partial<ClipType> = {}): ClipType => ({
  id: "clip_1",
  mediaId: "media_1",
  trackId: "track_video",
  startTime: 2,
  duration: 4,
  trimStart: 0,
  trimEnd: 4,
  position: { x: 0, y: 0 },
  scale: { x: 1, y: 1 },
  rotation: 0,
  opacity: 1,
  effects: [],
  ...overrides,
});

describe("Clip Property Tests", () => {
  it("should render clip with width/position derived from timeline values", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 300, noNaN: true }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),
        fc.float({ min: 10, max: 200, noNaN: true }),
        (startTime, duration, zoomLevel) => {
          const clip = createClip({ startTime, duration, trimEnd: duration });
          const track = createTrack("video");
          const { container, unmount } = render(
            <Clip clip={clip} track={track} zoomLevel={zoomLevel} isSelected={false} />,
          );

          const clipElement = container.querySelector(".clip") as HTMLElement | null;
          expect(clipElement).toBeTruthy();

          const expectedLeft = startTime * zoomLevel;
          const expectedWidth = duration * zoomLevel;
          expect(parseFloat(clipElement?.style.left ?? "0")).toBeCloseTo(expectedLeft, 3);
          expect(parseFloat(clipElement?.style.width ?? "0")).toBeCloseTo(expectedWidth, 3);

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should use different background colors for video/audio tracks", () => {
    fc.assert(
      fc.property(fc.constantFrom("video" as const, "audio" as const), (trackType) => {
        const clip = createClip();
        const track = createTrack(trackType);
        const { container, unmount } = render(
          <Clip clip={clip} track={track} zoomLevel={50} isSelected={false} />,
        );

        const clipElement = container.querySelector(".clip") as HTMLElement | null;
        expect(clipElement).toBeTruthy();

        const expectedColor = trackType === "video" ? "rgb(25, 118, 210)" : "rgb(56, 142, 60)";
        expect(clipElement?.style.backgroundColor).toBe(expectedColor);

        unmount();
      }),
      { numRuns: 20 },
    );
  });

  it("should call onSelect with correct multi-select flag", () => {
    const onSelect = vi.fn();
    const clip = createClip({ id: "clip_multi" });
    const track = createTrack("video");
    const { container } = render(
      <Clip clip={clip} track={track} zoomLevel={50} isSelected={false} onSelect={onSelect} />,
    );

    const clipElement = container.querySelector(".clip") as HTMLElement;
    fireEvent.click(clipElement);
    fireEvent.click(clipElement, { ctrlKey: true });

    expect(onSelect).toHaveBeenNthCalledWith(1, "clip_multi", false);
    expect(onSelect).toHaveBeenNthCalledWith(2, "clip_multi", true);
  });
});
