"use client";

import { useRef, useState } from "react";
import { Plus, Download, Trash2, Film, Loader2, CheckCircle2, AlertTriangle, Archive } from "lucide-react";
import type { StudioRenderer } from "./StudioRenderer";
import type { StudioSettings } from "../engines/registry";
import { renderJob, renderFramesZip, type RenderProgress } from "../lib/renderClient";
import type { ExportFormat } from "../lib/presets";

interface ExportQueueProps {
  settings: StudioSettings;
  format: ExportFormat;
  onFormatChange: (f: ExportFormat) => void;
  getRenderer: () => StudioRenderer | null;
}

interface QueueJob {
  key: number;
  name: string;
  status: "queued" | "capturing" | "muxing" | "done" | "error";
  done: number;
  total: number;
  etaSec: number;
  muxProgress: number;
  downloadUrl?: string;
  error?: string;
  asZip: boolean;
}

const RESOLUTIONS = [
  { id: "3840x2160", label: "4K UHD · 3840×2160", w: 3840, h: 2160 },
  { id: "1920x1080", label: "Full HD · 1920×1080", w: 1920, h: 1080 },
];

let jobCounter = 0;

function fmtEta(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function ExportQueue({ settings, format, onFormatChange, getRenderer }: ExportQueueProps) {
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [resolutionId, setResolutionId] = useState("3840x2160");
  const jobsRef = useRef<QueueJob[]>([]);
  jobsRef.current = jobs;

  const patchJob = (key: number, patch: Partial<QueueJob>) =>
    setJobs((js) => js.map((j) => (j.key === key ? { ...j, ...patch } : j)));

  /** Run a single job, then chain the next queued one. */
  const runJob = async (job: QueueJob) => {
    const renderer = getRenderer();
    if (!renderer) {
      patchJob(job.key, { status: "error", error: "Renderer not ready yet" });
      chainNext(job.key);
      return;
    }
    const res = RESOLUTIONS.find((r) => r.id === resolutionId) ?? RESOLUTIONS[0];
    const total = Math.round(settings.durationSec * settings.fps);
    patchJob(job.key, { status: "capturing", done: 0, total, etaSec: 0, muxProgress: 0 });
    const onProgress = (p: RenderProgress) =>
      patchJob(job.key, {
        status: p.phase === "done" ? "done" : p.phase,
        done: p.done,
        total: p.total,
        etaSec: p.etaSec,
        muxProgress: p.muxProgress ?? 0,
      });
    try {
      if (job.asZip) {
        await renderFramesZip({ ...settings, format, width: res.w, height: res.h }, renderer, onProgress);
      } else {
        const url = await renderJob({ ...settings, format, width: res.w, height: res.h }, renderer, onProgress);
        patchJob(job.key, { downloadUrl: url });
      }
    } catch (err) {
      patchJob(job.key, { status: "error", error: err instanceof Error ? err.message : String(err) });
    }
    chainNext(job.key);
  };

  /** Mark one job finished and start the next queued job, if any. */
  const chainNext = (finishedKey: number) => {
    const next = jobsRef.current.find((j) => j.status === "queued" && j.key !== finishedKey);
    if (next) {
      // defer so the finished job's state commit lands first
      setTimeout(() => void runJob({ ...next, status: "queued" }), 0);
    }
  };

  const removeJob = (key: number) => setJobs((js) => js.filter((j) => j.key !== key));

  const enqueue = (asZip: boolean) => {
    const key = ++jobCounter;
    const res = RESOLUTIONS.find((r) => r.id === resolutionId) ?? RESOLUTIONS[0];
    const total = Math.round(settings.durationSec * settings.fps);
    const name = `${settings.engineId}-${settings.seed}-${res.id}-${settings.durationSec}s`;
    const job: QueueJob = {
      key, name, status: "queued", done: 0, total, etaSec: 0, muxProgress: 0, asZip,
    };
    const alreadyRunning = jobsRef.current.some((j) =>
      j.status === "queued" || j.status === "capturing" || j.status === "muxing"
    );
    setJobs((js) => [...js, job]);
    if (!alreadyRunning) {
      setTimeout(() => void runJob(job), 0);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <Film size={15} className="text-studio-accent" />
          4K Export Queue
        </h3>
        <select
          value={resolutionId}
          onChange={(e) => setResolutionId(e.target.value)}
          className="bg-studio-panel2 border border-studio-border rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:border-studio-accent focus:outline-none"
        >
          {RESOLUTIONS.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
        <select
          value={format}
          onChange={(e) => onFormatChange(e.target.value as ExportFormat)}
          className="bg-studio-panel2 border border-studio-border rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:border-studio-accent focus:outline-none"
        >
          <option value="mp4">MP4 · H.264 · high bitrate</option>
          <option value="prores">ProRes 422 · .mov</option>
        </select>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => enqueue(false)}
            className="rendering-glow flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-accent text-white text-sm font-semibold hover:opacity-90"
          >
            <Plus size={15} /> Add to Queue
          </button>
          <button
            onClick={() => enqueue(true)}
            title="Render PNG sequence as a ZIP (no server encode needed)"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-panel2 border border-studio-border text-zinc-300 text-sm hover:border-studio-accent transition-colors"
          >
            <Archive size={15} /> PNG ZIP
          </button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-studio-border p-8 text-center text-sm text-zinc-500">
          Queue is empty. Tune your artwork, then hit <span className="text-zinc-300 font-medium">Add to Queue</span> to
          render it frame-by-frame at full resolution.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {jobs.map((j) => {
            const pct = j.total > 0 ? Math.round((j.done / j.total) * 100) : 0;
            const muxPct = Math.round((j.muxProgress ?? 0) * 100);
            return (
              <div key={j.key} className="rounded-xl bg-studio-panel border border-studio-border p-4">
                <div className="flex items-center gap-3 mb-2.5">
                  {j.status === "done" ? (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  ) : j.status === "error" ? (
                    <AlertTriangle size={16} className="text-red-400 shrink-0" />
                  ) : (
                    <Loader2 size={16} className="text-studio-accent animate-spin shrink-0" />
                  )}
                  <span className="font-mono text-xs text-zinc-200 truncate flex-1">{j.name}</span>
                  <span className="text-[11px] text-zinc-500 font-mono shrink-0">
                    {j.status === "capturing" && `${j.done}/${j.total} frames · ETA ${fmtEta(j.etaSec)}`}
                    {j.status === "muxing" && `encoding… ${muxPct}%`}
                    {j.status === "queued" && "queued"}
                    {j.status === "done" && (j.downloadUrl ? "ready" : "zip downloaded")}
                    {j.status === "error" && <span className="text-red-400">{j.error}</span>}
                  </span>
                  {j.status === "done" && j.downloadUrl && (
                    <a
                      href={j.downloadUrl}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-medium hover:bg-emerald-500/25"
                    >
                      <Download size={13} /> Download
                    </a>
                  )}
                  {(j.status === "done" || j.status === "error") && (
                    <button onClick={() => removeJob(j.key)} className="text-zinc-600 hover:text-zinc-300" title="Remove">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="h-1.5 rounded-full bg-studio-border overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      j.status === "muxing"
                        ? "bg-gradient-to-r from-amber-400 to-orange-500"
                        : "bg-gradient-to-r from-studio-accent to-studio-accent2"
                    }`}
                    style={{ width: `${j.status === "muxing" ? muxPct : pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
