/**
 * 项目管理工具。
 * 负责 `.hpve` 项目的保存、加载、校验与 JSON 导入导出。
 */
import { invoke } from "@tauri-apps/api/core";
import type { ProjectData as StoreProjectData, Track } from "@/store/timelineStore";
import { compressClips, decompressClips } from "@/utils/timeline/clipCompression";
import { migrateProjectMediaModel } from "./projectMigration";

export type ProjectData = StoreProjectData;

export interface SaveOptions {
  password?: string;
  compress?: boolean;
  includeCache?: boolean;
}

const compressTracks = (tracks: Track[]): Track[] =>
  tracks.map((track) => ({
    ...track,
    clips: compressClips(track.clips),
  }));

const decompressTracks = (tracks: Track[]): Track[] =>
  tracks.map((track) => ({
    ...track,
    clips: decompressClips(track.clips),
  }));

const buildError = (message: string, error: unknown): Error =>
  new Error(message, {
    cause: error instanceof Error ? error : undefined,
  });

/**
 * 保存项目到 .hpve 文件
 */
export async function saveProject(
  projectData: ProjectData,
  filePath: string,
  options: SaveOptions = {},
): Promise<void> {
  try {
    const migratedProject = migrateProjectMediaModel(projectData);
    const shouldCompress = options.compress ?? true;
    const originalClipCount = migratedProject.tracks.reduce(
      (sum, track) => sum + track.clips.length,
      0,
    );
    const compressedTracks = shouldCompress
      ? compressTracks(migratedProject.tracks)
      : migratedProject.tracks;
    const compressedClipCount = compressedTracks.reduce(
      (sum, track) => sum + track.clips.length,
      0,
    );

    // compressionInfo 与最终写盘内容复用同一份压缩结果，避免重复计算造成统计偏差。
    const dataToSave: ProjectData = shouldCompress
      ? {
          ...migratedProject,
          tracks: compressedTracks,
          compressionInfo: {
            enabled: true,
            originalClipCount,
            compressedClipCount,
            compressionRatio: originalClipCount === 0 ? 1 : compressedClipCount / originalClipCount,
          },
        }
      : {
          ...migratedProject,
          compressionInfo: {
            enabled: false,
            originalClipCount,
            compressedClipCount,
            compressionRatio: 1,
          },
        };

    await invoke("save_project", {
      projectData: dataToSave,
      filePath,
      password: options.password,
      compress: shouldCompress,
    });
  } catch (error) {
    throw buildError(`Failed to save project: ${String(error)}`, error);
  }
}

/**
 * 加载项目从 .hpve 文件
 */
export async function loadProject(filePath: string, password?: string): Promise<ProjectData> {
  try {
    const projectData = await invoke<ProjectData>("load_project", {
      filePath,
      password,
    });
    const migratedProject = migrateProjectMediaModel(projectData);
    return {
      ...migratedProject,
      tracks: decompressTracks(migratedProject.tracks),
    };
  } catch (error) {
    throw buildError(`Failed to load project: ${String(error)}`, error);
  }
}

/**
 * 从 JSON 导入项目
 */
export function importProjectFromJson(jsonString: string): ProjectData {
  try {
    const projectData = JSON.parse(jsonString) as ProjectData;
    const migratedProject = migrateProjectMediaModel(projectData);
    return {
      ...migratedProject,
      tracks: decompressTracks(migratedProject.tracks),
    };
  } catch (error) {
    throw buildError(`Failed to parse project JSON: ${String(error)}`, error);
  }
}

/**
 * 验证 .hpve 文件格式
 */
export async function validateHpveFile(filePath: string): Promise<boolean> {
  try {
    const isValid = await invoke<boolean>("validate_hpve_file", {
      filePath,
    });
    return isValid;
  } catch (error) {
    console.error(`Failed to validate file: ${error}`);
    return false;
  }
}

/**
 * 创建新项目数据结构
 */
export function createNewProject(name: string): ProjectData {
  return {
    metadata: {
      name,
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    },
    timeline: {
      fps: 30,
      resolution: {
        width: 1920,
        height: 1080,
      },
      duration: 0,
      playheadPosition: 0,
    },
    tracks: [],
    media: [],
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
  };
}

/**
 * 导出项目为 JSON（用于调试）
 */
export function exportProjectAsJson(projectData: ProjectData): string {
  return JSON.stringify(projectData, null, 2);
}
