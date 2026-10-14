import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Synthwave Wireframe Terrain
 * Retro 80s perspective grid scrolling toward the horizon (integer scroll
 * cycles per loop = seamless), gradient sky, scanline sun and ridge glow.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_speed; // scroll cycles per loop (integer)
uniform float u_p_grid;  // grid density
uniform float u_p_sun;   // sun size
uniform float u_p_glow;  // neon glow

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  float horizon = 0.52;
  float scrollN = floor(u_p_speed + 0.5);

  // --- Sky: vertical gradient through palette ---
  vec3 sky = PAL(clamp(1.0 - uv.y * 1.15, 0.0, 1.0));
  sky *= 0.55 + 0.2 * sin(uv.x * 3.0 + u_time);

  // --- Sun: disc with scanline slits, glow ---
  vec2 sp = vec2((uv.x - 0.5) * aspect, uv.y - (horizon + 0.16));
  float sunR = u_p_sun * 0.16;
  float sunD = length(sp);
  float slits = step(0.45, fract(uv.y * 60.0 + u_time * 0.0));
  float sun = smoothstep(sunR, sunR * 0.92, sunD);
  sun *= mix(1.0, slits, smoothstep(horizon + 0.16, horizon - 0.02, uv.y));
  vec3 sunCol = mix(u_palette[3], u_palette[4], smoothstep(sunR, 0.0, sunD));
  vec3 col = sky + sunCol * sun * 1.4;
  col += sunCol * exp(-sunD * 9.0) * 0.5 * u_p_glow;

  // --- Stars in upper sky ---
  vec2 sg = uv * vec2(aspect * 60.0, 60.0);
  float star = step(0.992, hash12(floor(sg) + floor(u_seed)));
  float tw = 0.5 + 0.5 * sin(u_time * 2.0 + hash12(floor(sg)) * 40.0);
  col += vec3(1.0) * star * tw * smoothstep(horizon + 0.05, horizon + 0.3, uv.y) * 0.8;

  // --- Terrain: perspective-projected grid ---
  if (uv.y < horizon) {
    float persp = (horizon - uv.y) / horizon; // 0 at horizon -> 1 at bottom
    vec2 gp = vec2((uv.x - 0.5) * aspect / max(persp, 0.03), persp);
    // Scroll completes integer cycles per loop -> seamless.
    float scroll = u_time * 0.15915 * scrollN;
    vec2 g = vec2(gp.x * u_p_grid * 0.14, fract(gp.y * u_p_grid * 0.5 - scroll) );
    vec2 gf = abs(fract(g) - 0.5);
    float line = smoothstep(0.5 - 0.035, 0.5, max(gf.x, gf.y));
    // Terrain elevation ridges silhouetted at horizon.
    float ridge = fbm(vec2(uv.x * 6.0 + u_seed, 3.3));
    float mtn = smoothstep(horizon, horizon - 0.10 * ridge - 0.02, uv.y);
    vec3 ground = PAL(0.05) * 0.7;
    vec3 gridCol = mix(u_palette[1], u_palette[2], persp);
    vec3 ter = mix(ground, gridCol * (line * 1.3 + 0.06), 1.0);
    ter += gridCol * exp(-persp * 2.2) * 0.55 * u_p_glow; // horizon glow
    col = mix(col, ter, 1.0);
    col = mix(col, PAL(0.02) * 0.6, mtn * 0.85);
  }

  // Horizon bloom line.
  col += mix(u_palette[2], u_palette[3], 0.5) * exp(-abs(uv.y - horizon) * 60.0) * 0.8;

  gl_FragColor = vec4(col, 1.0);
}
`;

export const synthwaveEngine = {
  id: "synthwave",
  name: "Synthwave Drive",
  description:
    "Retro wireframe terrain scrolling to a scanline sun — 80s outrun loop.",
  fragmentShader,
  defaultParams: { speed: 2, grid: 1.2, sun: 1.0, glow: 1.0 },
  paramSchema: [
    { key: "speed", label: "Scroll Cycles", type: "slider", min: 1, max: 4, step: 1, default: 2 },
    { key: "grid", label: "Grid Density", type: "slider", min: 0.5, max: 2.5, step: 0.05, default: 1.2 },
    { key: "sun", label: "Sun Size", type: "slider", min: 0.5, max: 1.8, step: 0.05, default: 1.0 },
    { key: "glow", label: "Neon Glow", type: "slider", min: 0, max: 2, step: 0.05, default: 1.0 },
  ],
};
