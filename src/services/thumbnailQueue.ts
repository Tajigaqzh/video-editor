import { invoke } from "@tauri-apps/api/core";
import { useTimelineStore } from "@/store/timelineStore";
import { TaskQueue } from "@/utils/queue/taskQueue";

type ThumbnailMode = "first_screen" | "full";

type ThumbnailTaskPayload = {
  mediaId: string;
  inputPath: string;
  mode: ThumbnailMode;
  intervalSec?: number;
};

type ThumbnailBatchResponse = {
  dir: string;
  first_frame?: string | null;
  count: number;
};

type EnqueueThumbnailOptions = {
  mode?: ThumbnailMode;
  intervalSec?: number;
  priority?: number;
  scheduleFullAfterFirstScreen?: boolean;
};

export const thumbnailQueue = new TaskQueue({ concurrency: 2 });
const mediaModeTaskIndex = new Map<string, string>();
const fullScheduledMedia = new Set<string>();

const getTaskKey = (mediaId: string, mode: ThumbnailMode) => `${mediaId}:${mode}`;

thumbnailQueue.registerTaskType<ThumbnailTaskPayload, ThumbnailBatchResponse>(
  "thumbnail:generate",
  {
    run: async (task, signal) => {
      if (signal.aborted) throw new Error("Thumbnail task aborted");
      const payload = task.payload;
      if (!payload) throw new Error("Missing thumbnail task payload");

      useTimelineStore.getState().updateMedia(payload.mediaId, {
        thumbnailStatus: "processing",
        thumbnailError: undefined,
        thumbnailUpdatedAt: new Date().toISOString(),
      });

      return invoke<ThumbnailBatchResponse>("generate_thumbnails", {
        inputPath: payload.inputPath,
        mediaId: payload.mediaId,
        mode: payload.mode,
        intervalSec: payload.intervalSec,
      });
    },
    onDone: (task, result) => {
      const payload = task.payload;
      if (!payload) return;

      mediaModeTaskIndex.delete(getTaskKey(payload.mediaId, payload.mode));
      if (payload.mode === "full") {
        fullScheduledMedia.add(payload.mediaId);
      }

      useTimelineStore.getState().updateMedia(payload.mediaId, {
        thumbnailDir: result.dir,
        thumbnailPath: result.first_frame || undefined,
        thumbnailStatus: "ready",
        thumbnailError: undefined,
        thumbnailUpdatedAt: new Date().toISOString(),
      });
    },
    onError: (task, error) => {
      const payload = task.payload;
      if (!payload) return;

      mediaModeTaskIndex.delete(getTaskKey(payload.mediaId, payload.mode));
      if (payload.mode === "full") {
        fullScheduledMedia.delete(payload.mediaId);
      }

      useTimelineStore.getState().updateMedia(payload.mediaId, {
        thumbnailStatus: "failed",
        thumbnailError: error.message,
        thumbnailUpdatedAt: new Date().toISOString(),
      });
    },
  },
);

export function enqueueThumbnailGeneration(
  mediaId: string,
  inputPath: string,
  options: EnqueueThumbnailOptions = {},
) {
  const mode = options.mode ?? "first_screen";
  const taskKey = getTaskKey(mediaId, mode);
  const existingTaskId = mediaModeTaskIndex.get(taskKey);

  if (existingTaskId) {
    const existingTask = thumbnailQueue.getTask(existingTaskId);
    if (existingTask && (existingTask.status === "pending" || existingTask.status === "running")) {
      return existingTask;
    }
    mediaModeTaskIndex.delete(taskKey);
  }

  useTimelineStore.getState().updateMedia(mediaId, {
    thumbnailStatus: "pending",
    thumbnailError: undefined,
    thumbnailUpdatedAt: new Date().toISOString(),
  });

  const task = thumbnailQueue.enqueue<ThumbnailTaskPayload>({
    id: `thumbnail_${mediaId}_${mode}_${Date.now()}`,
    type: "thumbnail:generate",
    payload: {
      mediaId,
      inputPath,
      mode,
      intervalSec: options.intervalSec,
    },
    priority: options.priority ?? (mode === "first_screen" ? 8 : 1),
    maxRetries: 1,
  });

  mediaModeTaskIndex.set(taskKey, task.id);

  if (mode === "first_screen" && options.scheduleFullAfterFirstScreen !== false) {
    const fullTaskKey = getTaskKey(mediaId, "full");
    const fullTaskId = mediaModeTaskIndex.get(fullTaskKey);
    if (!fullScheduledMedia.has(mediaId) && !fullTaskId) {
      const fullTask = thumbnailQueue.enqueue<ThumbnailTaskPayload>({
        id: `thumbnail_${mediaId}_full_${Date.now()}`,
        type: "thumbnail:generate",
        payload: {
          mediaId,
          inputPath,
          mode: "full",
          intervalSec: options.intervalSec,
        },
        priority: 0,
        maxRetries: 1,
      });
      mediaModeTaskIndex.set(fullTaskKey, fullTask.id);
    }
  }

  return task;
}
