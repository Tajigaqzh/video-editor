import { TaskQueue } from "@/utils/queue/taskQueue";
import { generateProxyVideo } from "@/utils/media/proxyManager";
import { useTimelineStore, type ProxyProfile } from "@/store/timelineStore";
import { listen } from "@tauri-apps/api/event";

type ProxyTaskPayload = {
  mediaId: string;
  inputPath: string;
  profile: ProxyProfile;
};

export const proxyQueue = new TaskQueue({ concurrency: 2 });
const mediaTaskIndex = new Map<string, string>();
let progressListenerReady = false;

type ProxyProgressEvent = {
  media_id: string;
  progress: number;
};

async function ensureProgressListener() {
  if (progressListenerReady) return;
  progressListenerReady = true;

  await listen<ProxyProgressEvent>("proxy-progress", (event) => {
    const payload = event.payload;
    if (!payload) return;
    const taskId = mediaTaskIndex.get(payload.media_id);
    if (!taskId) return;
    proxyQueue.setProgress(taskId, payload.progress);
    useTimelineStore.getState().updateMedia(payload.media_id, {
      proxyStatus: "processing",
      proxyUpdatedAt: new Date().toISOString(),
    });
  });
}

proxyQueue.registerTaskType<ProxyTaskPayload, string>("proxy:transcode", {
  run: async (task, signal) => {
    if (signal.aborted) throw new Error("Proxy task aborted");
    const payload = task.payload;
    if (!payload) throw new Error("Missing proxy task payload");

    const store = useTimelineStore.getState();
    store.updateMedia(payload.mediaId, {
      proxyStatus: "processing",
      proxyProfile: payload.profile,
      proxyError: undefined,
      proxyUpdatedAt: new Date().toISOString(),
    });

    const proxyPath = await generateProxyVideo({
      inputPath: payload.inputPath,
      mediaId: payload.mediaId,
      profile: payload.profile,
    });

    return proxyPath;
  },
  onDone: (task, proxyPath) => {
    const payload = task.payload;
    if (!payload) return;
    mediaTaskIndex.delete(payload.mediaId);
    useTimelineStore.getState().updateMedia(payload.mediaId, {
      proxyPath,
      proxyStatus: "ready",
      proxyUpdatedAt: new Date().toISOString(),
    });
  },
  onError: (task, error) => {
    const payload = task.payload;
    if (!payload) return;
    mediaTaskIndex.delete(payload.mediaId);
    useTimelineStore.getState().updateMedia(payload.mediaId, {
      proxyStatus: "failed",
      proxyError: error.message,
      proxyUpdatedAt: new Date().toISOString(),
    });
  },
});

export function enqueueProxyTranscode(
  mediaId: string,
  inputPath: string,
  profile: ProxyProfile = "medium",
) {
  void ensureProgressListener();

  useTimelineStore.getState().updateMedia(mediaId, {
    proxyStatus: "pending",
    proxyProfile: profile,
    proxyError: undefined,
    proxyUpdatedAt: new Date().toISOString(),
  });

  const task = proxyQueue.enqueue<ProxyTaskPayload>({
    id: `proxy_${mediaId}_${profile}_${Date.now()}`,
    type: "proxy:transcode",
    payload: { mediaId, inputPath, profile },
    priority: 10,
    maxRetries: 1,
  });
  mediaTaskIndex.set(mediaId, task.id);
  return task;
}
