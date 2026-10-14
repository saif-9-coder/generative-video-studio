import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Ink in Water
 * Procedural underwater ink dispersion: vibrant dye drops bloom, drift and
 * billow through deep water, edges eroded by domain-warped turbulence, with
 * tendril trails sampled from each drop's own past positions. Every drop's
 * motion is periodic in the loop angle, so the sequence loops seamlessly —
 * like the classic "colorful ink spread in underwater" stock footage.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_drops; // number of ink drops
uniform float u_p_spread; // bloom radius
uniform float u_p_turb;   // edge turbulence
uniform float u_p_rise;   // upward billow
uniform float u_p_soft;   // edge softness
uniform float u_p_glow;   // ink luminosity

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 lt = loopVec(u_time);

  // Deep-water background with soft light falling from above.
  vec3 water = mix(vec3(0.02, 0.09, 0.18), u_palette[0] * 0.55, 0.6);
  water += vec3(0.03, 0.08, 0.12) * smoothstep(0.3, 1.0, uv.y);

  vec3 inkCol = vec3(0.0);
  float dens = 0.0;

  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    if (fi < u_p_drops) {
      float ph = u_seed * 1.71 + fi * 2.399;
      vec2 h1 = hash22(vec2(ph, ph * 1.3));
      vec2 base = vec2(mix(0.15, 0.85, h1.x) * aspect, mix(0.2, 0.8, h1.y));
      float sp1 = 0.6 + 0.12 * h1.x;
      float sp2 = 0.5 + 0.10 * h1.y;

      // Bloom pulsation: each drop blooms then settles, seamlessly.
      float bloom = 0.55 + 0.45 * sin(u_time + ph * 2.0);
      float R = u_p_spread * (0.35 + 0.65 * bloom) * (0.7 + 0.5 * h1.y);
      vec3 dcol = PAL(fract(ph * 0.618));

      // Tendril trail: sample the drop's own past positions (periodic).
      for (int k = 0; k < 3; k++) {
        float fk = float(k);
        float back = fk * 0.38;
        float a = u_time - back;
        vec2 ck = base + vec2(cos(a * sp1 + ph), sin(a * sp2 + ph * 1.7)) * 0.22;
        ck.y += u_p_rise * 0.16 * sin(u_time + ph) * (1.0 - fk * 0.2);
        float Rk = R * (1.0 - fk * 0.24);

        vec2 q = p - ck;
        // Filament erosion: high-frequency ridged noise carves thin tendrils
        // into the plume edge, like real dispersing ink.
        float fil = 1.0 - abs(2.0 * fbm(p * 7.0 + lt * u_p_turb * 2.2 + ph * 3.1) - 1.0);
        float er = (fbm(p * 3.0 + lt * u_p_turb + ph) - 0.5) * u_p_turb * 0.5 * R
                 + (fil - 0.5) * u_p_turb * 0.45 * R;
        float d = length(q * vec2(1.0, 1.9)) + er; // tall rising plumes
        float core = 1.0 - smoothstep(Rk * 0.25, Rk * 0.9, d);
        float edge = 1.0 - smoothstep(Rk * (1.0 - u_p_soft * 0.7), Rk * (1.0 + u_p_soft * 1.4), d);
        float m = clamp(core * 1.15 + edge * 0.85, 0.0, 1.6);
        float w = m * (1.0 - fk * 0.28);
        dens += w;
        inkCol += w * dcol;
      }
    }
  }

  vec3 icol = dens > 0.001 ? inkCol / max(dens, 1e-3) : vec3(0.0);
  float alpha = clamp(dens * 0.55, 0.0, 1.0);
  vec3 col = mix(water, icol, alpha);
  col += icol * u_p_glow * alpha * 0.35;

  float vig = smoothstep(1.3, 0.35, length(uv - 0.5) * 1.7);
  col *= mix(0.7, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const inkwaterEngine: EngineDefinition = {
  id: "inkwater",
  name: "Ink in Water",
  description:
    "Colorful ink drops blooming and billowing underwater — the classic ink-spread stock look, seamlessly looped.",
  category: "fluid",
  fragmentShader,
  defaultParams: {
    drops: 5,
    spread: 0.3,
    turb: 1.4,
    rise: 0.8,
    soft: 0.45,
    glow: 0.8,
  },
  paramSchema: [
    { key: "drops", label: "Ink Drops", type: "slider", min: 3, max: 8, step: 1, default: 5 },
    { key: "spread", label: "Spread", type: "slider", min: 0.1, max: 0.6, step: 0.01, default: 0.3 },
    { key: "turb", label: "Turbulence", type: "slider", min: 0, max: 3, step: 0.05, default: 1.4 },
    { key: "rise", label: "Rise / Billow", type: "slider", min: 0, max: 2, step: 0.05, default: 0.8 },
    { key: "soft", label: "Edge Softness", type: "slider", min: 0, max: 1, step: 0.05, default: 0.45 },
    { key: "glow", label: "Ink Glow", type: "slider", min: 0, max: 2, step: 0.05, default: 0.8 },
  ],
};
