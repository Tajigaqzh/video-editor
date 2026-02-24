import { MEDIA_EXTENSIONS, MediaType } from "@/constants/media";

/**
 * 根据文件路径获取媒体类型
 */
export const getFileType = (path: string): MediaType => {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  
  if ((MEDIA_EXTENSIONS.VIDEO as readonly string[]).includes(ext)) return "video";
  if ((MEDIA_EXTENSIONS.AUDIO as readonly string[]).includes(ext)) return "audio";
  if ((MEDIA_EXTENSIONS.IMAGE as readonly string[]).includes(ext)) return "image";
  
  return "unknown";
};

/**
 * 根据文件名获取不带扩展名的名称
 */
export const getFileName = (path: string): string => {
  if (!path) return "Unknown";
  
  // 统一处理路径分隔符，支持 Unix 和 Windows 路径
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const filename = parts[parts.length - 1];
  
  return filename || "Unknown";
};
