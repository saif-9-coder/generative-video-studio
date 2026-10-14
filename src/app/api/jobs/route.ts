import { NextRequest, NextResponse } from "next/server";
import { createJob } from "@/lib/jobs";
import type { ExportFormat } from "@/lib/presets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Create a new render job and its frame directory. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      totalFrames?: number;
      fps?: number;
      format?: ExportFormat;
    };
    const totalFrames = Math.floor(Number(body.totalFrames));
    const fps = Number(body.fps) === 60 ? 60 : 30;
    const format: ExportFormat = body.format === "prores" ? "prores" : "mp4";
    if (!Number.isFinite(totalFrames) || totalFrames < 1 || totalFrames > 20000) {
      return NextResponse.json({ error: "totalFrames must be 1..20000" }, { status: 400 });
    }
    const job = createJob(totalFrames, fps, format);
    return NextResponse.json({ id: job.id, totalFrames: job.totalFrames });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
