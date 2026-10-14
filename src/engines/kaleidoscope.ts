import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Kaleidoscope / Mandala
 * fBm sampled in mirrored polar segments, rotating by integer turns per
 * loop — symmetrical, hypnotic, perfectly seamless.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_segments; // mirror segments (integer)
uniform float u_p_detail;   // fbm detail scale
uniform float u_p_spin;     // integer spins per loop
uniform float u_p_zoom;     // zoom

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  float segs = floor(u_p_segments + 0.5);
  float spin = floor(u_p_spin + 0.5);

  float r = length(p);
  float a = atan(p.y, p.x) / 6.28318; // 0..1
  // Mirror into one segment.
  float seg = 1.0 / segs;
  float m = abs(fract(a / seg + u_time * 0.15915 * spin) - 0.5) * 2.0; // 0..1 mirrored

  // Polar-mapped sample coords with slow radial breathing (seamless).
  float breathe = 1.0 + 0.12 * sin(u_time * 2.0);
  vec2 q = vec2(m * 2.2, r * u_p_zoom * 3.2 * breathe);

  float f = fbm(q * u_p_detail + u_seed * 0.29);
  float g = fbm(q * u_p_detail * 2.1 - f + vec2(3.7, 9.2));

  float pat = clamp(f * 0.72 + g * 0.38, 0.0, 1.0);
  vec3 col = PAL(pat);

  // Segment boundaries glow.
  float bound = smoothstep(0.03, 0.0, min(m, 1.0 - m)) * smoothstep(0.5, 0.1, r);
  col += u_palette[4] * bound * 0.35;

  // Center medallion.
  float med = smoothstep(0.16, 0.10, r);
  col = mix(col, PAL(clamp(0.5 + 0.4 * sin(u_time * 2.0 + r * 30.0), 0.0, 1.0)), med * 0.75);

  // Petal veins.
  float veins = pow(abs(sin(m * 3.14159 * 3.0)), 0.35);
  col *= 0.82 + veins * 0.28;

  float vig = smoothstep(0.95, 0.25, r * 1.5);
  col *= mix(0.62, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const kaleidoscopeEngine = {
  id: "kaleidoscope",
  name: "Kaleidoscope",
  description:
    "Mirrored mandala of fBm petals rotating in seamless symmetry.",
  fragmentShader,
  defaultParams: { segments: 8, detail: 1.6, spin: 1, zoom: 1.0 },
  paramSchema: [
    { key: "segments", label: "Segments", type: "slider", min: 4, max: 14, step: 1, default: 8 },
    { key: "detail", label: "Detail", type: "slider", min: 0.6, max: 3.5, step: 0.05, default: 1.6 },
    { key: "spin", label: "Spins / Loop", type: "slider", min: 1, max: 3, step: 1, default: 1 },
    { key: "zoom", label: "Zoom", type: "slider", min: 0.5, max: 2.5, step: 0.05, default: 1.0 },
  ],
};
