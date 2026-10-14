import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Ink in Water — plume pour look.
 * Thick ink streams pour down from the top through bright water, blooming
 * into cauliflower-turbulent plumes that pool and mix at the bottom — the
 * classic "colorful ink spread in underwater" stock footage look.
 * All motion is periodic in the loop angle, so the sequence loops seamlessly.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_plumes; // number of ink streams
uniform float u_p_spread; // column width
uniform float u_p_turb;   // billow detail
uniform float u_p_fall;   // churn speed
uniform float u_p_soft;   // edge softness
uniform float u_p_shade;  // crevice shading

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 lt = loopVec(u_time);

  // Bright water background, gently lit from above.
  vec3 water = mix(vec3(0.93, 0.95, 0.97), vec3(0.99, 0.995, 1.0), uv.y);

  vec3 bestCol = vec3(0.0);
  float best = 0.0;

  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    if (fi < u_p_plumes) {
      float ph = u_seed * 1.71 + fi * 2.399;
      vec2 h1 = hash22(vec2(ph, ph * 1.3));
      // Stratified positions: plumes spread evenly, small jitter.
      float x0 = mix(0.10, 0.90, (fi + 0.5 * h1.x + 0.25) / max(u_p_plumes, 1.0));
      float sway = 0.04 + 0.035 * h1.y;
      float w0 = u_p_spread * (0.55 + 0.6 * h1.y);
      // Pure palette stops: each plume gets its own distinct ink.
      vec3 dcol = PAL(fi * 0.25);

      // Meandering plume axis (periodic sway).
      float ax = x0 * aspect + sway * sin(uv.y * 4.5 + ph + u_time * 0.7);
      float dx = abs(p.x - ax);

      // Churn oscillates so the motion loops seamlessly.
      float churn = sin(u_time * u_p_fall + ph) * 0.5;

      // Gentle mushrooming: column widens slightly as it descends.
      float w = w0 * (0.75 + 1.0 * (1.0 - uv.y));

      // Billow field: big puffs + medium curls + fine fringe (isotropic).
      float b1 = fbm(p * 2.4 + vec2(lt.x * 0.5, churn * 0.9) + ph);
      float b2 = fbm(p * 5.5 + vec2(lt.y, -lt.x) * u_p_turb * 0.6 + ph * 1.7);
      float b3 = fbm(p * 11.0 - lt * u_p_turb * 0.8 + ph * 2.3);
      float billow = b1 * 0.50 + b2 * 0.32 + b3 * 0.18;
      float bil01 = clamp((billow - 0.28) / 0.48, 0.0, 1.0);

      // Puffy edge: billows push the ink boundary in and out.
      float d = dx / max(w, 1e-4);
      float edge = 0.66 - bil01 * 0.85 * (0.45 + u_p_turb * 0.40);
      float m = 1.0 - smoothstep(edge, edge + 0.30 + u_p_soft * 0.50, d);

      // Interior cloud texture + crevice shading for smoky depth.
      float tex = 0.60 + 0.80 * bil01;
      float shade = 1.0 - u_p_shade * 0.45 * (1.0 - b2);

      // Max-composite: overlapping plumes stay distinct, no muddy mixing.
      if (m > best) {
        best = m;
        bestCol = dcol * shade * tex;
      }
    }
  }

  float a = clamp(best * 1.25, 0.0, 1.0);
  vec3 col = mix(water, bestCol, a);

  float vig = smoothstep(1.35, 0.4, length(uv - 0.5) * 1.7);
  col *= mix(0.94, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const inkwaterEngine: EngineDefinition = {
  id: "inkwater",
  name: "Ink in Water",
  description:
    "Ink streams pouring down through bright water, blooming into turbulent plumes — the classic ink-spread stock look, seamlessly looped.",
  category: "fluid",
  fragmentShader,
  defaultParams: {
    plumes: 4,
    spread: 0.22,
    turb: 1.6,
    fall: 0.8,
    soft: 0.35,
    shade: 0.6,
  },
  paramSchema: [
    { key: "plumes", label: "Ink Streams", type: "slider", min: 2, max: 6, step: 1, default: 4 },
    { key: "spread", label: "Plume Width", type: "slider", min: 0.1, max: 0.5, step: 0.01, default: 0.22 },
    { key: "turb", label: "Billow Detail", type: "slider", min: 0, max: 3, step: 0.05, default: 1.6 },
    { key: "fall", label: "Churn Speed", type: "slider", min: 0, max: 2, step: 0.05, default: 0.8 },
    { key: "soft", label: "Edge Softness", type: "slider", min: 0, max: 1, step: 0.05, default: 0.35 },
    { key: "shade", label: "Depth Shading", type: "slider", min: 0, max: 1, step: 0.05, default: 0.6 },
  ],
};
