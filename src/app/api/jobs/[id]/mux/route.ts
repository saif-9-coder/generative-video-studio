import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { framesDir, getJob, jobDir, updateJob } from "@/lib/jobs";
import type { ExportFormat } from "@/lib/presets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Start muxing the received PNG sequence into the final video.
 * The encode runs in the background; the handler returns immediately and
 * progress is exposed via GET /api/jobs/[id].
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const job = getJob(params.id);
  if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });
  if (job.status !== "receiving") {
    return NextResponse.json({ error: `job is ${job.status}` }, { status: 409 });
  }

  const body = (await req.json().catch(() => ({}))) as { format?: ExportFormat };
  const format: ExportFormat = body.format === "prores" ? "prores" : job.format;

  if (job.receivedFrames < job.totalFrames) {
    return NextResponse.json(
      { error: `only ${job.receivedFrames}/${job.totalFrames} frames received` },
      { status: 409 }
    );
  }

  const dir = jobDir(params.id);
  const pattern = path.join(framesDir(params.id), "frame-%04d.png");
  const outName = format === "prores" ? "output-prores422.mov" : "output-h264.mp4";
  const outPath = path.join(dir, outName);

  updateJob(params.id, { status: "muxing", format, muxProgress: 0 });

  // Fire-and-forget: completion / errors are written back to job.json.
  try {
    let cmd = ffmpeg()
      .input(pattern)
      .inputOptions([`-framerate ${job.fps}`])
      .outputOptions(["-an", "-movflags +faststart", `-r ${job.fps}`]);

    if (format === "prores") {
      // Apple ProRes 422 (standard profile) — mezzanine master for stock sites.
      cmd = cmd.outputOptions([
        "-c:v prores_ks",
        "-profile:v 2",
        "-pix_fmt yuv422p10le",
        "-qscale:v 9",
      ]);
    } else {
      // High-bitrate H.264 — Adobe Stock friendly.
      cmd = cmd.outputOptions([
        "-c:v libx264",
        "-pix_fmt yuv420p",
        "-crf 16",
        "-preset slow",
        "-b:v 80M",
        "-maxrate 100M",
        "-bufsize 200M",
      ]);
    }

    cmd
      .output(outPath)
      .on("progress", (p: { frames?: number }) => {
        const frames = Number(p.frames) || 0;
        updateJob(params.id, {
          muxProgress: Math.min(0.999, frames / Math.max(1, job.totalFrames)),
        });
      })
      .on("end", () => {
        updateJob(params.id, { status: "done", outputFile: outName, muxProgress: 1 });
      })
      .on("error", (err: Error) => {
        updateJob(params.id, { status: "error", error: `ffmpeg: ${err.message}` });
      })
      .run();
  } catch (err) {
    updateJob(params.id, { status: "error", error: String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "muxing", output: outName });
}
