import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Liquid & Cloudy Mixing
 * Multi-octave fBm with double domain warping. Reads as slow dye / ink
 * diffusing through a viscous medium. Animation is driven only by the
 * circular loop vector, so the sequence is perfectly seamless.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_scale;    // zoom
uniform float u_p_warp;     // domain-warp strength
uniform float u_p_turb;     // turbulence detail
uniform float u_p_speed;    // motion travelled over one loop
uniform float u_p_contrast; // color contrast

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * u_p_scale + u_seed * 0.37;

  // Circular time sampling: a=0 and a=2PI produce identical frames.
  vec2 lt = loopVec(u_time);

  // First warp: large-scale cloudy billows drifting on the loop circle.
  vec2 q = vec2(
    fbm(p + lt * u_p_warp),
    fbm(p + vec2(5.2, 1.3) - lt * u_p_warp)
  );

  // Second warp: fine turbulent dye filaments.
  vec2 r = vec2(
    fbm(p + u_p_turb * q + vec2(1.7, 9.2) + lt * u_p_speed * 0.35),
    fbm(p + u_p_turb * q + vec2(8.3, 2.8) - lt * u_p_speed * 0.35)
  );

  float f = fbm(p + u_p_turb * r);
  f = pow(clamp(f * u_p_contrast, 0.0, 1.0), 1.15);

  // Secondary sample adds dye-mixing color variance.
  float g = fbm(p * 1.7 - r * 0.8 + lt * 0.25);

  vec3 col = PAL(clamp(f * 0.78 + g * 0.32, 0.0, 1.0));

  // Gentle vignette for a finished, commercial look.
  float vig = smoothstep(1.25, 0.35, length(uv - 0.5) * 1.6);
  col *= mix(0.72, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const fluidEngine: EngineDefinition = {
  id: "fluid",
  name: "Liquid Clouds",
  description:
    "Domain-warped fBm dye diffusion — slow ink-in-water clouds that loop seamlessly.",
  fragmentShader,
  defaultParams: {
    scale: 2.2,
    warp: 1.2,
    turb: 2.0,
    speed: 0.8,
    contrast: 1.15,
  },
  paramSchema: [
    { key: "scale", label: "Noise Scale", type: "slider", min: 0.5, max: 6, step: 0.05, default: 2.2 },
    { key: "warp", label: "Domain Warp", type: "slider", min: 0, max: 3, step: 0.05, default: 1.2 },
    { key: "turb", label: "Turbulence", type: "slider", min: 0, max: 4, step: 0.05, default: 2.0 },
    { key: "speed", label: "Flow Speed", type: "slider", min: 0, max: 2, step: 0.05, default: 0.8 },
    { key: "contrast", label: "Contrast", type: "slider", min: 0.5, max: 2.5, step: 0.05, default: 1.15 },
  ],
};
