// 支持的媒体文件扩展名
export const MEDIA_EXTENSIONS = {
  VIDEO: ["mp4", "mov", "avi", "mkv", "webm"],
  AUDIO: ["mp3", "wav", "aac", "flac", "ogg"],
  IMAGE: ["jpg", "jpeg", "png", "gif", "webp", "bmp"],
} as const;

// 所有支持的扩展名（用于文件选择器）
export const ALL_SUPPORT_MEDIA_EXTENSIONS = [
  ...MEDIA_EXTENSIONS.VIDEO,
  ...MEDIA_EXTENSIONS.AUDIO,
  ...MEDIA_EXTENSIONS.IMAGE,
];

// 媒体类型
export type MediaType = "video" | "audio" | "image" | "unknown";
