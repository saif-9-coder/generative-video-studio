import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { ExportFormat } from "./presets";

export type JobStatus = "receiving" | "muxing" | "done" | "error";

export interface JobRecord {
  id: string;
  status: JobStatus;
  totalFrames: number;
  receivedFrames: number;
  fps: number;
  format: ExportFormat;
  outputFile: string | null;
  error: string | null;
  muxProgress: number; // 0..1
  createdAt: string;
}

const RENDERS_DIR = path.join(process.cwd(), "renders");

export function jobDir(id: string): string {
  return path.join(RENDERS_DIR, id);
}

export function framesDir(id: string): string {
  return path.join(jobDir(id), "frames");
}

function jobFile(id: string): string {
  return path.join(jobDir(id), "job.json");
}

export function framePath(id: string, index: number): string {
  return path.join(framesDir(id), `frame-${String(index).padStart(4, "0")}.png`);
}

function readJob(id: string): JobRecord | null {
  try {
    const raw = fs.readFileSync(jobFile(id), "utf-8");
    return JSON.parse(raw) as JobRecord;
  } catch {
    return null;
  }
}

function writeJob(job: JobRecord): void {
  fs.mkdirSync(jobDir(job.id), { recursive: true });
  fs.writeFileSync(jobFile(job.id), JSON.stringify(job, null, 2));
}

export function createJob(totalFrames: number, fps: number, format: ExportFormat): JobRecord {
  const id = crypto.randomUUID();
  const job: JobRecord = {
    id,
    status: "receiving",
    totalFrames: Math.max(1, Math.floor(totalFrames)),
    receivedFrames: 0,
    fps,
    format,
    outputFile: null,
    error: null,
    muxProgress: 0,
    createdAt: new Date().toISOString(),
  };
  fs.mkdirSync(framesDir(id), { recursive: true });
  writeJob(job);
  return job;
}

export function getJob(id: string): JobRecord | null {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return null; // path traversal guard
  return readJob(id);
}

export function updateJob(id: string, patch: Partial<JobRecord>): JobRecord | null {
  const job = readJob(id);
  if (!job) return null;
  const next = { ...job, ...patch };
  writeJob(next);
  return next;
}
