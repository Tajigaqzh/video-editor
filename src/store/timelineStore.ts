import { create } from 'zustand';

// 轨道类型
export type TrackType = 'video' | 'audio';

// 轨道接口
export interface Track {
  id: string;
  name: string;
  type: TrackType;
  order: number;  // 显示顺序，数字越大越靠上
  height: number; // 轨道高度（像素）
}

// 片段接口
export interface Clip {
  id: string;
  trackId: string;
  mediaId: string;        // 关联的媒体文件 ID
  startTime: number;      // 在时间轴上的开始时间（秒）
  duration: number;       // 片段持续时间（秒）
  trimStart: number;      // 素材的入点（秒）
  trimEnd: number;        // 素材的出点（秒）
  thumbnailUrl?: string;  // 缩略图 URL (asset:// 协议)
  filePath?: string;      // 原始文件路径（用于 FFmpeg）
}

// 时间轴配置
export interface TimelineConfig {
  pixelsPerSecond: number;  // 缩放级别：每秒对应的像素数
  minZoom: number;          // 最小缩放级别（10 px/s）
  maxZoom: number;          // 最大缩放级别（200 px/s）
  snapThreshold: number;    // 吸附阈值（像素）
  trackHeight: number;      // 默认轨道高度
  minClipDuration: number;  // 最小片段持续时间（秒）
}

// 拖动状态
export interface DragState {
  isDragging: boolean;
  dragType: 'move' | 'trim-left' | 'trim-right' | 'add' | null;
  clipId?: string;
  startX: number;
  startTime: number;
  originalDuration?: number;
}

// Timeline Store 接口
interface TimelineStore {
  // 状态
  tracks: Track[];
  clips: Clip[];
  playheadPosition: number;
  zoomLevel: number;
  snapEnabled: boolean;
  selectedClipIds: string[];
  dragState: DragState;
  config: TimelineConfig;
  
  // Actions
  addTrack: (type: TrackType) => void;
  removeTrack: (trackId: string) => void;
  addClip: (clip: Omit<Clip, 'id'>) => void;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  removeClip: (clipId: string) => void;
  removeClips: (clipIds: string[]) => void;
  setPlayheadPosition: (position: number) => void;
  setZoomLevel: (level: number) => void;
  toggleSnap: () => void;
  selectClip: (clipId: string, multi: boolean) => void;
  clearSelection: () => void;
  setDragState: (state: Partial<DragState>) => void;
  
  // Selectors
  getClipsByTrack: (trackId: string) => Clip[];
  getTotalDuration: () => number;
  getClipAtPosition: (trackId: string, time: number) => Clip | null;
}

// 默认配置
const defaultConfig: TimelineConfig = {
  pixelsPerSecond: 50,
  minZoom: 10,
  maxZoom: 200,
  snapThreshold: 5,
  trackHeight: 80,
  minClipDuration: 0.1,
};

// 默认拖动状态
const defaultDragState: DragState = {
  isDragging: false,
  dragType: null,
  startX: 0,
  startTime: 0,
};

// 生成唯一 ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// 创建 Timeline Store
export const useTimelineStore = create<TimelineStore>((set, get) => {
  // 初始化默认轨道
  const initializeTracks = (): Track[] => {
    return [
      {
        id: generateId(),
        name: '视频 1',
        type: 'video',
        order: 2,
        height: defaultConfig.trackHeight,
      },
      {
        id: generateId(),
        name: '音频 1',
        type: 'audio',
        order: 1,
        height: defaultConfig.trackHeight,
      },
    ];
  };

  return {
    // 初始状态 - 包含默认轨道
    tracks: initializeTracks(),
    clips: [],
    playheadPosition: 0,
    zoomLevel: defaultConfig.pixelsPerSecond,
    snapEnabled: true,
    selectedClipIds: [],
    dragState: defaultDragState,
    config: defaultConfig,
    
    // Actions
    addTrack: (type: TrackType) => {
    set((state) => {
      const tracks = state.tracks.filter(t => t.type === type);
      const maxOrder = tracks.length > 0 
        ? Math.max(...tracks.map(t => t.order))
        : 0;
      
      const newTrack: Track = {
        id: generateId(),
        name: type === 'video' ? `视频 ${tracks.length + 1}` : `音频 ${tracks.length + 1}`,
        type,
        order: maxOrder + 1,
        height: state.config.trackHeight,
      };
      
      return { tracks: [...state.tracks, newTrack] };
    });
  },
  
  removeTrack: (trackId: string) => {
    set((state) => ({
      tracks: state.tracks.filter(t => t.id !== trackId),
      clips: state.clips.filter(c => c.trackId !== trackId),
    }));
  },
  
  addClip: (clip: Omit<Clip, 'id'>) => {
    set((state) => {
      const newClip: Clip = {
        ...clip,
        id: generateId(),
      };
      
      return { clips: [...state.clips, newClip] };
    });
  },
  
  updateClip: (clipId: string, updates: Partial<Clip>) => {
    set((state) => ({
      clips: state.clips.map(clip =>
        clip.id === clipId ? { ...clip, ...updates } : clip
      ),
    }));
  },
  
  removeClip: (clipId: string) => {
    set((state) => ({
      clips: state.clips.filter(c => c.id !== clipId),
      selectedClipIds: state.selectedClipIds.filter(id => id !== clipId),
    }));
  },
  
  removeClips: (clipIds: string[]) => {
    set((state) => ({
      clips: state.clips.filter(c => !clipIds.includes(c.id)),
      selectedClipIds: state.selectedClipIds.filter(id => !clipIds.includes(id)),
    }));
  },
  
  setPlayheadPosition: (position: number) => {
    set({ playheadPosition: Math.max(0, position) });
  },
  
  setZoomLevel: (level: number) => {
    set((state) => ({
      zoomLevel: Math.max(
        state.config.minZoom,
        Math.min(state.config.maxZoom, level)
      ),
    }));
  },
  
  toggleSnap: () => {
    set((state) => ({ snapEnabled: !state.snapEnabled }));
  },
  
  selectClip: (clipId: string, multi: boolean) => {
    set((state) => {
      if (multi) {
        // 多选模式：切换选中状态
        const isSelected = state.selectedClipIds.includes(clipId);
        return {
          selectedClipIds: isSelected
            ? state.selectedClipIds.filter(id => id !== clipId)
            : [...state.selectedClipIds, clipId],
        };
      } else {
        // 单选模式：只选中当前片段
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
  
  // Selectors
  getClipsByTrack: (trackId: string) => {
    return get().clips.filter(clip => clip.trackId === trackId);
  },
  
  getTotalDuration: () => {
    const clips = get().clips;
    if (clips.length === 0) return 0;
    
    return Math.max(
      ...clips.map(clip => clip.startTime + clip.duration)
    );
  },
  
  getClipAtPosition: (trackId: string, time: number) => {
    const clips = get().clips.filter(clip => clip.trackId === trackId);
    
    return clips.find(clip => {
      const endTime = clip.startTime + clip.duration;
      return time >= clip.startTime && time < endTime;
    }) || null;
  },
};
});
