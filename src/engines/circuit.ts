import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Circuit Board Traces
 * Manhattan-routed traces on a hash grid with energy pulses traveling
 * along them (integer pulse cycles per loop = seamless).
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_grid;   // trace grid density
uniform float u_p_width;  // trace width
uniform float u_p_pulse;  // pulse cycles per loop (integer)
uniform float u_p_glow;   // glow

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * u_p_grid + u_seed * 0.41;
  float pulseN = floor(u_p_pulse + 0.5);

  vec2 id = floor(p);
  vec2 f = fract(p);
  float w = 0.035 * u_p_width;

  // Per-cell routing decision.
  float h = hash12(id + 3.7);
  float hy = 0.25 + 0.5 * hash12(id + 7.1); // horizontal trace y
  float vx = 0.25 + 0.5 * hash12(id + 1.9); // vertical trace x

  float hline = smoothstep(w * 2.0, w * 0.5, abs(f.y - hy)) * step(h, 0.5);
  float vline = smoothstep(w * 2.0, w * 0.5, abs(f.x - vx)) * step(0.5, h) * step(h, 0.85);
  // Via pads at some intersections.
  float pad = smoothstep(w * 3.2, w * 1.6, length(f - vec2(vx, hy))) * step(0.85, h);
  float trace = clamp(hline + vline, 0.0, 1.0);

  // Energy pulses: global x-coordinate, integer cycles per loop.
  float s = (p.x - u_time * 0.15915 * pulseN * 4.0);
  float pulse = exp(-pow((fract(s * 0.25) - 0.5) * 7.0, 2.0));
  float s2 = (p.y + u_time * 0.15915 * pulseN * 4.0);
  float pulse2 = exp(-pow((fract(s2 * 0.25) - 0.5) * 7.0, 2.0));

  vec3 col = PAL(0.03) * 0.6;
  vec3 tcol = mix(u_palette[2], u_palette[1], 0.35);
  col += tcol * trace * 0.75;
  col += u_palette[3] * hline * pulse * 1.5;
  col += u_palette[3] * vline * pulse2 * 1.5;
  col += u_palette[4] * pad * (0.8 + pulse * 0.8);
  col += tcol * (trace + pad) * u_p_glow * 0.25;

  // Faint fiberglass weave.
  col *= 0.96 + 0.04 * sin(p.x * 40.0) * sin(p.y * 40.0);

  float vig = smoothstep(1.35, 0.35, length(uv - 0.5) * 1.7);
  col *= mix(0.7, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const circuitEngine = {
  id: "circuit",
  name: "Circuit Traces",
  description:
    "Motherboard traces with energy pulses flowing along Manhattan routes.",
  fragmentShader,
  defaultParams: { grid: 7.0, width: 1.0, pulse: 2, glow: 1.0 },
  paramSchema: [
    { key: "grid", label: "Grid Density", type: "slider", min: 3, max: 14, step: 0.1, default: 7.0 },
    { key: "width", label: "Trace Width", type: "slider", min: 0.3, max: 3, step: 0.05, default: 1.0 },
    { key: "pulse", label: "Pulse Cycles", type: "slider", min: 1, max: 5, step: 1, default: 2 },
    { key: "glow", label: "Glow", type: "slider", min: 0, max: 2, step: 0.05, default: 1.0 },
  ],
};
