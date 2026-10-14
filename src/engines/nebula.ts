import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Deep-Space Nebula
 * Warped fBm gas clouds over a hash-based starfield with periodic
 * twinkle. Star positions are fixed per seed; only brightness oscillates
 * (via sin(2a), which is 2PI-periodic), so the loop stays seamless.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_scale;   // cloud zoom
uniform float u_p_density; // cloud density
uniform float u_p_speed;   // drift over the loop
uniform float u_p_stars;   // star density

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * u_p_scale + u_seed * 1.7;

  vec2 lt = loopVec(u_time);

  // Gas clouds: double-warped fBm drifting on the loop circle.
  vec2 q = vec2(
    fbm(p + lt * 0.6),
    fbm(p + vec2(3.1, 7.7) - lt * 0.6)
  );
  float n = fbm(p + q * 1.8 + lt * u_p_speed * 0.4);
  n = pow(smoothstep(1.0 - u_p_density, 1.0, n), 1.35);

  vec3 col = PAL(clamp(n * 1.12, 0.0, 1.0)) * (0.22 + n * 1.1);

  // Starfield: stable cells, sub-cell jitter, periodic twinkle.
  vec2 sp = vec2(uv.x * aspect, uv.y) * (u_res.y / 9.0);
  vec2 cell = floor(sp);
  vec2 cellUv = fract(sp);
  float h = hash12(cell + u_seed * 0.13);
  vec2 off = (hash22(cell + u_seed * 0.71) - 0.5) * 0.7;
  float dstar = length(cellUv - 0.5 - off);
  float tw = 0.55 + 0.45 * sin(u_time * 2.0 + h * 40.0);
  float star = smoothstep(0.09, 0.0, dstar) * step(1.0 - u_p_stars * 0.14, h) * tw;
  // A few bright hero stars get a cross sparkle.
  float hero = step(0.9975, h) * smoothstep(0.16, 0.0, abs(cellUv.x - 0.5 - off.x) + abs(cellUv.y - 0.5 - off.y));
  col += vec3(0.85, 0.92, 1.0) * (star + hero * tw * 0.8);

  float vig = smoothstep(1.4, 0.3, length(uv - 0.5) * 1.7);
  col *= mix(0.62, 1.05, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const nebulaEngine: EngineDefinition = {
  id: "nebula",
  name: "Nebula Drift",
  description:
    "Deep-space gas clouds with a twinkling starfield — cosmic backgrounds.",
  fragmentShader,
  defaultParams: {
    scale: 1.8,
    density: 0.55,
    speed: 0.7,
    stars: 0.7,
  },
  paramSchema: [
    { key: "scale", label: "Cloud Scale", type: "slider", min: 0.5, max: 5, step: 0.05, default: 1.8 },
    { key: "density", label: "Cloud Density", type: "slider", min: 0.15, max: 0.95, step: 0.01, default: 0.55 },
    { key: "speed", label: "Drift Speed", type: "slider", min: 0, max: 2, step: 0.05, default: 0.7 },
    { key: "stars", label: "Star Density", type: "slider", min: 0, max: 1.5, step: 0.05, default: 0.7 },
  ],
};
