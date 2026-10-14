#!/usr/bin/env node
/**
 * Headless 4K frame renderer.
 *
 * Launches headless Chrome (SwiftShader software WebGL), opens the
 * /headless page, and screenshots one deterministic frame per loop angle:
 *
 *   angle_i = (i / N) * 2PI        (frame N == frame 0 -> seamless)
 *
 * Frames land in <out>/frames/frame-0000.png … as true 3840x2160 PNGs.
 * With --mux mp4|prores the sequence is encoded with the bundled
 * ffmpeg-static binary using the same presets as the API route.
 *
 * Usage:
 *   node scripts/render-headless.mjs --engine fluid --seed 90210 \
 *     --duration 15 --fps 30 --out renders/my-job --mux mp4
 *   node scripts/render-headless.mjs --engine neonwaves --seed 7 \
 *     --duration 10 --fps 60 --out renders/neon --width 3840 --height 2160
 */
import puppeteer from "puppeteer";
import ffmpegPath from "ffmpeg-static";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[key] = next;
        i++;
      } else {
        out[key] = "true";
      }
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const engine = args.engine ?? "fluid";
const seed = args.seed ?? "1";
const duration = Number(args.duration ?? 10);
const fps = Number(args.fps ?? 30);
const width = Number(args.width ?? 3840);
const height = Number(args.height ?? 2160);
const outDir = args.out ?? `renders/headless-${Date.now()}`;
const base = args.base ?? "http://localhost:3000";
const params = args.params ?? "{}";
const palette = args.palette ?? "";
const mux = (args.mux ?? "").toLowerCase(); // "" | "mp4" | "prores"

const total = Math.max(1, Math.round(duration * fps));
const framesDir = path.join(outDir, "frames");
fs.mkdirSync(framesDir, { recursive: true });
console.log(`[headless] ${engine} seed=${seed} ${width}x${height} ${duration}s @ ${fps}fps -> ${total} frames`);

const browser = await puppeteer.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--disable-gpu-sandbox",
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  const qs = new URLSearchParams({ engine, seed, w: String(width), h: String(height), duration: String(duration), params, palette });
  await page.goto(`${base}/headless?${qs.toString()}`, { waitUntil: "networkidle0", timeout: 180000 });
  await page.waitForFunction("window.__ready === true", { timeout: 180000 });
  const canvas = await page.$("#glcanvas");
  if (!canvas) throw new Error("canvas #glcanvas not found");

  const t0 = Date.now();
  for (let i = 0; i < total; i++) {
    const angle = (i / total) * Math.PI * 2;
    await page.evaluate((a) => window.__renderFrame(a), angle);
    const file = path.join(framesDir, `frame-${String(i).padStart(4, "0")}.png`);
    await canvas.screenshot({ path: file });
    if (i % 30 === 0 || i === total - 1) {
      const el = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`[headless] frame ${i + 1}/${total} (${el}s)`);
    }
  }
  console.log(`[headless] frames written to ${framesDir}`);
} finally {
  await browser.close();
}

if (mux === "mp4" || mux === "prores") {
  const isProres = mux === "prores";
  const outFile = path.join(outDir, isProres ? "output-prores422.mov" : "output-h264.mp4");
  const ffArgs = [
    "-y",
    "-framerate", String(fps),
    "-i", path.join(framesDir, "frame-%04d.png"),
    "-an",
    "-r", String(fps),
    ...(isProres
      ? ["-c:v", "prores_ks", "-profile:v", "2", "-pix_fmt", "yuv422p10le", "-qscale:v", "9"]
      : ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-preset", "slow",
         "-b:v", "80M", "-maxrate", "100M", "-bufsize", "200M", "-movflags", "+faststart"]),
    outFile,
  ];
  console.log(`[headless] muxing -> ${outFile}`);
  const r = spawnSync(ffmpegPath, ffArgs, { stdio: "inherit" });
  if (r.status !== 0) {
    console.error("[headless] ffmpeg failed");
    process.exit(1);
  }
  console.log(`[headless] DONE ${outFile}`);
} else {
  console.log("[headless] DONE (no mux; encode later with ffmpeg or POST the frames to /api/jobs)");
}
