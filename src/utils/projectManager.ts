import { invoke } from '@tauri-apps/api/core';

/**
 * 项目管理工具
 * 用于保存和加载 .hpve 格式的视频编辑项目
 */

export interface ProjectData {
  metadata: {
    name: string;
    description?: string;
    version: string;
    createdAt: string;
    modifiedAt: string;
  };
  timeline: {
    fps: number;
    resolution: {
      width: number;
      height: number;
    };
    duration: number;
  };
  tracks: any[];
  media: any[];
  [key: string]: any;
}

export interface SaveOptions {
  password?: string;
  compress?: boolean;
  includeCache?: boolean;
}

/**
 * 保存项目到 .hpve 文件
 */
export async function saveProject(
  projectData: ProjectData,
  filePath: string,
  options: SaveOptions = {}
): Promise<void> {
  try {
    await invoke('save_project', {
      projectData,
      filePath,
      password: options.password,
      compress: options.compress ?? true,
    });
  } catch (error) {
    throw new Error(`Failed to save project: ${error}`);
  }
}

/**
 * 加载项目从 .hpve 文件
 */
export async function loadProject(
  filePath: string,
  password?: string
): Promise<ProjectData> {
  try {
    const projectData = await invoke<ProjectData>('load_project', {
      filePath,
      password,
    });
    return projectData;
  } catch (error) {
    throw new Error(`Failed to load project: ${error}`);
  }
}

/**
 * 验证 .hpve 文件格式
 */
export async function validateHpveFile(filePath: string): Promise<boolean> {
  try {
    const isValid = await invoke<boolean>('validate_hpve_file', {
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
      version: '1.0.0',
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
    },
    tracks: [],
    media: [],
  };
}

/**
 * 导出项目为 JSON（用于调试）
 */
export function exportProjectAsJson(projectData: ProjectData): string {
  return JSON.stringify(projectData, null, 2);
}

/**
 * 从 JSON 导入项目
 */
export function importProjectFromJson(jsonString: string): ProjectData {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error(`Failed to parse project JSON: ${error}`);
  }
}
