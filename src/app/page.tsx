"use client";

import { useCallback, useRef, useState } from "react";
import { Clapperboard, Cpu, BadgeCheck } from "lucide-react";
import Preview from "@/components/Preview";
import ControlPanel from "@/components/ControlPanel";
import ExportQueue from "@/components/ExportQueue";
import type { StudioRenderer } from "@/components/StudioRenderer";
import { defaultSettings, type StudioSettings } from "@/engines/registry";
import type { ExportFormat } from "@/lib/presets";

export default function StudioPage() {
  const [settings, setSettings] = useState<StudioSettings>(() => defaultSettings("fluid"));
  const [format, setFormat] = useState<ExportFormat>("mp4");
  const rendererRef = useRef<StudioRenderer | null>(null);

  const patchSettings = useCallback((patch: Partial<StudioSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const getRenderer = useCallback(() => rendererRef.current, []);

  const onRendererReady = useCallback((r: StudioRenderer | null) => {
    rendererRef.current = r;
  }, []);

  return (
    <div className="min-h-screen bg-studio-bg">
      {/* Header */}
      <header className="border-b border-studio-border bg-studio-panel/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-5 py-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-studio-accent to-studio-accent2 flex items-center justify-center text-white shadow-[0_0_20px_rgba(124,108,240,0.5)]">
            <Clapperboard size={20} />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white leading-tight">Generative Video Studio</h1>
            <p className="text-[11px] text-zinc-500">
              Procedural 4K seamless-loop motion backgrounds · built for Adobe Stock contributors
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono">
            <span className="px-2.5 py-1.5 rounded-lg bg-studio-panel2 border border-studio-border text-zinc-300 flex items-center gap-1.5">
              <Cpu size={12} className="text-studio-accent2" /> WebGL2 · GLSL
            </span>
            <span className="px-2.5 py-1.5 rounded-lg bg-studio-panel2 border border-studio-border text-zinc-300 flex items-center gap-1.5">
              <BadgeCheck size={12} className="text-emerald-400" /> 3840×2160
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1600px] mx-auto px-5 py-6 flex flex-col gap-6">
        <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
          {/* Preview */}
          <section className="rounded-2xl bg-studio-panel border border-studio-border p-5">
            <Preview settings={settings} onSettingsChange={patchSettings} onRendererReady={onRendererReady} />
          </section>

          {/* Controls */}
          <aside className="rounded-2xl bg-studio-panel border border-studio-border p-5 lg:sticky lg:top-[76px] max-h-[calc(100vh-100px)] overflow-y-auto">
            <ControlPanel
              settings={settings}
              format={format}
              onSettingsChange={patchSettings}
              onFormatChange={setFormat}
            />
          </aside>
        </div>

        {/* Export queue */}
        <section className="rounded-2xl bg-studio-panel border border-studio-border p-5">
          <ExportQueue settings={settings} format={format} onFormatChange={setFormat} getRenderer={getRenderer} />
        </section>

        <footer className="text-center text-[11px] text-zinc-600 pb-6">
          Every render is unique per seed · loop angle math guarantees frame N == frame 0 · no audio track in exports
        </footer>
      </main>
    </div>
  );
}
