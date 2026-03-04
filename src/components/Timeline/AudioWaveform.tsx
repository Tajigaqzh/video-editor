import React, { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTimelineStore } from "@/store/timelineStore";

type WaveformData = {
  sample_rate: number;
  step_ms: number;
  peaks: number[];
};

interface AudioWaveformProps {
  mediaId: string;
}

const SAMPLE_BARS = 56;

const AudioWaveform: React.FC<AudioWaveformProps> = ({ mediaId }) => {
  const media = useTimelineStore((state) =>
    state.project.media.find((item) => item.id === mediaId),
  );
  const [peaks, setPeaks] = useState<number[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadWaveform = async () => {
      if (!media?.waveformPath || media.waveformStatus !== "ready") {
        setPeaks(null);
        return;
      }

      try {
        const data = await invoke<WaveformData>("load_waveform", { path: media.waveformPath });
        if (cancelled) return;
        setPeaks(Array.isArray(data.peaks) ? data.peaks : []);
      } catch (error) {
        if (cancelled) return;
        console.warn("Failed to load waveform:", error);
        setPeaks(null);
      }
    };

    void loadWaveform();

    return () => {
      cancelled = true;
    };
  }, [media?.waveformPath, media?.waveformStatus]);

  const sampled = useMemo(() => {
    if (!peaks || peaks.length === 0) return [];
    const step = Math.max(1, Math.floor(peaks.length / SAMPLE_BARS));
    const bars: number[] = [];
    for (let i = 0; i < peaks.length && bars.length < SAMPLE_BARS; i += step) {
      bars.push(Math.max(0.03, Math.min(1, peaks[i])));
    }
    return bars;
  }, [peaks]);

  if (media?.waveformStatus === "processing" || media?.waveformStatus === "pending") {
    return <div className="absolute inset-0 bg-white/5" />;
  }

  if (sampled.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 flex items-center px-1 gap-px pointer-events-none opacity-80">
      {sampled.map((value, index) => (
        <div
          key={`${mediaId}_${index}`}
          style={{
            width: "2px",
            height: `${Math.max(8, Math.round(value * 52))}px`,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderRadius: "1px",
          }}
        />
      ))}
    </div>
  );
};

export default AudioWaveform;
