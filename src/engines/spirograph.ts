import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Spirograph / Guilloché
 * Nested hypotrochoid-style rosettes: polar roses with integer lobe
 * counts rotating by integer turns per loop — fine security-document
 * geometry, perfectly seamless.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_lobes;  // rose lobe count
uniform float u_p_rings;  // nested ring count
uniform float u_p_width;  // line width
uniform float u_p_spin;   // integer spins per loop
uniform float u_p_glow;   // glow

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  float rr = length(p);
  float spin = floor(u_p_spin + 0.5);

  vec3 col = PAL(0.03) * 0.45;

  int rings = int(u_p_rings + 0.5);
  for (int j = 0; j < 4; j++) {
    if (j >= rings) break;
    float fj = float(j);
    float lobes = floor(u_p_lobes + fj * 2.0 + 0.5);
    float th = atan(p.y, p.x) + u_time * spin * (fj * 0.5 + 0.5) * (mod(fj, 2.0) * 2.0 - 1.0);
    // Polar rose: r = R * cos(k*theta), offset per ring.
    float target = 0.34 * cos(lobes * th) * (1.0 - fj * 0.18) + fj * 0.055;
    float d = abs(rr - abs(target));
    float w = 0.0035 * u_p_width;
    float line = smoothstep(w * 2.2, w * 0.4, d);
    float halo = exp(-d * 90.0 * u_p_glow) * 0.35;
    vec3 rcol = mix(u_palette[1], u_palette[3], fj / 3.0);
    // Fade lines near center singularity.
    float fade = smoothstep(0.015, 0.06, rr);
    col += rcol * (line * 1.15 + halo) * fade;
  }

  // Fine radial micro-ticks for guilloché richness.
  float ticks = smoothstep(0.94, 1.0, sin(atan(p.y, p.x) * 120.0 + u_time * spin) * 0.5 + 0.5);
  col += u_palette[2] * ticks * smoothstep(0.42, 0.36, rr) * smoothstep(0.28, 0.34, rr) * 0.25;

  float vig = smoothstep(0.95, 0.25, rr * 1.35);
  col *= mix(0.65, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const spirographEngine = {
  id: "spirograph",
  name: "Guilloché Rosettes",
  description:
    "Rotating spirograph rosettes — fine banknote-style geometric line art.",
  fragmentShader,
  defaultParams: { lobes: 7, rings: 3, width: 1.0, spin: 1, glow: 1.0 },
  paramSchema: [
    { key: "lobes", label: "Lobes", type: "slider", min: 3, max: 14, step: 1, default: 7 },
    { key: "rings", label: "Rings", type: "slider", min: 1, max: 4, step: 1, default: 3 },
    { key: "width", label: "Line Width", type: "slider", min: 0.3, max: 3, step: 0.05, default: 1.0 },
    { key: "spin", label: "Spins / Loop", type: "slider", min: 1, max: 3, step: 1, default: 1 },
    { key: "glow", label: "Glow", type: "slider", min: 0, max: 2, step: 0.05, default: 1.0 },
  ],
};
