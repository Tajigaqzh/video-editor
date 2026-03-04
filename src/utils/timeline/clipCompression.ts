/**
 * 时间线片段压缩/解压工具。
 * 用于把连续重复片段压缩成 repeat 表达，减少项目存储体积。
 */
import type { Clip, RepeatMode } from "@/store/timelineStore";

const cloneClipWithoutRepeat = (clip: Clip): Clip => ({
  ...clip,
  repeatCount: undefined,
  repeatMode: undefined,
  originalClipIds: undefined,
});

const effectsEqual = (a: Clip["effects"], b: Clip["effects"]) =>
  JSON.stringify(a) === JSON.stringify(b);

const canMerge = (a: Clip, b: Clip) => {
  // 仅允许“严格等价且时间连续”的片段合并，避免行为语义发生变化。
  if (a.trackId !== b.trackId) return false;
  if (a.mediaId !== b.mediaId) return false;
  if (a.startTime + a.duration !== b.startTime) return false;
  if (a.duration !== b.duration) return false;
  if (a.trimStart !== b.trimStart) return false;
  if (a.trimEnd !== b.trimEnd) return false;
  if (a.rotation !== b.rotation) return false;
  if (a.opacity !== b.opacity) return false;
  if (JSON.stringify(a.position) !== JSON.stringify(b.position)) return false;
  if (JSON.stringify(a.scale) !== JSON.stringify(b.scale)) return false;
  if (!effectsEqual(a.effects, b.effects)) return false;
  return true;
};

export const compressClips = (clips: Clip[], mode: RepeatMode = "sequential"): Clip[] => {
  const byTrack = new Map<string, Clip[]>();
  clips.forEach((clip) => {
    const list = byTrack.get(clip.trackId) || [];
    list.push(clip);
    byTrack.set(clip.trackId, list);
  });

  const compressed: Clip[] = [];
  byTrack.forEach((trackClips) => {
    const ordered = trackClips.toSorted((a, b) => a.startTime - b.startTime);
    let i = 0;
    while (i < ordered.length) {
      const base = ordered[i];
      let repeatCount = 1;
      const originalClipIds = [base.id];

      // 贪心地向后扩展，直到遇到第一个不可合并片段。
      while (i + repeatCount < ordered.length) {
        const next = ordered[i + repeatCount];
        if (!canMerge(base, next)) break;
        originalClipIds.push(next.id);
        repeatCount++;
      }

      if (repeatCount > 1) {
        compressed.push({
          ...base,
          repeatCount,
          repeatMode: mode,
          originalClipIds,
        });
      } else {
        compressed.push(base);
      }

      i += repeatCount;
    }
  });

  return compressed;
};

export const decompressClips = (clips: Clip[]): Clip[] => {
  const decompressed: Clip[] = [];

  for (const clip of clips) {
    const repeatCount = clip.repeatCount || 1;
    if (repeatCount <= 1) {
      decompressed.push(clip);
      continue;
    }

    // 解压后保证每个片段都有稳定 id 与正确的时间偏移。
    for (let i = 0; i < repeatCount; i += 1) {
      const id = clip.originalClipIds?.[i] || `${clip.id}_${i}`;
      const startTime = clip.startTime + i * clip.duration;
      decompressed.push({
        ...cloneClipWithoutRepeat(clip),
        id,
        startTime,
      });
    }
  }

  return decompressed;
};
