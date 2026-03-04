/**
 * 代理媒体生成入口。
 * 封装对 Tauri `generate_proxy_video` 命令的调用。
 */
import { invoke } from "@tauri-apps/api/core";
import type { ProxyProfile } from "@/store/timelineStore";

export interface GenerateProxyInput {
  inputPath: string;
  mediaId: string;
  profile: ProxyProfile;
}

export async function generateProxyVideo(input: GenerateProxyInput): Promise<string> {
  const proxyPath = await invoke<string>("generate_proxy_video", {
    inputPath: input.inputPath,
    mediaId: input.mediaId,
    profile: input.profile,
  });
  return proxyPath;
}
