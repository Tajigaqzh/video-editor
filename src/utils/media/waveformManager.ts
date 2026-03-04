/**
 * 波形生成入口。
 * 负责将前端参数映射到 Tauri `generate_waveform` 命令。
 */
import { invoke } from "@tauri-apps/api/core";

export interface GenerateWaveformInput {
  inputPath: string;
  mediaId: string;
  stepMs?: number;
  sampleRate?: number;
}

export async function generateWaveform(input: GenerateWaveformInput): Promise<string> {
  const waveformPath = await invoke<string>("generate_waveform", {
    inputPath: input.inputPath,
    mediaId: input.mediaId,
    stepMs: input.stepMs ?? 20,
    sampleRate: input.sampleRate ?? 44_100,
  });
  return waveformPath;
}
