import { beforeEach, describe, expect, it } from "vitest";
import fc from "fast-check";
import { useTimelineStore } from "../../src/store/timelineStore";
import type { Clip, ProjectData, TrackType } from "../../src/store/timelineStore";

const createEmptyProject = (): ProjectData => ({
  metadata: {
    name: "track-property-test",
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
  position: { x: 0, y: 0 },
  scale: { x: 1, y: 1 },
  rotation: 0,
  opacity: 1,
  effects: [],
  ...overrides,
});

const resetStore = () => {
  const store = useTimelineStore.getState();
  store.setProject(createEmptyProject());
  store.clearSelection();
  store.setPlayheadPosition(0);
  if (!store.snapEnabled) {
    store.toggleSnap();
  }
};

const getTracks = () => useTimelineStore.getState().project.tracks;

const getAllClips = () =>
  useTimelineStore.getState().project.tracks.flatMap((track) => track.clips);

describe("Track Property Tests", () => {
  beforeEach(() => {
    resetStore();
  });

  it("should remove track and all its clips when track is deleted", () => {
    fc.assert(
      fc.property(
        fc.record({
          trackType: fc.constantFrom<TrackType>("video", "audio"),
          clips: fc.array(
            fc.record({
              mediaId: fc.string({ minLength: 1 }),
              startTime: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
              duration: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
              trimStart: fc.float({ min: Math.fround(0), max: Math.fround(10), noNaN: true }),
              trimEnd: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
            }),
            { minLength: 0, maxLength: 10 },
          ),
        }),
        ({ trackType, clips }) => {
          resetStore();
          const { addTrack, addClip, removeTrack, getClipsByTrack } = useTimelineStore.getState();

          addTrack(trackType);
          const trackId = getTracks()[0].id;

          clips.forEach((clipData, index) => {
            addClip(
              createClip({
                id: `clip_${index}`,
                trackId,
                mediaId: clipData.mediaId,
                startTime: clipData.startTime,
                duration: clipData.duration,
                trimStart: clipData.trimStart,
                trimEnd: clipData.trimEnd,
              }),
            );
          });

          expect(getClipsByTrack(trackId)).toHaveLength(clips.length);

          removeTrack(trackId);

          expect(getTracks().find((track) => track.id === trackId)).toBeUndefined();
          expect(getAllClips().filter((clip) => clip.trackId === trackId)).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should allow deletion of empty tracks", () => {
    fc.assert(
      fc.property(
        fc.record({
          trackType: fc.constantFrom<TrackType>("video", "audio"),
          trackCount: fc.integer({ min: 1, max: 5 }),
        }),
        ({ trackType, trackCount }) => {
          resetStore();
          const { addTrack, removeTrack } = useTimelineStore.getState();

          const trackIds: string[] = [];
          for (let i = 0; i < trackCount; i += 1) {
            addTrack(trackType);
            const tracks = getTracks();
            trackIds.push(tracks[tracks.length - 1].id);
          }

          expect(getTracks()).toHaveLength(trackCount);

          trackIds.forEach((trackId) => {
            const tracksBefore = getTracks().length;
            removeTrack(trackId);
            const tracksAfter = getTracks().length;

            expect(tracksAfter).toBe(tracksBefore - 1);
            expect(getTracks().find((track) => track.id === trackId)).toBeUndefined();
          });

          expect(getTracks()).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should not affect other tracks when deleting one track", () => {
    fc.assert(
      fc.property(
        fc.record({
          trackTypes: fc.array(fc.constantFrom<TrackType>("video", "audio"), {
            minLength: 2,
            maxLength: 5,
          }),
          deleteIndex: fc.nat(),
        }),
        ({ trackTypes, deleteIndex }) => {
          resetStore();
          const { addTrack, removeTrack } = useTimelineStore.getState();

          const trackIds: string[] = [];
          trackTypes.forEach((type) => {
            addTrack(type);
            const tracks = getTracks();
            trackIds.push(tracks[tracks.length - 1].id);
          });

          const indexToDelete = deleteIndex % trackIds.length;
          const trackIdToDelete = trackIds[indexToDelete];
          const otherTrackIds = trackIds.filter((_, index) => index !== indexToDelete);

          removeTrack(trackIdToDelete);

          const remainingTracks = getTracks();
          expect(remainingTracks.find((track) => track.id === trackIdToDelete)).toBeUndefined();

          otherTrackIds.forEach((trackId) => {
            expect(remainingTracks.find((track) => track.id === trackId)).toBeDefined();
          });

          expect(remainingTracks).toHaveLength(trackTypes.length - 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should only remove clips from the deleted track, not from other tracks", () => {
    fc.assert(
      fc.property(
        fc.record({
          track1Clips: fc.array(
            fc.record({
              mediaId: fc.string({ minLength: 1 }),
              startTime: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
              duration: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
            }),
            { minLength: 1, maxLength: 5 },
          ),
          track2Clips: fc.array(
            fc.record({
              mediaId: fc.string({ minLength: 1 }),
              startTime: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
              duration: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
            }),
            { minLength: 1, maxLength: 5 },
          ),
        }),
        ({ track1Clips, track2Clips }) => {
          resetStore();
          const { addTrack, addClip, removeTrack, getClipsByTrack } = useTimelineStore.getState();

          addTrack("video");
          addTrack("audio");
          const tracks = getTracks();
          const track1Id = tracks[0].id;
          const track2Id = tracks[1].id;

          track1Clips.forEach((clipData, index) => {
            addClip(
              createClip({
                id: `track1_clip_${index}`,
                trackId: track1Id,
                mediaId: clipData.mediaId,
                startTime: clipData.startTime,
                duration: clipData.duration,
                trimStart: 0,
                trimEnd: clipData.duration,
              }),
            );
          });

          track2Clips.forEach((clipData, index) => {
            addClip(
              createClip({
                id: `track2_clip_${index}`,
                trackId: track2Id,
                mediaId: clipData.mediaId,
                startTime: clipData.startTime,
                duration: clipData.duration,
                trimStart: 0,
                trimEnd: clipData.duration,
              }),
            );
          });

          expect(getClipsByTrack(track1Id)).toHaveLength(track1Clips.length);
          expect(getClipsByTrack(track2Id)).toHaveLength(track2Clips.length);

          removeTrack(track1Id);

          expect(getClipsByTrack(track1Id)).toHaveLength(0);
          expect(getClipsByTrack(track2Id)).toHaveLength(track2Clips.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
