/**
 * 关键帧插值工具。
 * 提供关键帧排序归一化、线性/缓动插值与数值采样能力。
 */

export type KeyframeEasing = "linear" | "ease-in" | "ease-out" | "ease-in-out";

export interface Keyframe {
  time: number;
  value: number;
  easing?: KeyframeEasing;
}

const EPSILON = 1e-9;

const easingMap: Record<KeyframeEasing, (t: number) => number> = {
  linear: (t) => t,
  "ease-in": (t) => t * t,
  "ease-out": (t) => 1 - (1 - t) * (1 - t),
  "ease-in-out": (t) => {
    if (t < 0.5) return 2 * t * t;
    return 1 - Math.pow(-2 * t + 2, 2) / 2;
  },
};

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

/**
 * 将关键帧按时间升序排序；同一时间戳保留最后一个定义，确保结果稳定可复现。
 */
export function normalizeKeyframes(keyframes: Keyframe[]): Keyframe[] {
  const sorted = keyframes.toSorted((a, b) => a.time - b.time);
  const normalized: Keyframe[] = [];

  for (const frame of sorted) {
    const last = normalized[normalized.length - 1];
    if (last && Math.abs(last.time - frame.time) <= EPSILON) {
      normalized[normalized.length - 1] = frame;
      continue;
    }
    normalized.push(frame);
  }

  return normalized;
}

/**
 * 在指定时间采样关键帧值。
 * - 时间早于首帧：返回首帧值
 * - 时间晚于末帧：返回末帧值
 * - 时间位于两帧之间：按前一帧 easing 插值
 */
export function interpolateKeyframes(keyframes: Keyframe[], time: number): number {
  const frames = normalizeKeyframes(keyframes);
  if (frames.length === 0) return 0;
  if (frames.length === 1) return frames[0].value;

  if (time <= frames[0].time) {
    return frames[0].value;
  }

  const last = frames[frames.length - 1];
  if (time >= last.time) {
    return last.value;
  }

  for (let i = 0; i < frames.length - 1; i += 1) {
    const from = frames[i];
    const to = frames[i + 1];

    if (time < from.time || time > to.time) {
      continue;
    }

    const duration = to.time - from.time;
    if (duration <= EPSILON) {
      return to.value;
    }

    const progress = clamp01((time - from.time) / duration);
    const easing = easingMap[from.easing ?? "linear"];
    const easedProgress = easing(progress);

    return from.value + (to.value - from.value) * easedProgress;
  }

  return last.value;
}
