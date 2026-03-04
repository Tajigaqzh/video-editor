import { beforeEach, describe, expect, it } from "vitest";
import { useTimelineStore } from "../../src/store/timelineStore";

describe("timelineStore split clips", () => {
  beforeEach(() => {
    const store = useTimelineStore.getState();
    store.createNewProject("split-test");
    store.clearSelection();
    store.setPlayheadPosition(0);
  });

  it("splits clip at current playhead time", () => {
    const store = useTimelineStore.getState();
    const videoTrack = store.project.tracks.find((track) => track.type === "video");
    if (!videoTrack) throw new Error("Video track not found");

    store.addClip({
      id: "clip_source",
      mediaId: "media_1",
      trackId: videoTrack.id,
      startTime: 2,
      duration: 6,
      trimStart: 1,
      trimEnd: 7,
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      opacity: 1,
      effects: [],
    });
    store.setPlayheadPosition(5);

    const splitCount = useTimelineStore.getState().splitClipsAtPlayhead();

    expect(splitCount).toBe(1);
    const updatedTrack = useTimelineStore
      .getState()
      .project.tracks.find((track) => track.id === videoTrack.id);
    if (!updatedTrack) throw new Error("Updated video track not found");

    expect(updatedTrack.clips).toHaveLength(2);
    expect(updatedTrack.clips[0].id).toBe("clip_source");
    expect(updatedTrack.clips[0].startTime).toBe(2);
    expect(updatedTrack.clips[0].duration).toBe(3);
    expect(updatedTrack.clips[0].trimStart).toBe(1);
    expect(updatedTrack.clips[0].trimEnd).toBe(4);

    expect(updatedTrack.clips[1].id).not.toBe("clip_source");
    expect(updatedTrack.clips[1].startTime).toBe(5);
    expect(updatedTrack.clips[1].duration).toBe(3);
    expect(updatedTrack.clips[1].trimStart).toBe(4);
    expect(updatedTrack.clips[1].trimEnd).toBe(7);
  });

  it("does not split when playhead is on clip boundary", () => {
    const store = useTimelineStore.getState();
    const videoTrack = store.project.tracks.find((track) => track.type === "video");
    if (!videoTrack) throw new Error("Video track not found");

    store.addClip({
      id: "clip_boundary",
      mediaId: "media_1",
      trackId: videoTrack.id,
      startTime: 0,
      duration: 5,
      trimStart: 0,
      trimEnd: 5,
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      opacity: 1,
      effects: [],
    });

    store.setPlayheadPosition(0);
    const splitAtStart = useTimelineStore.getState().splitClipsAtPlayhead();
    expect(splitAtStart).toBe(0);

    store.setPlayheadPosition(5);
    const splitAtEnd = useTimelineStore.getState().splitClipsAtPlayhead();
    expect(splitAtEnd).toBe(0);

    const updatedTrack = useTimelineStore
      .getState()
      .project.tracks.find((track) => track.id === videoTrack.id);
    if (!updatedTrack) throw new Error("Updated video track not found");
    expect(updatedTrack.clips).toHaveLength(1);
  });
});
