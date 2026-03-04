import { create } from "zustand";

// ============ HPVE 规范数据结构 ============

export type TrackType = "video" | "audio" | "text";
export type MediaType = "video" | "audio" | "image";
export type ProxyStatus = "none" | "pending" | "processing" | "ready" | "failed";
export type ProxyProfile = "low" | "medium" | "high";
export type WaveformStatus = "none" | "pending" | "processing" | "ready" | "failed";
export type ThumbnailStatus = "none" | "pending" | "processing" | "ready" | "failed";

// Media (媒体)
export interface Media {
  id: string;
  name: string;
  type: MediaType;
  path: string; // temp 文件夹中的相对路径
  originalPath?: string; // 原始文件路径（用于 FFmpeg）
  duration: number;
  width?: number;
  height?: number;
  fps?: number;
  codec?: string;
  fileSize: number;
  createdAt: string;
  sampleRate?: number;
  channels?: number;
  proxyPath?: string;
  proxyStatus?: ProxyStatus;
  proxyProfile?: ProxyProfile;
  proxyError?: string;
  proxyUpdatedAt?: string;
  waveformPath?: string;
  waveformStatus?: WaveformStatus;
  waveformError?: string;
  waveformUpdatedAt?: string;
  thumbnailPath?: string;
  thumbnailDir?: string;
  thumbnailStatus?: ThumbnailStatus;
  thumbnailError?: string;
  thumbnailUpdatedAt?: string;
}

// Effect (特效)
export interface Effect {
  id: string;
  type: string;
  enabled: boolean;
  startTime?: number;
  duration?: number;
  params: Record<string, any>;
}

// Clip (片段) - 符合 HPVE 规范
export type RepeatMode = "sequential" | "pattern";

export interface Clip {
  id: string;
  mediaId: string;
  trackId: string;
  startTime: number; // 时间线上的开始时间
  duration: number; // 片段在时间线上的时长
  trimStart: number; // 素材的入点
  trimEnd: number; // 素材的出点
  thumbnailUrl?: string; // 兼容旧渲染组件与历史测试数据（可选）
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
  opacity: number;
  effects: Effect[];
  repeatCount?: number;
  repeatMode?: RepeatMode;
  originalClipIds?: string[];
}

// Transition (转场)
export interface Transition {
  id: string;
  type: string;
  duration: number;
  fromClipId: string;
  toClipId: string;
  params: Record<string, any>;
}

// Track (轨道) - 符合 HPVE 规范
export interface Track {
  id: string;
  name: string;
  type: TrackType;
  order: number;
  height: number;
  visible: boolean;
  locked: boolean;
  clips: Clip[];
  transitions: Transition[];
}

// Timeline (时间线)
export interface Timeline {
  fps: number;
  resolution: { width: number; height: number };
  duration: number;
  playheadPosition: number;
}

// Settings (设置)
export interface Settings {
  autoSave: boolean;
  autoSaveInterval: number;
  snapToGrid: boolean;
  snapThreshold: number;
  showRuler: boolean;
  showGuides: boolean;
  defaultTransitionDuration: number;
  theme: string;
}

// Project Metadata (项目元数据)
export interface ProjectMetadata {
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  modifiedAt: string;
}

// Project Data (完整项目数据)
export interface ProjectData {
  metadata: ProjectMetadata;
  timeline: Timeline;
  media: Media[];
  tracks: Track[];
  settings: Settings;
  history: {
    undoStack: any[];
    redoStack: any[];
    maxHistorySize: number;
  };
  compressionInfo?: {
    enabled: boolean;
    originalClipCount: number;
    compressedClipCount: number;
    compressionRatio: number;
    savedBytes?: number;
    description?: string;
  };
}

// ============ UI 状态 ============

export interface DragState {
  isDragging: boolean;
  dragType: "move" | "trim-left" | "trim-right" | "add" | null;
  clipId?: string;
  startX: number;
  startTime: number;
  originalDuration?: number;
}

export interface TimelineConfig {
  pixelsPerSecond: number;
  minZoom: number;
  maxZoom: number;
  snapThreshold: number;
  trackHeight: number;
  minClipDuration: number;
}

// ============ Store 接口 ============

interface TimelineStore {
  // 项目数据
  project: ProjectData;

  // UI 状态
  playheadPosition: number;
  zoomLevel: number;
  snapEnabled: boolean;
  selectedClipIds: string[];
  dragState: DragState;
  config: TimelineConfig;

  // 项目操作
  setProject: (project: ProjectData) => void;
  createNewProject: (name: string) => void;

  // 媒体操作
  addMedia: (media: Media) => void;
  updateMedia: (mediaId: string, updates: Partial<Media>) => void;
  removeMedia: (mediaId: string) => void;

  // 轨道操作
  addTrack: (type: TrackType) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;

  // 片段操作
  addClip: (clip: Clip) => void;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  removeClip: (clipId: string) => void;
  removeClips: (clipIds: string[]) => void;
  splitClipsAtPlayhead: () => number;

  // 特效操作
  addEffect: (clipId: string, effect: Effect) => void;
  updateEffect: (clipId: string, effectId: string, updates: Partial<Effect>) => void;
  removeEffect: (clipId: string, effectId: string) => void;

  // 转场操作
  addTransition: (trackId: string, transition: Transition) => void;
  removeTransition: (trackId: string, transitionId: string) => void;

  // UI 操作
  setPlayheadPosition: (position: number) => void;
  setZoomLevel: (level: number) => void;
  toggleSnap: () => void;
  selectClip: (clipId: string, multi: boolean) => void;
  clearSelection: () => void;
  setDragState: (state: Partial<DragState>) => void;

  // 查询
  getClipsByTrack: (trackId: string) => Clip[];
  getTotalDuration: () => number;
  getClipAtPosition: (trackId: string, time: number) => Clip | null;
  getMediaById: (mediaId: string) => Media | undefined;
  getTrackById: (trackId: string) => Track | undefined;
}

// ============ 默认配置 ============

const defaultConfig: TimelineConfig = {
  pixelsPerSecond: 50,
  minZoom: 10,
  maxZoom: 200,
  snapThreshold: 5,
  trackHeight: 80,
  minClipDuration: 0.1,
};

const defaultDragState: DragState = {
  isDragging: false,
  dragType: null,
  startX: 0,
  startTime: 0,
};

const generateId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createDefaultProject = (name: string): ProjectData => ({
  metadata: {
    name,
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
  },
  timeline: {
    fps: 30,
    resolution: { width: 1920, height: 1080 },
    duration: 0,
    playheadPosition: 0,
  },
  media: [],
  tracks: [
    {
      id: generateId("track_video"),
      name: "视频 1",
      type: "video",
      order: 2,
      height: defaultConfig.trackHeight,
      visible: true,
      locked: false,
      clips: [],
      transitions: [],
    },
    {
      id: generateId("track_audio"),
      name: "音频 1",
      type: "audio",
      order: 1,
      height: defaultConfig.trackHeight,
      visible: true,
      locked: false,
      clips: [],
      transitions: [],
    },
  ],
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

// ============ Store 实现 ============

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  project: createDefaultProject("Untitled Project"),
  playheadPosition: 0,
  zoomLevel: defaultConfig.pixelsPerSecond,
  snapEnabled: true,
  selectedClipIds: [],
  dragState: defaultDragState,
  config: defaultConfig,

  // 项目操作
  setProject: (project: ProjectData) => {
    set({ project });
  },

  createNewProject: (name: string) => {
    set({ project: createDefaultProject(name) });
  },

  // 媒体操作
  addMedia: (media: Media) => {
    set((state) => ({
      project: {
        ...state.project,
        media: [...state.project.media, media],
      },
    }));
  },

  updateMedia: (mediaId: string, updates: Partial<Media>) => {
    set((state) => ({
      project: {
        ...state.project,
        media: state.project.media.map((m) => (m.id === mediaId ? { ...m, ...updates } : m)),
      },
    }));
  },

  removeMedia: (mediaId: string) => {
    set((state) => ({
      project: {
        ...state.project,
        media: state.project.media.filter((m) => m.id !== mediaId),
      },
    }));
  },

  // 轨道操作
  addTrack: (type: TrackType) => {
    set((state) => {
      const tracks = state.project.tracks.filter((t) => t.type === type);
      const maxOrder = tracks.length > 0 ? Math.max(...tracks.map((t) => t.order)) : 0;

      const newTrack: Track = {
        id: generateId("track"),
        name: type === "video" ? `视频 ${tracks.length + 1}` : `音频 ${tracks.length + 1}`,
        type,
        order: maxOrder + 1,
        height: state.config.trackHeight,
        visible: true,
        locked: false,
        clips: [],
        transitions: [],
      };

      return {
        project: {
          ...state.project,
          tracks: [...state.project.tracks, newTrack],
        },
      };
    });
  },

  removeTrack: (trackId: string) => {
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.filter((t) => t.id !== trackId),
      },
    }));
  },

  updateTrack: (trackId: string, updates: Partial<Track>) => {
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((track) =>
          track.id === trackId ? { ...track, ...updates } : track,
        ),
      },
    }));
  },

  // 片段操作
  addClip: (clip: Clip) => {
    set((state) => {
      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map((track) =>
            track.id === clip.trackId ? { ...track, clips: [...track.clips, clip] } : track,
          ),
        },
      };
    });
  },

  updateClip: (clipId: string, updates: Partial<Clip>) => {
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((track) => ({
          ...track,
          clips: track.clips.map((clip) => (clip.id === clipId ? { ...clip, ...updates } : clip)),
        })),
      },
    }));
  },

  removeClip: (clipId: string) => {
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((track) => ({
          ...track,
          clips: track.clips.filter((c) => c.id !== clipId),
        })),
      },
      selectedClipIds: state.selectedClipIds.filter((id) => id !== clipId),
    }));
  },

  removeClips: (clipIds: string[]) => {
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((track) => ({
          ...track,
          clips: track.clips.filter((c) => !clipIds.includes(c.id)),
        })),
      },
      selectedClipIds: state.selectedClipIds.filter((id) => !clipIds.includes(id)),
    }));
  },

  splitClipsAtPlayhead: () => {
    const splitTime = get().playheadPosition;
    const epsilon = 1e-6;
    let splitCount = 0;

    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((track) => {
          if (track.locked) {
            return track;
          }

          const nextClips: Clip[] = [];
          for (const clip of track.clips) {
            const clipStart = clip.startTime;
            const clipEnd = clip.startTime + clip.duration;
            const canSplit = splitTime > clipStart + epsilon && splitTime < clipEnd - epsilon;

            if (!canSplit) {
              nextClips.push(clip);
              continue;
            }

            const leftDuration = splitTime - clipStart;
            const rightDuration = clipEnd - splitTime;
            const splitTrim = clip.trimStart + leftDuration;

            const leftClip: Clip = {
              ...clip,
              duration: leftDuration,
              trimEnd: splitTrim,
            };

            const rightClip: Clip = {
              ...clip,
              id: generateId("clip"),
              startTime: splitTime,
              duration: rightDuration,
              trimStart: splitTrim,
            };

            nextClips.push(leftClip, rightClip);
            splitCount += 1;
          }

          return {
            ...track,
            clips: nextClips,
          };
        }),
      },
    }));

    return splitCount;
  },

  // 特效操作
  addEffect: (clipId: string, effect: Effect) => {
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((track) => ({
          ...track,
          clips: track.clips.map((clip) =>
            clip.id === clipId ? { ...clip, effects: [...clip.effects, effect] } : clip,
          ),
        })),
      },
    }));
  },

  updateEffect: (clipId: string, effectId: string, updates: Partial<Effect>) => {
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((track) => ({
          ...track,
          clips: track.clips.map((clip) =>
            clip.id === clipId
              ? {
                  ...clip,
                  effects: clip.effects.map((e) => (e.id === effectId ? { ...e, ...updates } : e)),
                }
              : clip,
          ),
        })),
      },
    }));
  },

  removeEffect: (clipId: string, effectId: string) => {
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((track) => ({
          ...track,
          clips: track.clips.map((clip) =>
            clip.id === clipId
              ? { ...clip, effects: clip.effects.filter((e) => e.id !== effectId) }
              : clip,
          ),
        })),
      },
    }));
  },

  // 转场操作
  addTransition: (trackId: string, transition: Transition) => {
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((track) =>
          track.id === trackId
            ? { ...track, transitions: [...track.transitions, transition] }
            : track,
        ),
      },
    }));
  },

  removeTransition: (trackId: string, transitionId: string) => {
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((track) =>
          track.id === trackId
            ? { ...track, transitions: track.transitions.filter((t) => t.id !== transitionId) }
            : track,
        ),
      },
    }));
  },

  // UI 操作
  setPlayheadPosition: (position: number) => {
    set((state) => ({
      project: {
        ...state.project,
        timeline: {
          ...state.project.timeline,
          playheadPosition: Math.max(0, position),
        },
      },
      playheadPosition: Math.max(0, position),
    }));
  },

  setZoomLevel: (level: number) => {
    set((state) => ({
      zoomLevel: Math.max(state.config.minZoom, Math.min(state.config.maxZoom, level)),
    }));
  },

  toggleSnap: () => {
    set((state) => ({ snapEnabled: !state.snapEnabled }));
  },

  selectClip: (clipId: string, multi: boolean) => {
    set((state) => {
      if (multi) {
        const isSelected = state.selectedClipIds.includes(clipId);
        return {
          selectedClipIds: isSelected
            ? state.selectedClipIds.filter((id) => id !== clipId)
            : [...state.selectedClipIds, clipId],
        };
      } else {
        return { selectedClipIds: [clipId] };
      }
    });
  },

  clearSelection: () => {
    set({ selectedClipIds: [] });
  },

  setDragState: (state: Partial<DragState>) => {
    set((prevState) => ({
      dragState: { ...prevState.dragState, ...state },
    }));
  },

  // 查询
  getClipsByTrack: (trackId: string) => {
    const track = get().project.tracks.find((t) => t.id === trackId);
    return track?.clips || [];
  },

  getTotalDuration: () => {
    const { project } = get();
    let maxDuration = 0;

    project.tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const endTime = clip.startTime + clip.duration;
        maxDuration = Math.max(maxDuration, endTime);
      });
    });

    return maxDuration;
  },

  getClipAtPosition: (trackId: string, time: number) => {
    const clips = get().getClipsByTrack(trackId);
    return (
      clips.find((clip) => {
        const endTime = clip.startTime + clip.duration;
        return time >= clip.startTime && time < endTime;
      }) || null
    );
  },

  getMediaById: (mediaId: string) => {
    return get().project.media.find((m) => m.id === mediaId);
  },

  getTrackById: (trackId: string) => {
    return get().project.tracks.find((t) => t.id === trackId);
  },
}));
