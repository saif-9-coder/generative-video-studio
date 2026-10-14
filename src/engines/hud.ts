import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Sci-Fi HUD Overlay
 * Rotating dials, radar sweep, tick rings, telemetry and corner brackets.
 * Dark background with graphic elements — also usable as a video overlay.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_density; // element density
uniform float u_p_sweep;   // radar sweeps per loop (integer)
uniform float u_p_glow;    // glow
uniform float u_p_scale;   // HUD scale

// Thin ring at radius r.
float ring(vec2 p, float r, float w) {
  return smoothstep(w * 2.0, w * 0.5, abs(length(p) - r));
}

// Tick marks around a circle.
float ticks(vec2 p, float r, float count, float w, float rot) {
  float a = atan(p.y, p.x) + rot;
  float t = abs(fract(a * count / 6.28318) - 0.5) * 2.0;
  float on = smoothstep(0.75, 0.95, 1.0 - t);
  return on * smoothstep(w * 2.4, w * 0.6, abs(length(p) - r));
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) * u_p_scale;
  float sweepN = floor(u_p_sweep + 0.5);

  vec3 col = vec3(0.015, 0.03, 0.05); // near-black blue backdrop
  vec3 cyan = mix(u_palette[2], vec3(0.3, 0.95, 1.0), 0.35);
  vec3 amber = u_palette[3];

  // --- Corner brackets ---
  vec2 b = vec2(aspect * 0.5, 0.5) - abs(p) - 0.06;
  float bl = min(b.x, b.y);
  float corner = smoothstep(0.035, 0.015, bl) * step(0.0, bl);
  // Keep only L shapes: mask the middle of each edge.
  float edge = step(abs(p.x), aspect * 0.5 * 0.82) * step(abs(p.y), 0.40);
  col += cyan * corner * (1.0 - edge) * 1.2;

  // --- Main dial: rings + ticks rotating by integer turns ---
  float r1 = ring(p, 0.30, 0.0022);
  float r2 = ring(p, 0.245, 0.0014);
  float tk1 = ticks(p, 0.30, 60.0, 0.0022, u_time * sweepN);
  float tk2 = ticks(p, 0.20, 24.0, 0.0028, -u_time * sweepN);
  col += cyan * (r1 * 0.9 + r2 * 0.6 + tk1 * 0.9 + tk2 * 0.7);

  // --- Radar sweep: mod() keeps it seamless ---
  float ang = atan(p.y, p.x);
  float sw = mod(ang - u_time * sweepN, 6.28318);
  float sweep = exp(-sw * 3.2) * smoothstep(0.30, 0.28, length(p));
  // Fading blips that the sweep reveals.
  float blip = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 bp = vec2(cos(fi * 2.4 + u_seed), sin(fi * 1.9 + u_seed * 0.5)) * (0.08 + 0.05 * fi);
    float bd = mod(ang - atan(bp.y, bp.x), 6.28318);
    blip += exp(-length(p - bp) * 60.0) * exp(-bd * 2.5);
  }
  col += cyan * sweep * 0.55 + amber * blip * 1.4 * u_p_density;

  // --- Telemetry dashes scrolling upward (integer wraps per loop) ---
  float ty = fract(uv.y * 3.0 - u_time * 0.15915 * 2.0 + u_seed * 0.01);
  float dash = step(0.5, fract(ty * 18.0)) * smoothstep(0.02, 0.0, abs(uv.x - 0.06) - 0.004);
  float dash2 = step(0.5, fract(ty * 13.0 + 0.4)) * smoothstep(0.02, 0.0, abs(uv.x - 0.94) - 0.004);
  col += cyan * (dash + dash2) * 0.5 * u_p_density;

  // --- Crosshair ---
  float ch = smoothstep(0.0016, 0.0006, abs(p.x)) * step(length(p), 0.09)
           + smoothstep(0.0016, 0.0006, abs(p.y)) * step(length(p), 0.09);
  col += cyan * ch * 0.8;

  col += cyan * u_p_glow * 0.02; // base lift
  col = col / (1.0 + col * 0.35); // soft tonemap

  gl_FragColor = vec4(col, 1.0);
}
`;

export const hudEngine = {
  id: "hud",
  name: "Sci-Fi HUD",
  description:
    "HUD overlay: radar sweep, rotating dials, telemetry ticks and corner brackets.",
  fragmentShader,
  defaultParams: { density: 1.0, sweep: 1, glow: 1.0, scale: 1.6 },
  paramSchema: [
    { key: "density", label: "Element Density", type: "slider", min: 0.2, max: 1.8, step: 0.05, default: 1.0 },
    { key: "sweep", label: "Sweeps / Loop", type: "slider", min: 1, max: 4, step: 1, default: 1 },
    { key: "glow", label: "Glow", type: "slider", min: 0, max: 2, step: 0.05, default: 1.0 },
    { key: "scale", label: "HUD Scale", type: "slider", min: 1, max: 3, step: 0.05, default: 1.6 },
  ],
};
