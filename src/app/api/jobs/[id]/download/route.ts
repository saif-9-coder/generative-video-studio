import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getJob, jobDir } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Stream the finished video file as a download. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const job = getJob(params.id);
  if (!job || job.status !== "done" || !job.outputFile) {
    return NextResponse.json({ error: "video not ready" }, { status: 404 });
  }
  const filePath = path.join(jobDir(params.id), job.outputFile);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "file missing" }, { status: 404 });
  }
  const stat = fs.statSync(filePath);
  const contentType = job.outputFile.endsWith(".mov") ? "video/quicktime" : "video/mp4";
  const stream = fs.createReadStream(filePath);
  // NextResponse accepts a Readable stream body in the Node runtime.
  return new NextResponse(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="${job.outputFile}"`,
      "Cache-Control": "no-store",
    },
  });
}
