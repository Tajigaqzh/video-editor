import { beforeEach, describe, expect, it } from "vitest";
import fc from "fast-check";
import { useTimelineStore } from "@/store/timelineStore";
import type { ProjectData, TrackType } from "@/store/timelineStore";

const createEmptyProject = (): ProjectData => ({
  metadata: {
    name: "toolbar-property-test",
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

const getTracks = () => useTimelineStore.getState().project.tracks;

describe("Timeline Toolbar Property Tests", () => {
  beforeEach(() => {
    const store = useTimelineStore.getState();
    store.setProject(createEmptyProject());
    store.clearSelection();
    store.setPlayheadPosition(0);
    store.setZoomLevel(store.config.pixelsPerSecond);
    if (!store.snapEnabled) {
      store.toggleSnap();
    }
  });

  it("should adjust zoom level within 10-200 px/s range for any zoom operation", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 200 }),
        fc.integer({ min: -50, max: 50 }),
        (initialZoom, adjustment) => {
          const { setZoomLevel, config } = useTimelineStore.getState();

          setZoomLevel(initialZoom);
          const newZoom = initialZoom + adjustment;
          setZoomLevel(newZoom);

          const actualZoom = useTimelineStore.getState().zoomLevel;
          expect(actualZoom).toBeGreaterThanOrEqual(config.minZoom);
          expect(actualZoom).toBeLessThanOrEqual(config.maxZoom);

          if (newZoom < config.minZoom) {
            expect(actualZoom).toBe(config.minZoom);
          } else if (newZoom > config.maxZoom) {
            expect(actualZoom).toBe(config.maxZoom);
          } else {
            expect(actualZoom).toBe(newZoom);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should create new track in appropriate area when add track button is clicked", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<TrackType>("video", "audio"),
        fc.integer({ min: 1, max: 10 }),
        (trackType, numTracks) => {
          const { addTrack } = useTimelineStore.getState();

          const initialTracks = getTracks().filter((track) => track.type === trackType);
          const initialCount = initialTracks.length;

          for (let i = 0; i < numTracks; i += 1) {
            addTrack(trackType);
          }

          const updatedTracks = getTracks().filter((track) => track.type === trackType);

          expect(updatedTracks.length).toBe(initialCount + numTracks);
          updatedTracks.forEach((track) => {
            expect(track.type).toBe(trackType);
          });

          const ids = updatedTracks.map((track) => track.id);
          expect(new Set(ids).size).toBe(updatedTracks.length);

          const sortedByOrder = updatedTracks.toSorted((a, b) => a.order - b.order);
          for (let index = 1; index < sortedByOrder.length; index += 1) {
            expect(sortedByOrder[index].order).toBeGreaterThan(sortedByOrder[index - 1].order);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should immediately reflect zoom level changes in store state", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 10, max: 200 }), { minLength: 1, maxLength: 20 }),
        (zoomLevels) => {
          const { setZoomLevel } = useTimelineStore.getState();

          zoomLevels.forEach((zoom) => {
            setZoomLevel(zoom);
            const currentZoom = useTimelineStore.getState().zoomLevel;
            expect(currentZoom).toBe(zoom);
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should maintain correct order when adding multiple tracks", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<TrackType>("video", "audio"), {
          minLength: 1,
          maxLength: 10,
        }),
        (trackTypes) => {
          const { addTrack } = useTimelineStore.getState();

          trackTypes.forEach((type) => {
            addTrack(type);
          });

          const tracks = getTracks();
          const videoTracks = tracks.filter((track) => track.type === "video");
          const audioTracks = tracks.filter((track) => track.type === "audio");

          for (let index = 1; index < videoTracks.length; index += 1) {
            expect(videoTracks[index].order).toBeGreaterThan(videoTracks[index - 1].order);
          }

          for (let index = 1; index < audioTracks.length; index += 1) {
            expect(audioTracks[index].order).toBeGreaterThan(audioTracks[index - 1].order);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
