"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Maximize2 } from "lucide-react";
import { ENGINES, type StudioSettings } from "../engines/registry";
import { StudioRenderer } from "./StudioRenderer";

interface PreviewProps {
  settings: StudioSettings;
  onSettingsChange: (patch: Partial<StudioSettings>) => void;
  onRendererReady: (r: StudioRenderer | null) => void;
}

export default function Preview({ settings, onSettingsChange, onRendererReady }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<StudioRenderer | null>(null);
  const [playing, setPlaying] = useState(true);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);

  // Create the renderer once.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const renderer = new StudioRenderer(canvas);
    rendererRef.current = renderer;

    const fit = () => {
      const w = Math.max(320, container.clientWidth);
      renderer.setRenderSize(w, Math.round((w * 9) / 16), false);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(container);

    renderer.setParams({
      engineId: "fluid",
      seed: 123456,
      params: {},
      palette: ["#0b0b12", "#1d1b4b", "#7c6cf0", "#22d3ee", "#f8f7ff"],
      durationSec: 10,
      fps: 30,
    });
    renderer.startPreview();
    readyRef.current = true;
    setReady(true);
    onRendererReady(renderer);

    return () => {
      ro.disconnect();
      renderer.dispose();
      rendererRef.current = null;
      readyRef.current = false;
      onRendererReady(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push settings into the renderer whenever they change.
  useEffect(() => {
    if (readyRef.current && rendererRef.current) {
      rendererRef.current.setParams(settings);
    }
  }, [settings, ready]);

  const togglePlay = () => {
    const r = rendererRef.current;
    if (!r) return;
    if (r.isPreviewing) {
      r.stopPreview();
      setPlaying(false);
    } else {
      r.startPreview();
      setPlaying(true);
    }
  };

  const totalFrames = Math.round(settings.durationSec * settings.fps);

  return (
    <div className="flex flex-col gap-3">
      {/* Engine tabs */}
      <div className="flex flex-wrap gap-2">
        {ENGINES.map((e) => (
          <button
            key={e.id}
            onClick={() => onSettingsChange({ engineId: e.id })}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              settings.engineId === e.id
                ? "bg-studio-accent/20 border-studio-accent text-white shadow-[0_0_16px_rgba(124,108,240,0.35)]"
                : "bg-studio-panel border-studio-border text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
            }`}
          >
            {e.name}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden border border-studio-border bg-black"
      >
        <canvas ref={canvasRef} className="w-full block" />
        <div className="absolute top-3 left-3 flex items-center gap-2 text-[11px] font-mono">
          <span className="px-2 py-1 rounded bg-black/60 border border-studio-border text-zinc-300">
            PREVIEW
          </span>
          <span className="px-2 py-1 rounded bg-black/60 border border-studio-border text-zinc-400">
            {totalFrames} frames · {settings.durationSec}s · {settings.fps}fps
          </span>
        </div>
        <button
          onClick={togglePlay}
          className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-black/60 border border-studio-border flex items-center justify-center text-white hover:bg-studio-accent/40 transition-colors"
          title={playing ? "Pause preview" : "Play preview"}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Maximize2 size={12} />
          Preview is downscaled — export always renders at full 3840×2160.
        </span>
        <span className="font-mono">seed {settings.seed}</span>
      </div>
    </div>
  );
}
