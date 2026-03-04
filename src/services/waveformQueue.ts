import { TaskQueue } from "@/utils/queue/taskQueue";
import { generateWaveform } from "@/utils/media/waveformManager";
import { useTimelineStore } from "@/store/timelineStore";

type WaveformTaskPayload = {
  mediaId: string;
  inputPath: string;
  stepMs?: number;
  sampleRate?: number;
};

export const waveformQueue = new TaskQueue({ concurrency: 2 });

waveformQueue.registerTaskType<WaveformTaskPayload, string>("waveform:generate", {
  run: async (task, signal) => {
    if (signal.aborted) throw new Error("Waveform task aborted");
    const payload = task.payload;
    if (!payload) throw new Error("Missing waveform task payload");

    useTimelineStore.getState().updateMedia(payload.mediaId, {
      waveformStatus: "processing",
      waveformError: undefined,
      waveformUpdatedAt: new Date().toISOString(),
    });

    return generateWaveform({
      inputPath: payload.inputPath,
      mediaId: payload.mediaId,
      stepMs: payload.stepMs,
      sampleRate: payload.sampleRate,
    });
  },
  onDone: (task, waveformPath) => {
    const payload = task.payload;
    if (!payload) return;
    useTimelineStore.getState().updateMedia(payload.mediaId, {
      waveformPath,
      waveformStatus: "ready",
      waveformUpdatedAt: new Date().toISOString(),
    });
  },
  onError: (task, error) => {
    const payload = task.payload;
    if (!payload) return;
    useTimelineStore.getState().updateMedia(payload.mediaId, {
      waveformStatus: "failed",
      waveformError: error.message,
      waveformUpdatedAt: new Date().toISOString(),
    });
  },
});

export function enqueueWaveformGeneration(
  mediaId: string,
  inputPath: string,
  options: { stepMs?: number; sampleRate?: number } = {},
) {
  useTimelineStore.getState().updateMedia(mediaId, {
    waveformStatus: "pending",
    waveformError: undefined,
    waveformUpdatedAt: new Date().toISOString(),
  });

  return waveformQueue.enqueue<WaveformTaskPayload>({
    id: `waveform_${mediaId}_${Date.now()}`,
    type: "waveform:generate",
    payload: {
      mediaId,
      inputPath,
      stepMs: options.stepMs,
      sampleRate: options.sampleRate,
    },
    priority: 5,
    maxRetries: 1,
  });
}
