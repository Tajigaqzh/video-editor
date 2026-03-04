import { describe, expect, it } from "vitest";
import { interpolateKeyframes, normalizeKeyframes, type Keyframe } from "@/utils";

describe("keyframeInterpolation", () => {
  describe("normalizeKeyframes", () => {
    it("sorts by time and keeps the last keyframe for duplicate time", () => {
      const input: Keyframe[] = [
        { time: 2, value: 20 },
        { time: 1, value: 10 },
        { time: 1, value: 11 },
        { time: 3, value: 30 },
      ];

      const normalized = normalizeKeyframes(input);

      expect(normalized).toEqual([
        { time: 1, value: 11 },
        { time: 2, value: 20 },
        { time: 3, value: 30 },
      ]);
    });
  });

  describe("interpolateKeyframes", () => {
    it("returns 0 when keyframes are empty", () => {
      expect(interpolateKeyframes([], 0)).toBe(0);
    });

    it("returns the single keyframe value for any time", () => {
      const keyframes: Keyframe[] = [{ time: 3, value: 42 }];
      expect(interpolateKeyframes(keyframes, -10)).toBe(42);
      expect(interpolateKeyframes(keyframes, 3)).toBe(42);
      expect(interpolateKeyframes(keyframes, 999)).toBe(42);
    });

    it("clamps to start/end keyframe values outside range", () => {
      const keyframes: Keyframe[] = [
        { time: 1, value: 10 },
        { time: 3, value: 30 },
      ];

      expect(interpolateKeyframes(keyframes, 0)).toBe(10);
      expect(interpolateKeyframes(keyframes, 10)).toBe(30);
    });

    it("interpolates linearly between keyframes", () => {
      const keyframes: Keyframe[] = [
        { time: 0, value: 0 },
        { time: 10, value: 100 },
      ];

      expect(interpolateKeyframes(keyframes, 2.5)).toBeCloseTo(25, 6);
      expect(interpolateKeyframes(keyframes, 5)).toBeCloseTo(50, 6);
      expect(interpolateKeyframes(keyframes, 7.5)).toBeCloseTo(75, 6);
    });

    it("supports ease-in interpolation", () => {
      const keyframes: Keyframe[] = [
        { time: 0, value: 0, easing: "ease-in" },
        { time: 10, value: 100 },
      ];

      // progress=0.5 -> eased=0.25
      expect(interpolateKeyframes(keyframes, 5)).toBeCloseTo(25, 6);
    });

    it("supports ease-out interpolation", () => {
      const keyframes: Keyframe[] = [
        { time: 0, value: 0, easing: "ease-out" },
        { time: 10, value: 100 },
      ];

      // progress=0.5 -> eased=0.75
      expect(interpolateKeyframes(keyframes, 5)).toBeCloseTo(75, 6);
    });

    it("supports ease-in-out interpolation", () => {
      const keyframes: Keyframe[] = [
        { time: 0, value: 0, easing: "ease-in-out" },
        { time: 10, value: 100 },
      ];

      expect(interpolateKeyframes(keyframes, 2.5)).toBeCloseTo(12.5, 6);
      expect(interpolateKeyframes(keyframes, 5)).toBeCloseTo(50, 6);
      expect(interpolateKeyframes(keyframes, 7.5)).toBeCloseTo(87.5, 6);
    });

    it("is deterministic for the same input", () => {
      const keyframes: Keyframe[] = [
        { time: 5, value: 50 },
        { time: 0, value: 0, easing: "ease-in-out" },
        { time: 10, value: 100 },
      ];

      const result1 = interpolateKeyframes(keyframes, 3.3);
      const result2 = interpolateKeyframes(keyframes, 3.3);
      expect(result1).toBeCloseTo(result2, 12);
    });
  });
});
