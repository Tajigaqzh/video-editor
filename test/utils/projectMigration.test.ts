import type { Media, ProjectData } from "@/store/timelineStore";
import { migrateProjectMediaModel } from "@/utils/project/projectMigration";
import { describe, it, expect } from "vitest";

const createBaseProject = (media: Media[]): ProjectData => ({
  metadata: {
    name: "Migration Test Project",
    version: "1.0.0",
    createdAt: "2026-03-04T00:00:00.000Z",
    modifiedAt: "2026-03-04T00:00:00.000Z",
  },
  timeline: {
    fps: 30,
    resolution: {
      width: 1920,
      height: 1080,
    },
    duration: 10,
    playheadPosition: 0,
  },
  media,
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

describe("migrateProjectMediaModel", () => {
  it("should fill missing originalPath/proxyStatus defaults for legacy media", () => {
    const project = createBaseProject([
      {
        id: "media_1",
        name: "legacy.mp4",
        type: "video",
        path: "temp/legacy.mp4",
        duration: 5,
        fileSize: 1000,
        createdAt: "2026-03-04T00:00:00.000Z",
      },
    ]);

    const migrated = migrateProjectMediaModel(project);
    const [media] = migrated.media;

    expect(media.originalPath).toBe("temp/legacy.mp4");
    expect(media.proxyPath).toBeUndefined();
    expect(media.proxyStatus).toBe("none");
  });

  it("should preserve existing media model fields", () => {
    const project = createBaseProject([
      {
        id: "media_2",
        name: "proxy-ready.mp4",
        type: "video",
        path: "temp/source.mp4",
        originalPath: "D:/source.mp4",
        proxyPath: "temp/proxy/media_2_medium.mp4",
        proxyStatus: "ready",
        duration: 8,
        fileSize: 2048,
        createdAt: "2026-03-04T00:00:00.000Z",
      },
    ]);

    const migrated = migrateProjectMediaModel(project);
    const [media] = migrated.media;

    expect(media.originalPath).toBe("D:/source.mp4");
    expect(media.proxyPath).toBe("temp/proxy/media_2_medium.mp4");
    expect(media.proxyStatus).toBe("ready");
  });
});
