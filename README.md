# Generative Video Studio

A production-grade **Next.js dashboard** that procedurally generates, previews, and renders
**commercial-grade 4K seamless-looping abstract motion backgrounds** — built for
**Adobe Stock contributors**.

Every video is unique per seed. Every loop is mathematically seamless. Exports are
high-bitrate **MP4 (H.264)** or **Apple ProRes 422 (.mov)** with no audio track.

```
┌──────────────┐   preview (downscaled)    ┌───────────────────┐
│  Studio UI   │ ────────────────────────▶ │  WebGL2 / GLSL    │
│  Next.js 14  │                           │  4 generative     │
└──────────────┘                           │  engines          │
       │                                   └────────┬──────────┘
       │ export queue: N frames, angle_i=(i/N)*2PI  │
       ▼                                            ▼
┌──────────────┐   PNG frames   ┌────────────────────────────────┐
│ /api/jobs    │ ────────────▶ │ fluent-ffmpeg + ffmpeg-static  │
│ PNG upload   │                │ H.264 crf16 80M / ProRes 422   │
└──────────────┘                └────────────────────────────────┘
```

## Features

- **25 generative engines** (GLSL) across 5 categories — fluid sims, line art, cyber/tech,
  particles/FX and raymarched 3D — each with rich parameter schemas (see Engine Catalog).
- **Seamless loops by construction**: animation time is only ever `(cos a, sin a)` with
  `a = (i/N)·2π`, so frame N == frame 0 exactly. No crossfades, no popping.
- **Realtime preview** (downscaled) + **offline 4K export** — frames are rendered
  deterministically one-by-one, so there are zero dropped/duplicated frames.
- **Export queue** with progress bars, ETAs, MP4/ProRes 422 selection, one-click download,
  plus a client-side **PNG-sequence ZIP** fallback (no server encode needed).
- **Preset manager** (11 built-in + localStorage customs), **randomizer** (unique seed,
  palette, params), **palette customizer** (6 curated gradients + custom hex stops).
- **Headless CLI** (`scripts/render-headless.mjs`): puppeteer + SwiftShader renders true
  4K frames on a server with no GPU, then muxes with the bundled ffmpeg binary.

## Engine Catalog

| # | Engine | Category | Description |
|---|--------|----------|-------------|
| 1 | Liquid Clouds | Fluid & Smoke | Domain-warped fBm dye diffusion — slow ink-in-water clouds |
| 2 | Nebula Drift | Fluid & Smoke | Deep-space gas clouds with twinkling starfield |
| 3 | Ember Fire | Fluid & Smoke | Rising fBm-eroded flames, flickering embers, smoke plume |
| 4 | Liquid Marble | Fluid & Smoke | Acrylic-pour marble with thin swirling mineral veins |
| 5 | Thin-Film Bubbles | Fluid & Smoke | Holographic soap bubbles, rainbow interference shifting |
| 6 | Flow Field Lines | Lines & Flow | Streaks advected through a curling Perlin vector field |
| 7 | Topo Contours | Lines & Flow | fBm terrain isolines that wave and breathe |
| 8 | Lissajous Ribbons | Lines & Flow | Three intertwined glowing parametric ribbons |
| 9 | Guilloché Rosettes | Lines & Flow | Rotating spirograph rosettes, banknote-style line art |
| 10 | Spectrum EQ | Lines & Flow | Pulsing equalizer bars + waveform from a pseudo-spectrum |
| 11 | Neon Waves | Cyber & Tech | Layered glowing sine ribbons with neon falloff |
| 12 | Sci-Fi HUD | Cyber & Tech | Radar sweep, rotating dials, telemetry, corner brackets |
| 13 | Plexus Network | Cyber & Tech | Constellation nodes with auto-connecting edges |
| 14 | Digital Rain | Cyber & Tech | Matrix-style cascading code columns with head glow |
| 15 | Synthwave Drive | Cyber & Tech | Retro wireframe terrain scrolling to a scanline sun |
| 16 | Circuit Traces | Cyber & Tech | Motherboard traces with traveling energy pulses |
| 17 | Bokeh Dreams | Particles & FX | Floating out-of-focus light discs, parallax depth |
| 18 | Accretion Vortex | Particles & FX | Black-hole disk: spiral gas streams, doppler asymmetry |
| 19 | Kaleidoscope | Particles & FX | Mirrored fBm mandala rotating in seamless symmetry |
| 20 | Light Leaks | Particles & FX | Anamorphic streaks sweeping over black — overlay-ready |
| 21 | RGB Glitch | Particles & FX | Glitch bursts: RGB splits, block displacement, scanlines |
| 22 | Fractal Tunnel | 3D Geometry | Raymarched kaleidoscopic tunnel, endless forward flight |
| 23 | Iridescent Crystals | 3D Geometry | Raymarched floating octahedrons, fresnel iridescence |
| 24 | Morphing Solids | 3D Geometry | Solid melting cube → sphere → torus → octahedron |
| 25 | Liquid Metaballs | 3D Geometry | Mercury blobs merging — organic SDF liquid metal |

## Installation

```bash
npm install
npx puppeteer browsers install chrome   # only needed for the headless CLI
npm run dev                              # → http://localhost:3000
```

`ffmpeg-static` ships a prebuilt ffmpeg binary with the npm package — no system ffmpeg
required. The API routes use it via `fluent-ffmpeg`.

## Usage

### 1. Design in the browser

1. Pick an engine tab (Liquid Clouds / Flow Field Lines / Neon Waves / Nebula Drift).
2. Tune sliders, pick a palette (or dial in 5 custom hex stops), set loop duration
   (10/15/20/30 s) and fps (30/60).
3. Hit **Randomize** for a guaranteed-unique seed + palette + params.
4. Save favorites with the **Preset** manager.

### 2. Export from the queue

1. Choose resolution (4K UHD 3840×2160 or 1080p) and format (MP4 H.264 / ProRes 422).
2. **Add to Queue** — the app renders each frame at full resolution in your browser
   (offline, deterministic — no realtime capture, no drops) and uploads PNGs to
   `/api/jobs`.
3. The server muxes with ffmpeg; poll progress in the queue UI, then **Download**.

Rendered jobs live under `./renders/<job-id>/` (`frames/`, `job.json`, final video).

### 3. Headless server render (no GPU)

```bash
# 1. start the app
npm run build && npm start &

# 2. render 15 s @ 30 fps, 4K, straight to MP4
node scripts/render-headless.mjs \
  --engine fluid --seed 90210 \
  --duration 15 --fps 30 \
  --out renders/abyss-01 --mux mp4

# ProRes master instead:
node scripts/render-headless.mjs \
  --engine flowfield --seed 777 \
  --duration 20 --fps 30 \
  --out renders/gold-silk --mux prores

# 60 fps neon loop, frames only (mux yourself later):
node scripts/render-headless.mjs \
  --engine neonwaves --seed 424242 \
  --duration 10 --fps 60 \
  --out renders/neon-grid

# custom palette + params:
node scripts/render-headless.mjs \
  --engine nebula --seed 5 --duration 30 --fps 30 \
  --palette "#020d18,#062a44,#0b5d7a,#1fb6a6,#d8fbff" \
  --params '{"density":0.7,"stars":1.0}' \
  --out renders/deep-nebula --mux mp4
```

## Adobe Stock export presets

| Use case | Resolution | FPS | Duration | Codec | Settings |
|---|---|---|---|---|---|
| Stock loop (standard) | 3840×2160 | 30 | 10–15 s | H.264 MP4 | CRF 16, preset slow, 80 Mbps, yuv420p, faststart |
| Stock loop (smooth) | 3840×2160 | 60 | 10 s | H.264 MP4 | CRF 16, preset slow, 80 Mbps, yuv420p, faststart |
| Master / re-encode | 3840×2160 | 30/60 | 15–30 s | ProRes 422 (.mov) | prores_ks profile 2, yuv422p10le, qscale 9 |
| Draft / preview | 1920×1080 | 30 | 10 s | H.264 MP4 | same as standard |

All exports: **no audio** (`-an`), progressive scan, Rec.709-ish sRGB pipeline.

## The seamless-loop math

Realtime animations usually do `t += dt`, which never lands exactly back on frame 0.
This studio instead defines a **loop angle** `a ∈ [0, 2π)`:

```
a_i = (i / N) · 2π        for frame i of N
time_vec = (cos a_i, sin a_i)
```

Every shader drives motion *only* through `time_vec` (see `loopVec()` in
`src/engines/shaders.ts`). Since `(cos a, sin a)` is 2π-periodic, `frame(N) ≡ frame(0)`
bit-for-bit — a perfect loop with no crossfade needed. The export pipeline renders
frames offline at exact angles, so the file loops seamlessly in any player or editor.

## Project structure

```
src/
  app/
    page.tsx                  # studio dashboard (preview + controls + queue)
    headless/page.tsx         # headless render target (window.__renderFrame)
    api/jobs/route.ts         # POST create job
    api/jobs/[id]/route.ts    # GET job status (poll)
    api/jobs/[id]/frames/route.ts   # POST upload PNG frame
    api/jobs/[id]/mux/route.ts     # POST start ffmpeg encode
    api/jobs/[id]/download/route.ts# GET stream final video
  components/
    StudioRenderer.ts         # framework-free Three.js wrapper
    Preview.tsx               # canvas preview + engine tabs + play/pause
    ControlPanel.tsx          # sliders, palette, animation, randomizer, presets
    ExportQueue.tsx           # queue UI with progress + ETA + downloads
  engines/
    shaders.ts                # shared GLSL: noise/fbm/palette + loopVec()
    fluid.ts | flowfield.ts | neonwaves.ts | nebula.ts
    registry.ts               # engine registry + StudioSettings type
  lib/
    palettes.ts | presets.ts | randomizer.ts
    jobs.ts                   # server job store (renders/<id>/job.json)
    renderClient.ts           # browser export pipeline (frames → mux → download)
scripts/
  render-headless.mjs         # puppeteer + SwiftShader 4K CLI renderer
```

## Notes & limits

- Browser export renders 4K frames on *your* GPU — a 15 s / 30 fps job is 450 PNG
  uploads (~2–4 MB each at 4K). For big batches prefer the headless CLI.
- `renders/` is git-ignored; clean it periodically (`rm -rf renders/*`).
- SwiftShader (CPU WebGL) is ~10–60× slower than a real GPU; headless 4K jobs are
  best run overnight or on a machine with a GPU-backed Chrome.
- Shaders target WebGL2 (three.js default); the palette helper avoids dynamic
  uniform-array indexing so it also compiles on WebGL1.

## License

MIT — generate, sell, and distribute your renders freely. If you publish the
studio itself, attribution is appreciated.
