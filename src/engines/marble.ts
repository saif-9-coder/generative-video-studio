import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Liquid Marble / Acrylic Pour
 * Heavy double domain warping with thin swirling veins — hypnotic,
 * slow resin-pour patterns. All drift rides the circular loop vector.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_scale;    // zoom
uniform float u_p_warp;     // warp strength
uniform float u_p_veins;    // vein count
uniform float u_p_swirl;    // swirl motion per loop
uniform float u_p_contrast; // color contrast

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * u_p_scale + u_seed * 0.61;
  vec2 lt = loopVec(u_time);

  // Deep double warp for marble billows.
  vec2 q = vec2(
    fbm(p * 1.2 + lt * u_p_warp * 0.7),
    fbm(p * 1.2 + vec2(4.7, 2.9) - lt * u_p_warp * 0.7)
  );
  vec2 r = vec2(
    fbm(p * 1.6 + q * 2.2 + vec2(1.3, 7.7) + lt * u_p_swirl * 0.4),
    fbm(p * 1.6 + q * 2.2 + vec2(8.1, 3.4) - lt * u_p_swirl * 0.4)
  );

  float f = fbm(p * 1.4 + r * 1.8);

  // Thin swirling veins: sharpened sine ridges through the warp field.
  float v = abs(sin((r.x * u_p_veins + r.y * u_p_veins * 0.6 + lt.x * 0.35) * 3.14159));
  float veins = pow(1.0 - v, 24.0);

  float m = clamp(f * u_p_contrast, 0.0, 1.0);
  vec3 col = PAL(m);
  // Bright mineral veins pick up the lightest palette stop.
  col = mix(col, u_palette[4], clamp(veins * 0.85, 0.0, 1.0));
  // Dark crevices pick up the deepest stop.
  col = mix(col, u_palette[0], clamp(pow(1.0 - m, 3.0) * 0.55, 0.0, 1.0));

  float vig = smoothstep(1.25, 0.35, length(uv - 0.5) * 1.6);
  col *= mix(0.75, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const marbleEngine = {
  id: "marble",
  name: "Liquid Marble",
  description:
    "Acrylic-pour marble: heavy domain warping with thin swirling mineral veins.",
  fragmentShader,
  defaultParams: { scale: 2.0, warp: 1.8, veins: 3.0, swirl: 0.9, contrast: 1.25 },
  paramSchema: [
    { key: "scale", label: "Zoom", type: "slider", min: 0.8, max: 5, step: 0.05, default: 2.0 },
    { key: "warp", label: "Warp Strength", type: "slider", min: 0, max: 3.5, step: 0.05, default: 1.8 },
    { key: "veins", label: "Vein Density", type: "slider", min: 1, max: 8, step: 0.1, default: 3.0 },
    { key: "swirl", label: "Swirl Motion", type: "slider", min: 0, max: 2, step: 0.05, default: 0.9 },
    { key: "contrast", label: "Contrast", type: "slider", min: 0.5, max: 2.5, step: 0.05, default: 1.25 },
  ],
};
