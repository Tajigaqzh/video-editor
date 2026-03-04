/**
 * 项目迁移工具。
 * 负责补齐历史项目缺失的媒体字段，统一到当前媒体模型。
 */
import type { Media, ProjectData, ProxyStatus } from "@/store/timelineStore";

const DEFAULT_PROXY_STATUS: ProxyStatus = "none";

const normalizeOriginalPath = (media: Media): string => {
  if (typeof media.originalPath === "string" && media.originalPath.trim().length > 0) {
    return media.originalPath;
  }
  return media.path;
};

const normalizeProxyStatus = (media: Media): ProxyStatus =>
  media.proxyStatus ?? DEFAULT_PROXY_STATUS;

const normalizeMedia = (media: Media): Media => ({
  ...media,
  originalPath: normalizeOriginalPath(media),
  proxyPath:
    typeof media.proxyPath === "string" && media.proxyPath.length > 0 ? media.proxyPath : undefined,
  proxyStatus: normalizeProxyStatus(media),
});

/**
 * 统一项目中的媒体字段结构，保证旧项目可读。
 */
export function migrateProjectMediaModel(projectData: ProjectData): ProjectData {
  return {
    ...projectData,
    media: projectData.media.map(normalizeMedia),
  };
}
