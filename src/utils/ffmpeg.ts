import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate: number;
  has_audio: boolean;
}

/**
 * 初始化 FFmpeg
 */
export async function initFFmpeg(): Promise<void> {
  await invoke('init_ffmpeg');
}

/**
 * 获取视频信息
 */
export async function getVideoInfo(path: string): Promise<VideoInfo> {
  return await invoke('get_video_info', { path });
}

/**
 * 提取视频帧（返回可用于 img src 的 URL）
 */
export async function extractVideoFrame(path: string, timestamp: number): Promise<string> {
  console.log(`🎬 开始提取视频帧: ${path} @ ${timestamp.toFixed(2)}s`);
  const startTime = performance.now();
  
  // 调用 Tauri 命令提取帧到临时文件
  const tempFilePath = await invoke<string>('extract_frame_to_temp', { 
    path, 
    timestamp 
  });
  
  const duration = performance.now() - startTime;
  console.log(`✅ 帧提取完成，耗时: ${duration.toFixed(0)}ms`);
  
  // 转换为 asset:// 协议的 URL
  return convertFileSrc(tempFilePath);
}

/**
 * 提取视频帧到指定路径
 */
export async function extractFrameToFile(
  path: string, 
  timestamp: number, 
  outputPath: string
): Promise<void> {
  await invoke('extract_frame', { path, timestamp, outputPath });
}

/**
 * 裁剪视频
 */
export async function trimVideo(
  inputPath: string,
  start: number,
  duration: number,
  outputPath: string
): Promise<void> {
  await invoke('trim_video', { inputPath, start, duration, outputPath });
}

/**
 * 合并多个视频
 */
export async function mergeVideos(
  inputPaths: string[],
  outputPath: string
): Promise<void> {
  await invoke('merge_videos', { inputPaths, outputPath });
}
