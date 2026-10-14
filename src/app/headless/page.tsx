"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { StudioRenderer } from "@/components/StudioRenderer";
import { getEngine, type StudioSettings } from "@/engines/registry";
import { getPalette } from "@/lib/palettes";

declare global {
  interface Window {
    __renderFrame?: (loopAngle: number) => void;
    __ready?: boolean;
  }
}

/**
 * Headless render target for `scripts/render-headless.mjs`.
 * NOT linked in the UI. Query params:
 *   engine, seed, w, h, duration, params (JSON), palette (csv hex)
 */
function HeadlessInner() {
  const sp = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const w = Math.max(16, Number(sp.get("w") ?? 3840));
  const h = Math.max(16, Number(sp.get("h") ?? 2160));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engineId = sp.get("engine") ?? "fluid";
    let params: Record<string, number> = {};
    try {
      params = JSON.parse(sp.get("params") ?? "{}") as Record<string, number>;
    } catch {
      params = {};
    }
    const paletteCsv = (sp.get("palette") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const settings: StudioSettings = {
      engineId,
      seed: Number(sp.get("seed") ?? 1),
      params: { ...getEngine(engineId).defaultParams, ...params },
      palette: paletteCsv.length === 5 ? paletteCsv : [...getPalette("cyberpunk").stops],
      durationSec: Number(sp.get("duration") ?? 10),
      fps: 30,
    };

    const renderer = new StudioRenderer(canvas);
    renderer.setRenderSize(w, h, true); // CSS size follows so screenshots are exact
    renderer.setParams(settings);

    window.__renderFrame = (loopAngle: number) => renderer.renderFrame(loopAngle);
    window.__ready = true;

    return () => {
      window.__ready = false;
      window.__renderFrame = undefined;
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ margin: 0, padding: 0, background: "#000", overflow: "hidden" }}>
      <canvas id="glcanvas" ref={canvasRef} style={{ width: w, height: h, display: "block" }} />
    </div>
  );
}

export default function HeadlessPage() {
  return (
    <Suspense fallback={<div style={{ color: "#fff" }}>loading…</div>}>
      <HeadlessInner />
    </Suspense>
  );
}
