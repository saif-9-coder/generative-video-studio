import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Energy Vortex / Accretion Disk
 * Spiral luminous gas streams around a dark core. Spiral phase advances by
 * integer turns per loop; doppler-style brightness asymmetry oscillates
 * with cos(theta - u_time) — all seamless.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_arms;  // spiral arms (integer)
uniform float u_p_twist; // spiral twist
uniform float u_p_spin;  // integer spins per loop
uniform float u_p_disk;  // disk size

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  float r = length(p);
  float th = atan(p.y, p.x);
  float arms = floor(u_p_arms + 0.5);
  float spin = floor(u_p_spin + 0.5);

  // Spiral coordinate: integer spins per loop -> seamless.
  float sp = fract(arms * th / 6.28318 + log(max(r, 0.02)) * u_p_twist - u_time * 0.15915 * spin * arms * 0.25);
  float streams = pow(0.5 + 0.5 * sin(sp * 6.28318), 2.0);

  // Disk profile: hot inner rim, fading outer edge.
  float disk = smoothstep(u_p_disk, u_p_disk * 0.55, r) * smoothstep(0.02, 0.10, r);
  float rim = exp(-pow((r - u_p_disk * 0.42) * 9.0, 2.0));

  // Doppler-style asymmetry: one side brighter, oscillating seamlessly.
  float doppler = 1.0 + 0.55 * cos(th - u_time);

  // Turbulent filaments in the gas.
  float fil = fbm(vec2(th * 3.0, r * 8.0 - u_time * 0.0) + vec2(0.0, u_time * 0.0));
  fil = fbm(p * 6.0 + vec2(cos(u_time), sin(u_time)) * 0.8);

  vec3 col = vec3(0.004, 0.004, 0.01);
  vec3 gas = PAL(clamp(0.25 + streams * 0.55 + rim * 0.35, 0.0, 1.0));
  col += gas * disk * (0.35 + streams * 0.9) * doppler;
  col += u_palette[4] * rim * 1.5 * doppler;
  col += gas * fil * disk * 0.35;

  // Black hole core.
  float bh = smoothstep(u_p_disk * 0.30, u_p_disk * 0.16, r);
  col = mix(col, vec3(0.0), bh);
  // Photon ring.
  col += u_palette[3] * exp(-pow((r - u_p_disk * 0.30) * 26.0, 2.0)) * 1.2;

  // Lensing streaks.
  float lens = exp(-abs(p.y) * 22.0) * exp(-r * 2.2) * (0.5 + 0.5 * sin(u_time * 2.0));
  col += u_palette[2] * lens * 0.35;

  float vig = smoothstep(1.25, 0.25, length(p) * 1.5);
  col *= mix(0.6, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const vortexEngine = {
  id: "vortex",
  name: "Accretion Vortex",
  description:
    "Black-hole accretion disk: spiral gas streams with doppler asymmetry.",
  fragmentShader,
  defaultParams: { arms: 3, twist: 1.6, spin: 2, disk: 0.42 },
  paramSchema: [
    { key: "arms", label: "Spiral Arms", type: "slider", min: 2, max: 6, step: 1, default: 3 },
    { key: "twist", label: "Twist", type: "slider", min: 0.4, max: 3.5, step: 0.05, default: 1.6 },
    { key: "spin", label: "Spins / Loop", type: "slider", min: 1, max: 4, step: 1, default: 2 },
    { key: "disk", label: "Disk Size", type: "slider", min: 0.2, max: 0.7, step: 0.01, default: 0.42 },
  ],
};
