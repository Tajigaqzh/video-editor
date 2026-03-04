import { beforeEach, describe, expect, it } from "vitest";
import { useTimelineStore } from "@/store/timelineStore.ts";
import type { Clip, ProjectData, TrackType } from "@/store/timelineStore.ts";

const createEmptyProject = (): ProjectData => ({
  metadata: {
    name: "test-project",
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

const createClip = (
  overrides: Partial<Clip> &
    Pick<Clip, "id" | "trackId" | "mediaId" | "startTime" | "duration" | "trimStart" | "trimEnd">,
): Clip => ({
  id: overrides.id,
  trackId: overrides.trackId,
  mediaId: overrides.mediaId,
  startTime: overrides.startTime,
  duration: overrides.duration,
  trimStart: overrides.trimStart,
  trimEnd: overrides.trimEnd,
  thumbnailUrl: overrides.thumbnailUrl,
  position: { x: 0, y: 0 },
  scale: { x: 1, y: 1 },
  rotation: 0,
  opacity: 1,
  effects: [],
  ...overrides,
});

const getTracks = () => useTimelineStore.getState().project.tracks;

const getAllClips = () =>
  useTimelineStore.getState().project.tracks.flatMap((track) => track.clips);

const getTrackIdByType = (type: TrackType): string => {
  const track = getTracks().find((item) => item.type === type);
  if (!track) {
    throw new Error(`Track of type '${type}' not found`);
  }

  return track.id;
};

describe("Timeline Store", () => {
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

  describe("initialization", () => {
    it("should have empty tracks and clips on initialization", () => {
      expect(getTracks()).toEqual([]);
      expect(getAllClips()).toEqual([]);
    });

    it("should have default playhead position at 0", () => {
      const { playheadPosition } = useTimelineStore.getState();
      expect(playheadPosition).toBe(0);
    });

    it("should have snap enabled by default", () => {
      const { snapEnabled } = useTimelineStore.getState();
      expect(snapEnabled).toBe(true);
    });

    it("should have default zoom level", () => {
      const { zoomLevel, config } = useTimelineStore.getState();
      expect(zoomLevel).toBe(config.pixelsPerSecond);
    });

    it("should have empty selection", () => {
      const { selectedClipIds } = useTimelineStore.getState();
      expect(selectedClipIds).toEqual([]);
    });
  });

  describe("track operations", () => {
    it("should add a video track", () => {
      const { addTrack } = useTimelineStore.getState();
      addTrack("video");

      const tracks = getTracks();
      expect(tracks).toHaveLength(1);
      expect(tracks[0].type).toBe("video");
      expect(tracks[0].name).toMatch(/1$/);
    });

    it("should add an audio track", () => {
      const { addTrack } = useTimelineStore.getState();
      addTrack("audio");

      const tracks = getTracks();
      expect(tracks).toHaveLength(1);
      expect(tracks[0].type).toBe("audio");
      expect(tracks[0].name).toMatch(/1$/);
    });

    it("should add multiple tracks with incremental names", () => {
      const { addTrack } = useTimelineStore.getState();
      addTrack("video");
      addTrack("video");
      addTrack("audio");

      const tracks = getTracks();
      const videoTracks = tracks.filter((track) => track.type === "video");
      const audioTracks = tracks.filter((track) => track.type === "audio");

      expect(tracks).toHaveLength(3);
      expect(videoTracks[0].name).toMatch(/1$/);
      expect(videoTracks[1].name).toMatch(/2$/);
      expect(audioTracks[0].name).toMatch(/1$/);
    });

    it("should assign unique IDs to tracks", () => {
      const { addTrack } = useTimelineStore.getState();
      addTrack("video");
      addTrack("video");

      const [firstTrack, secondTrack] = getTracks();
      expect(firstTrack.id).not.toBe(secondTrack.id);
    });

    it("should set correct order for tracks of the same type", () => {
      const { addTrack } = useTimelineStore.getState();
      addTrack("video");
      addTrack("video");

      const videoTracks = getTracks().filter((track) => track.type === "video");
      expect(videoTracks[0].order).toBe(1);
      expect(videoTracks[1].order).toBe(2);
    });
  });

  describe("remove track operations", () => {
    it("should remove a track by ID", () => {
      const { addTrack, removeTrack } = useTimelineStore.getState();
      addTrack("video");
      const trackId = getTrackIdByType("video");

      removeTrack(trackId);

      expect(getTracks()).toHaveLength(0);
    });

    it("should remove all clips associated with the track", () => {
      const { addTrack, addClip, removeTrack } = useTimelineStore.getState();
      addTrack("video");
      const trackId = getTrackIdByType("video");

      addClip(
        createClip({
          id: "clip_1",
          trackId,
          mediaId: "media-1",
          startTime: 0,
          duration: 5,
          trimStart: 0,
          trimEnd: 5,
        }),
      );
      addClip(
        createClip({
          id: "clip_2",
          trackId,
          mediaId: "media-2",
          startTime: 5,
          duration: 3,
          trimStart: 0,
          trimEnd: 3,
        }),
      );

      expect(getAllClips()).toHaveLength(2);
      removeTrack(trackId);
      expect(getAllClips()).toHaveLength(0);
    });

    it("should not affect other tracks when removing one", () => {
      const { addTrack, removeTrack } = useTimelineStore.getState();
      addTrack("video");
      addTrack("audio");
      const videoTrackId = getTrackIdByType("video");

      removeTrack(videoTrackId);

      const tracks = getTracks();
      expect(tracks).toHaveLength(1);
      expect(tracks[0].type).toBe("audio");
    });
  });

  describe("add clip operations", () => {
    it("should add a clip to a track", () => {
      const { addTrack, addClip } = useTimelineStore.getState();
      addTrack("video");
      const trackId = getTrackIdByType("video");

      addClip(
        createClip({
          id: "clip_1",
          trackId,
          mediaId: "media-1",
          startTime: 0,
          duration: 5,
          trimStart: 0,
          trimEnd: 5,
        }),
      );

      const clips = getAllClips();
      expect(clips).toHaveLength(1);
      expect(clips[0].trackId).toBe(trackId);
      expect(clips[0].mediaId).toBe("media-1");
    });

    it("should preserve provided clip IDs", () => {
      const { addTrack, addClip } = useTimelineStore.getState();
      addTrack("video");
      const trackId = getTrackIdByType("video");

      addClip(
        createClip({
          id: "clip_alpha",
          trackId,
          mediaId: "media-1",
          startTime: 0,
          duration: 5,
          trimStart: 0,
          trimEnd: 5,
        }),
      );
      addClip(
        createClip({
          id: "clip_beta",
          trackId,
          mediaId: "media-2",
          startTime: 5,
          duration: 3,
          trimStart: 0,
          trimEnd: 3,
        }),
      );

      const clips = getAllClips();
      expect(clips.map((clip) => clip.id)).toEqual(["clip_alpha", "clip_beta"]);
    });

    it("should preserve clip properties", () => {
      const { addTrack, addClip } = useTimelineStore.getState();
      addTrack("video");
      const trackId = getTrackIdByType("video");

      addClip(
        createClip({
          id: "clip_1",
          trackId,
          mediaId: "media-1",
          startTime: 2.5,
          duration: 5.3,
          trimStart: 1,
          trimEnd: 6.3,
          thumbnailUrl: "http://example.com/thumb.jpg",
        }),
      );

      const clip = getAllClips()[0];
      expect(clip.startTime).toBe(2.5);
      expect(clip.duration).toBe(5.3);
      expect(clip.trimStart).toBe(1);
      expect(clip.trimEnd).toBe(6.3);
      expect(clip.thumbnailUrl).toBe("http://example.com/thumb.jpg");
    });
  });

  describe("remove clip operations", () => {
    it("should remove a single clip", () => {
      const { addTrack, addClip, removeClip } = useTimelineStore.getState();
      addTrack("video");
      const trackId = getTrackIdByType("video");

      addClip(
        createClip({
          id: "clip_1",
          trackId,
          mediaId: "media-1",
          startTime: 0,
          duration: 5,
          trimStart: 0,
          trimEnd: 5,
        }),
      );

      removeClip("clip_1");
      expect(getAllClips()).toHaveLength(0);
    });

    it("should remove clip from selection when deleted", () => {
      const { addTrack, addClip, selectClip, removeClip } = useTimelineStore.getState();
      addTrack("video");
      const trackId = getTrackIdByType("video");

      addClip(
        createClip({
          id: "clip_1",
          trackId,
          mediaId: "media-1",
          startTime: 0,
          duration: 5,
          trimStart: 0,
          trimEnd: 5,
        }),
      );

      selectClip("clip_1", false);
      expect(useTimelineStore.getState().selectedClipIds).toContain("clip_1");

      removeClip("clip_1");
      expect(useTimelineStore.getState().selectedClipIds).not.toContain("clip_1");
    });

    it("should remove multiple clips", () => {
      const { addTrack, addClip, removeClips } = useTimelineStore.getState();
      addTrack("video");
      const trackId = getTrackIdByType("video");

      addClip(
        createClip({
          id: "clip_1",
          trackId,
          mediaId: "media-1",
          startTime: 0,
          duration: 5,
          trimStart: 0,
          trimEnd: 5,
        }),
      );
      addClip(
        createClip({
          id: "clip_2",
          trackId,
          mediaId: "media-2",
          startTime: 5,
          duration: 3,
          trimStart: 0,
          trimEnd: 3,
        }),
      );

      removeClips(["clip_1", "clip_2"]);
      expect(getAllClips()).toHaveLength(0);
    });
  });

  describe("update clip operations", () => {
    it("should update clip properties", () => {
      const { addTrack, addClip, updateClip } = useTimelineStore.getState();
      addTrack("video");
      const trackId = getTrackIdByType("video");

      addClip(
        createClip({
          id: "clip_1",
          trackId,
          mediaId: "media-1",
          startTime: 0,
          duration: 5,
          trimStart: 0,
          trimEnd: 5,
        }),
      );

      updateClip("clip_1", { startTime: 2, duration: 3 });

      const updatedClip = getAllClips()[0];
      expect(updatedClip.startTime).toBe(2);
      expect(updatedClip.duration).toBe(3);
      expect(updatedClip.mediaId).toBe("media-1");
    });
  });

  describe("selectors", () => {
    it("getClipsByTrack should return clips for a specific track", () => {
      const { addTrack, addClip, getClipsByTrack } = useTimelineStore.getState();
      addTrack("video");
      addTrack("audio");
      const videoTrackId = getTrackIdByType("video");
      const audioTrackId = getTrackIdByType("audio");

      addClip(
        createClip({
          id: "clip_video",
          trackId: videoTrackId,
          mediaId: "media-1",
          startTime: 0,
          duration: 5,
          trimStart: 0,
          trimEnd: 5,
        }),
      );
      addClip(
        createClip({
          id: "clip_audio",
          trackId: audioTrackId,
          mediaId: "media-2",
          startTime: 0,
          duration: 3,
          trimStart: 0,
          trimEnd: 3,
        }),
      );

      const videoClips = getClipsByTrack(videoTrackId);
      expect(videoClips).toHaveLength(1);
      expect(videoClips[0].mediaId).toBe("media-1");
    });

    it("getTotalDuration should return 0 for empty timeline", () => {
      const { getTotalDuration } = useTimelineStore.getState();
      expect(getTotalDuration()).toBe(0);
    });

    it("getTotalDuration should return the end time of the last clip", () => {
      const { addTrack, addClip, getTotalDuration } = useTimelineStore.getState();
      addTrack("video");
      const trackId = getTrackIdByType("video");

      addClip(
        createClip({
          id: "clip_1",
          trackId,
          mediaId: "media-1",
          startTime: 0,
          duration: 5,
          trimStart: 0,
          trimEnd: 5,
        }),
      );
      addClip(
        createClip({
          id: "clip_2",
          trackId,
          mediaId: "media-2",
          startTime: 10,
          duration: 3,
          trimStart: 0,
          trimEnd: 3,
        }),
      );

      expect(getTotalDuration()).toBe(13);
    });

    it("getClipAtPosition should return clip at given time", () => {
      const { addTrack, addClip, getClipAtPosition } = useTimelineStore.getState();
      addTrack("video");
      const trackId = getTrackIdByType("video");

      addClip(
        createClip({
          id: "clip_1",
          trackId,
          mediaId: "media-1",
          startTime: 5,
          duration: 5,
          trimStart: 0,
          trimEnd: 5,
        }),
      );

      const clip = getClipAtPosition(trackId, 7);
      expect(clip).not.toBeNull();
      expect(clip?.mediaId).toBe("media-1");
    });

    it("getClipAtPosition should return null if no clip at position", () => {
      const { addTrack, addClip, getClipAtPosition } = useTimelineStore.getState();
      addTrack("video");
      const trackId = getTrackIdByType("video");

      addClip(
        createClip({
          id: "clip_1",
          trackId,
          mediaId: "media-1",
          startTime: 5,
          duration: 5,
          trimStart: 0,
          trimEnd: 5,
        }),
      );

      const clip = getClipAtPosition(trackId, 2);
      expect(clip).toBeNull();
    });
  });
});
