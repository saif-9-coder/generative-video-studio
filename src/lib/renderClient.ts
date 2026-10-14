import JSZip from "jszip";
import type { StudioRenderer } from "../components/StudioRenderer";
import type { StudioSettings } from "../engines/registry";
import type { ExportFormat } from "./presets";

export interface RenderRequest extends StudioSettings {
  format: ExportFormat;
  width: number;
  height: number;
}

export type RenderPhase = "capturing" | "muxing" | "done";

export interface RenderProgress {
  done: number;
  total: number;
  phase: RenderPhase;
  etaSec: number;
  muxProgress?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))), "image/png");
  });
}

function pad(n: number): string {
  return String(n).padStart(4, "0");
}

/**
 * Frame-accurate offline render. For each frame index i in [0, N):
 *   angle = (i / N) * 2PI  ->  renderFrame(angle)  ->  upload PNG.
 * Because frames are rendered deterministically one-by-one (never sampled
 * from a realtime clock), there are zero dropped/duplicated frames and the
 * loop is mathematically seamless.
 */
export async function renderJob(
  req: RenderRequest,
  renderer: StudioRenderer,
  onProgress: (p: RenderProgress) => void
): Promise<string> {
  const total = Math.max(1, Math.round(req.durationSec * req.fps));

  // 1. Create the server-side job.
  const createRes = await fetch("/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ totalFrames: total, fps: req.fps, format: req.format }),
  });
  if (!createRes.ok) throw new Error(`Failed to create job (${createRes.status})`);
  const { id } = (await createRes.json()) as { id: string };

  // 2. Switch to export resolution (restored in `finally`).
  const prevSize = renderer.getSize();
  renderer.setRenderSize(req.width, req.height, false);
  renderer.setParams(req);
  const canvas = renderer.getCanvas();

  const t0 = performance.now();
  try {
    for (let i = 0; i < total; i++) {
      const angle = (i / total) * Math.PI * 2;
      renderer.renderFrame(angle);
      const blob = await canvasToBlob(canvas);
      const up = await fetch(`/api/jobs/${id}/frames`, {
        method: "POST",
        headers: { "Content-Type": "image/png", "X-Frame-Index": String(i) },
        body: blob,
      });
      if (!up.ok) throw new Error(`Frame upload failed at frame ${i} (${up.status})`);
      const elapsed = (performance.now() - t0) / 1000;
      const rate = (i + 1) / Math.max(elapsed, 0.001);
      onProgress({ done: i + 1, total, phase: "capturing", etaSec: (total - i - 1) / rate });
    }

    // 3. Ask the server to mux the PNG sequence.
    const muxRes = await fetch(`/api/jobs/${id}/mux`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: req.format }),
    });
    if (!muxRes.ok) throw new Error(`Mux request failed (${muxRes.status})`);

    // 4. Poll until the encode finishes.
    for (;;) {
      const s = (await (await fetch(`/api/jobs/${id}`)).json()) as {
        status: string;
        error?: string;
        muxProgress?: number;
      };
      if (s.status === "done") break;
      if (s.status === "error") throw new Error(s.error || "Server mux failed");
      onProgress({ done: total, total, phase: "muxing", etaSec: 0, muxProgress: s.muxProgress ?? 0 });
      await sleep(1000);
    }
  } finally {
    renderer.setRenderSize(prevSize.width || 1280, prevSize.height || 720, false);
  }

  onProgress({ done: total, total, phase: "done", etaSec: 0 });
  return `/api/jobs/${id}/download`;
}

/**
 * Client-only fallback: render the PNG sequence and download it as a ZIP
 * (no server/ffmpeg required). The user can mux locally with ffmpeg.
 */
export async function renderFramesZip(
  req: RenderRequest,
  renderer: StudioRenderer,
  onProgress: (p: RenderProgress) => void
): Promise<void> {
  const total = Math.max(1, Math.round(req.durationSec * req.fps));
  const prevSize = renderer.getSize();
  renderer.setRenderSize(req.width, req.height, false);
  renderer.setParams(req);
  const canvas = renderer.getCanvas();
  const zip = new JSZip();
  const t0 = performance.now();
  try {
    for (let i = 0; i < total; i++) {
      const angle = (i / total) * Math.PI * 2;
      renderer.renderFrame(angle);
      const blob = await canvasToBlob(canvas);
      zip.file(`frame-${pad(i)}.png`, blob);
      const elapsed = (performance.now() - t0) / 1000;
      const rate = (i + 1) / Math.max(elapsed, 0.001);
      onProgress({ done: i + 1, total, phase: "capturing", etaSec: (total - i - 1) / rate });
    }
    onProgress({ done: total, total, phase: "muxing", etaSec: 0 });
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `frames-${req.engineId}-${req.width}x${req.height}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } finally {
    renderer.setRenderSize(prevSize.width || 1280, prevSize.height || 720, false);
  }
  onProgress({ done: total, total, phase: "done", etaSec: 0 });
}
