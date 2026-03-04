/**
 * 时间线计算工具。
 * 提供时间/像素换算、刻度生成、碰撞检测与吸附位置计算。
 */

import type { Clip } from "@/store/timelineStore";

export interface TimeMarker {
  time: number;
  position: number;
  label: string;
  isMajor: boolean;
}

// Default snap threshold in pixels
export const DEFAULT_SNAP_THRESHOLD = 5;

/**
 * Convert time (seconds) to pixel position
 * @param time - Time in seconds
 * @param zoomLevel - Zoom level in pixels per second
 * @returns Pixel position
 */
export function timeToPixels(time: number, zoomLevel: number): number {
  return time * zoomLevel;
}

/**
 * Convert pixel position to time (seconds)
 * @param pixels - Pixel position
 * @param zoomLevel - Zoom level in pixels per second
 * @returns Time in seconds
 */
export function pixelsToTime(pixels: number, zoomLevel: number): number {
  return pixels / zoomLevel;
}

/**
 * Format time in MM:SS.mmm format
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

/**
 * Generate time markers for the timeline scale
 * @param duration - Total duration in seconds
 * @param zoomLevel - Zoom level in pixels per second
 * @param viewportWidth - Width of the viewport in pixels
 * @returns Array of time markers
 */
export function generateTimeMarks(
  duration: number,
  zoomLevel: number,
  viewportWidth: number,
): TimeMarker[] {
  void viewportWidth;
  // Determine interval based on zoom level
  let interval: number;
  if (zoomLevel >= 100) {
    interval = 1; // 1 second
  } else if (zoomLevel >= 50) {
    interval = 2; // 2 seconds
  } else if (zoomLevel >= 20) {
    interval = 5; // 5 seconds
  } else {
    interval = 10; // 10 seconds
  }

  const markers: TimeMarker[] = [];
  for (let time = 0; time <= duration; time += interval) {
    markers.push({
      time,
      position: timeToPixels(time, zoomLevel),
      label: formatTime(time),
      isMajor: time % (interval * 5) === 0,
    });
  }

  return markers;
}

/**
 * Check if a clip collides with other clips on the same track
 * @param clipId - ID of the clip being checked (to exclude from collision check)
 * @param trackId - ID of the track
 * @param startTime - Start time of the clip
 * @param duration - Duration of the clip
 * @param allClips - Array of all clips
 * @returns true if collision detected, false otherwise
 */
export function checkClipCollision(
  clipId: string,
  trackId: string,
  startTime: number,
  duration: number,
  allClips: Clip[],
): boolean {
  const endTime = startTime + duration;

  return allClips.some((otherClip) => {
    // Skip the clip itself
    if (otherClip.id === clipId) return false;

    // Only check clips on the same track
    if (otherClip.trackId !== trackId) return false;

    const otherStart = otherClip.startTime;
    const otherEnd = otherClip.startTime + otherClip.duration;

    // Check if time ranges overlap
    // Two ranges [a1, a2] and [b1, b2] overlap if NOT (a2 <= b1 OR a1 >= b2)
    return !(endTime <= otherStart || startTime >= otherEnd);
  });
}

/**
 * Calculate snapped position for a clip based on nearby clips and playhead
 * @param targetTime - Target time position
 * @param clipId - ID of the clip being moved (to exclude from snap targets)
 * @param trackId - ID of the track
 * @param duration - Duration of the clip
 * @param allClips - Array of all clips
 * @param playheadPosition - Current playhead position
 * @param snapEnabled - Whether snapping is enabled
 * @param snapThreshold - Snap threshold in pixels
 * @param zoomLevel - Current zoom level in pixels per second
 * @returns Snapped time position
 */
export function calculateSnapPosition(
  targetTime: number,
  clipId: string,
  trackId: string,
  duration: number,
  allClips: Clip[],
  playheadPosition: number,
  snapEnabled: boolean,
  snapThreshold: number,
  zoomLevel: number,
): number {
  if (!snapEnabled) return targetTime;

  // 将像素阈值换算到时间轴秒单位，保证不同缩放级别下吸附体验一致。
  const thresholdTime = snapThreshold / zoomLevel;
  const targetEndTime = targetTime + duration;

  let closestTime = targetTime;
  let minDistance = thresholdTime;

  // Check all clips on the same track
  const trackClips = allClips.filter((clip) => clip.trackId === trackId && clip.id !== clipId);

  for (const clip of trackClips) {
    const clipStart = clip.startTime;
    const clipEnd = clip.startTime + clip.duration;

    // Check snap to clip start (target clip start to other clip start)
    const distToClipStart = Math.abs(targetTime - clipStart);
    if (distToClipStart < minDistance) {
      minDistance = distToClipStart;
      closestTime = clipStart;
    }

    // Check snap to clip end (target clip start to other clip end)
    const distToClipEnd = Math.abs(targetTime - clipEnd);
    if (distToClipEnd < minDistance) {
      minDistance = distToClipEnd;
      closestTime = clipEnd;
    }

    // Check snap target clip end to other clip start
    const distEndToStart = Math.abs(targetEndTime - clipStart);
    if (distEndToStart < minDistance) {
      minDistance = distEndToStart;
      closestTime = clipStart - duration;
    }

    // Check snap target clip end to other clip end
    const distEndToEnd = Math.abs(targetEndTime - clipEnd);
    if (distEndToEnd < minDistance) {
      minDistance = distEndToEnd;
      closestTime = clipEnd - duration;
    }
  }

  // Check snap to playhead (target clip start to playhead)
  const distToPlayhead = Math.abs(targetTime - playheadPosition);
  if (distToPlayhead < minDistance) {
    minDistance = distToPlayhead;
    closestTime = playheadPosition;
  }

  // Check snap target clip end to playhead
  const distEndToPlayhead = Math.abs(targetEndTime - playheadPosition);
  if (distEndToPlayhead < minDistance) {
    // 这里对齐的是“目标片段末尾”到播放头，因此需要回推 duration。
    closestTime = playheadPosition - duration;
  }

  return closestTime;
}
