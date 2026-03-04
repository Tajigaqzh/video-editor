/**
 * 媒体管理：与 Tauri 后端交互的媒体文件操作工具。
 * 主要负责 temp 目录管理与媒体基础类型判断。
 */
import { invoke } from "@tauri-apps/api/core";

export interface TempCleanupOptions {
  maxSizeBytes?: number;
  ttlDays?: number;
}

const buildError = (message: string, error: unknown): Error =>
  new Error(message, {
    cause: error instanceof Error ? error : undefined,
  });

/**
 * 媒体文件管理工具
 * 用于复制媒体文件到应用 temp 文件夹
 * temp 文件夹位置: AppData/Local/video-editor/temp (Windows)
 *                 ~/.local/share/video-editor/temp (Linux)
 *                 ~/Library/Application Support/video-editor/temp (macOS)
 */

/**
 * 复制媒体文件到应用 temp 文件夹
 * @param sourcePath 源文件路径
 * @returns 相对路径 (temp/filename)
 */
export async function copyMediaToTemp(sourcePath: string): Promise<string> {
  try {
    const relativePath = await invoke<string>("copy_media_to_temp", {
      sourcePath,
    });
    return relativePath;
  } catch (error) {
    throw buildError(`Failed to copy media: ${String(error)}`, error);
  }
}

/**
 * 获取 temp 文件夹大小（字节）
 * @returns 文件夹大小（字节）
 */
export async function getTempSize(): Promise<number> {
  try {
    const size = await invoke<number>("get_temp_size");
    return size;
  } catch (error) {
    throw buildError(`Failed to get temp size: ${String(error)}`, error);
  }
}

/**
 * 清理 temp 文件夹中的过期文件
 * @param keepFiles 要保留的文件相对路径列表
 * @param options 可选清理策略（最大缓存大小 / TTL 天数）
 */
export async function cleanupTempFiles(
  keepFiles: string[],
  options: TempCleanupOptions = {},
): Promise<void> {
  try {
    await invoke("cleanup_temp_files", {
      keepFiles,
      maxSizeBytes: options.maxSizeBytes,
      ttlDays: options.ttlDays,
    });
  } catch (error) {
    throw buildError(`Failed to cleanup temp: ${String(error)}`, error);
  }
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * 获取文件扩展名
 * @param filePath 文件路径
 * @returns 扩展名（不含点）
 */
export function getFileExtension(filePath: string): string {
  const parts = filePath.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

/**
 * 判断是否为视频文件
 */
export function isVideoFile(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  const videoExts = ["mp4", "avi", "mov", "mkv", "flv", "wmv", "webm", "ts", "m3u8"];
  return videoExts.includes(ext);
}

/**
 * 判断是否为音频文件
 */
export function isAudioFile(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  const audioExts = ["mp3", "wav", "aac", "flac", "ogg", "m4a", "wma"];
  return audioExts.includes(ext);
}

/**
 * 判断是否为图片文件
 */
export function isImageFile(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"];
  return imageExts.includes(ext);
}

/**
 * 获取媒体文件类型
 */
export function getMediaType(filePath: string): "video" | "audio" | "image" | "unknown" {
  if (isVideoFile(filePath)) return "video";
  if (isAudioFile(filePath)) return "audio";
  if (isImageFile(filePath)) return "image";
  return "unknown";
}
