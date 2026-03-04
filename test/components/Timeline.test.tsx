import { beforeEach, describe, expect, it } from "vitest";
import { act, render } from "@testing-library/react";
import Timeline from "@/components/Timeline/Timeline";
import { useTimelineStore } from "@/store/timelineStore";
import type { ProjectData } from "@/store/timelineStore";

const createEmptyProject = (): ProjectData => ({
  metadata: {
    name: "timeline-test-project",
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

describe("Timeline Component", () => {
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

  describe("Basic Rendering", () => {
    it("should render timeline container", () => {
      render(<Timeline />);

      const container = document.querySelector(".timeline-container");
      expect(container).toBeInTheDocument();
    });

    it("should render toolbar area", () => {
      render(<Timeline />);

      const toolbar = document.querySelector(".timeline-toolbar");
      expect(toolbar).toBeInTheDocument();
    });

    it("should render timescale area", () => {
      render(<Timeline />);

      const timescale = document.querySelector(".timescale");
      expect(timescale).toBeInTheDocument();
    });

    it("should have sticky timescale header", () => {
      render(<Timeline />);

      const timescaleHeader = document.querySelector(".timeline-header");
      expect(timescaleHeader).toHaveStyle({ position: "sticky", top: "0px" });
    });
  });

  describe("Empty State - Requirement 1.5", () => {
    it("should display empty state when no tracks exist", () => {
      render(<Timeline />);

      const tracks = document.querySelectorAll(".track-container");
      const emptyPlaceholder = document.querySelector(".timeline-body .text-center");

      expect(tracks).toHaveLength(0);
      expect(emptyPlaceholder).toBeInTheDocument();
    });
  });

  describe("Track Display - Requirements 1.3, 1.4", () => {
    it("should display tracks when they exist", () => {
      const { addTrack } = useTimelineStore.getState();
      addTrack("video");
      addTrack("audio");

      render(<Timeline />);

      const trackElements = document.querySelectorAll(".track-container");
      expect(trackElements).toHaveLength(2);
    });

    it("should display tracks in correct order (higher order on top)", () => {
      const { addTrack } = useTimelineStore.getState();
      addTrack("video");
      addTrack("video");

      const expectedOrder = useTimelineStore
        .getState()
        .project.tracks.toSorted((a, b) => b.order - a.order)
        .map((track) => track.name);

      render(<Timeline />);

      const renderedOrder = Array.from(
        document.querySelectorAll(".track-name > div:first-child"),
      ).map((element) => element.textContent?.trim() ?? "");

      expect(renderedOrder).toEqual(expectedOrder);
    });

    it("should display track with correct height", () => {
      const { addTrack } = useTimelineStore.getState();
      addTrack("video");

      const expectedHeight = useTimelineStore.getState().project.tracks[0].height;

      render(<Timeline />);

      const trackElement = document.querySelector(".track-container");
      expect(trackElement).toHaveStyle({ height: `${expectedHeight}px` });
    });
  });

  describe("Scroll Container - Requirements 8.1, 8.2", () => {
    it("should have scrollable container", () => {
      render(<Timeline />);

      const scrollContainer = document.querySelector(".timeline-scroll-container");
      expect(scrollContainer).toBeInTheDocument();
      expect(scrollContainer).toHaveClass("overflow-auto");
    });

    it("should render playhead", () => {
      render(<Timeline />);

      const playhead = document.querySelector(".playhead-line");
      expect(playhead).toBeInTheDocument();
      expect(playhead).toHaveStyle({ backgroundColor: "rgb(255, 0, 0)" });
    });

    it("should position playhead based on store state", () => {
      const { setPlayheadPosition, setZoomLevel } = useTimelineStore.getState();
      setPlayheadPosition(10);
      setZoomLevel(50);

      render(<Timeline />);

      const playhead = document.querySelector(".playhead-line");
      expect(playhead).toHaveStyle({ left: "620px" });
    });
  });

  describe("Store Integration", () => {
    it("should connect to timeline store", () => {
      const { addTrack } = useTimelineStore.getState();

      let tracks = useTimelineStore.getState().project.tracks;
      expect(tracks).toHaveLength(0);

      addTrack("video");

      tracks = useTimelineStore.getState().project.tracks;
      expect(tracks).toHaveLength(1);
      expect(tracks[0].type).toBe("video");
    });

    it("should update when store changes", () => {
      const { addTrack } = useTimelineStore.getState();

      const { rerender } = render(<Timeline />);
      expect(document.querySelectorAll(".track-container")).toHaveLength(0);

      addTrack("video");
      rerender(<Timeline />);

      expect(document.querySelectorAll(".track-container")).toHaveLength(1);
    });
  });

  describe("Layout Structure - Requirements 1.3, 1.4", () => {
    it("should have toolbar at top", () => {
      render(<Timeline />);

      const container = document.querySelector(".timeline-container");
      const toolbar = document.querySelector(".timeline-toolbar");

      expect(container?.firstElementChild).toBe(toolbar);
    });

    it("should have scroll container below toolbar", () => {
      render(<Timeline />);

      const toolbar = document.querySelector(".timeline-toolbar");
      const scrollContainer = document.querySelector(".timeline-scroll-container");

      expect(toolbar?.nextElementSibling).toBe(scrollContainer);
    });

    it("should have timescale inside scroll container", () => {
      render(<Timeline />);

      const scrollContainer = document.querySelector(".timeline-scroll-container");
      const timescale = document.querySelector(".timeline-header");

      expect(scrollContainer).toContainElement(timescale);
    });

    it("should have tracks body inside scroll container", () => {
      render(<Timeline />);

      const scrollContainer = document.querySelector(".timeline-scroll-container");
      const body = document.querySelector(".timeline-body");

      expect(scrollContainer).toContainElement(body);
    });
  });
});
