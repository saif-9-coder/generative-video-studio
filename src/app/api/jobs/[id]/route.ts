import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Poll job status (receiving / muxing / done / error). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const job = getJob(params.id);
  if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });
  return NextResponse.json({
    id: job.id,
    status: job.status,
    totalFrames: job.totalFrames,
    receivedFrames: job.receivedFrames,
    fps: job.fps,
    format: job.format,
    muxProgress: job.muxProgress,
    error: job.error,
    ready: job.status === "done",
    download: job.status === "done" ? `/api/jobs/${job.id}/download` : null,
  });
}
