/**
 * 代理清晰度策略工具。
 * 综合手动配置、设备性能与源视频尺寸，返回最终代理档位。
 */
import type { Media, ProxyProfile } from "@/store/timelineStore";

const MANUAL_PROXY_PROFILE_KEY = "video_editor.proxy_profile_override";

function getNavigatorInfo() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { hardwareConcurrency: 8, deviceMemory: 8 };
  }

  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    hardwareConcurrency: nav.hardwareConcurrency ?? 8,
    deviceMemory: nav.deviceMemory ?? 8,
  };
}

export function getManualProxyProfile(): ProxyProfile | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem(MANUAL_PROXY_PROFILE_KEY);
  if (raw === "low" || raw === "medium" || raw === "high") return raw;
  return undefined;
}

export function setManualProxyProfile(profile?: ProxyProfile) {
  if (typeof window === "undefined") return;
  if (!profile) {
    window.localStorage.removeItem(MANUAL_PROXY_PROFILE_KEY);
    return;
  }
  window.localStorage.setItem(MANUAL_PROXY_PROFILE_KEY, profile);
}

export function selectProxyProfileForMedia(media: Pick<Media, "width" | "height">): ProxyProfile {
  const manualProfile = getManualProxyProfile();
  if (manualProfile) return manualProfile;

  const { hardwareConcurrency, deviceMemory } = getNavigatorInfo();
  const sourceMaxSize = Math.max(media.width ?? 0, media.height ?? 0);

  let profile: ProxyProfile = "medium";
  if (hardwareConcurrency <= 4 || deviceMemory <= 4) {
    profile = "low";
  } else if (hardwareConcurrency >= 12 && deviceMemory >= 12) {
    profile = "high";
  }

  // 对小分辨率源做上限限制，避免代理分辨率反向高于源素材。
  if (sourceMaxSize > 0 && sourceMaxSize < 1280) {
    return "low";
  }
  if (sourceMaxSize > 0 && sourceMaxSize < 1920 && profile === "high") {
    return "medium";
  }

  return profile;
}
