import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Anamorphic Light Leaks
 * Soft colored streaks sweeping diagonally across a near-black frame —
 * designed as an overlay-style asset (dark bg, additive feel).
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_streaks; // streak count
uniform float u_p_intense; // intensity
uniform float u_p_sweep;   // sweep amount
uniform float u_p_soft;    // softness

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);

  vec3 col = vec3(0.004, 0.004, 0.008);

  int n = int(u_p_streaks + 0.5);
  for (int i = 0; i < 4; i++) {
    if (i >= n) break;
    float fi = float(i);
    float h = hash12(vec2(fi * 5.13, floor(u_seed) + 8.8));

    // Diagonal streak: distance to a sweeping line. Sweep is sinusoidal -> seamless.
    float m = mix(-0.9, -0.35, h);
    float b = mix(0.1, 0.9, fract(h * 7.0)) + u_p_sweep * 0.55 * sin(u_time + fi * 1.9);
    float d = abs(p.y - (m * p.x + b));

    float streak = exp(-d * d / (0.0016 * u_p_soft * u_p_soft));
    // Anamorphic horizontal stretch: elongate the glow along x.
    float ax = exp(-pow((p.x - aspect * 0.5) * 1.4, 2.0) * 0.8);

    vec3 scol = mix(u_palette[2], u_palette[3], fract(h * 3.0));
    // Rainbow fringe at streak edges (chromatic feel).
    float fringe = exp(-pow((d - 0.05 * u_p_soft) * 14.0, 2.0));
    col += scol * streak * (0.35 + ax) * u_p_intense;
    col += vec3(1.0, 0.6, 0.9) * fringe * 0.25 * u_p_intense;
  }

  // Corner bloom that breathes with the loop.
  float bloom = exp(-pow(length(p - vec2(aspect * 0.85, 0.9)) * 2.0, 2.0));
  bloom *= 0.6 + 0.4 * sin(u_time * 2.0);
  col += u_palette[1] * bloom * 0.5 * u_p_intense;

  // Fine grain for a filmic finish.
  col += (hash12(uv * u_res * 0.5 + fract(u_time) * 7.0) - 0.5) * 0.035;

  gl_FragColor = vec4(col, 1.0);
}
`;

export const lightleakEngine = {
  id: "lightleak",
  name: "Light Leaks",
  description:
    "Anamorphic light streaks sweeping over black — overlay-ready lens leaks.",
  fragmentShader,
  defaultParams: { streaks: 3, intense: 1.0, sweep: 0.8, soft: 1.0 },
  paramSchema: [
    { key: "streaks", label: "Streaks", type: "slider", min: 1, max: 4, step: 1, default: 3 },
    { key: "intense", label: "Intensity", type: "slider", min: 0.2, max: 2.5, step: 0.05, default: 1.0 },
    { key: "sweep", label: "Sweep", type: "slider", min: 0, max: 1.6, step: 0.05, default: 0.8 },
    { key: "soft", label: "Softness", type: "slider", min: 0.4, max: 2.5, step: 0.05, default: 1.0 },
  ],
};
