import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Lissajous Ribbon Lines
 * Three intertwined parametric ribbons drawn by min-distance sampling of
 * the curves. Phases advance by integer turns of the loop angle — seamless.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_freq;   // base frequency multiplier
uniform float u_p_thick;  // ribbon thickness
uniform float u_p_glow;    // glow falloff
uniform float u_p_turns;   // integer phase turns per loop
uniform float u_p_spread;  // ribbon separation

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  vec2 lt = loopVec(u_time);
  float turns = floor(u_p_turns + 0.5); // integer -> seamless rotation

  vec3 col = PAL(0.03) * 0.5;

  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float ph1 = fk * 2.1 + u_seed * 0.01;
    float ph2 = fk * 3.7;
    float fx = u_p_freq + fk * 1.0;
    float fy = u_p_freq * 1.5 + fk * 0.7;

    // Min distance to the parametric curve (sampled).
    float md = 10.0;
    for (int i = 0; i < 40; i++) {
      float s = float(i) / 40.0;
      float a = s * 6.28318;
      vec2 c = vec2(
        sin(a * fx + u_time * turns + ph1),
        cos(a * fy + u_time * turns * 0.999 + ph2)
      );
      // Gentle loop-circle wobble, keeps everything 2PI-periodic.
      c += lt * 0.08 * sin(a * 3.0 + fk);
      c *= 0.42 - fk * u_p_spread * 0.05;
      md = min(md, length(p - c));
    }

    float line = exp(-md * md / (u_p_thick * u_p_thick * 0.0012));
    float halo = exp(-md * u_p_glow * 6.0) * 0.4;
    vec3 rcol = mix(u_palette[1 + k], u_palette[2 + k], 0.5 + 0.5 * sin(u_time + fk * 2.0));
    col += rcol * (line * 1.2 + halo);
  }

  float vig = smoothstep(1.2, 0.3, length(p) * 1.9);
  col *= mix(0.7, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const lissajousEngine = {
  id: "lissajous",
  name: "Lissajous Ribbons",
  description:
    "Intertwined glowing Lissajous ribbons oscillating in perfect loop sync.",
  fragmentShader,
  defaultParams: { freq: 2.0, thick: 1.0, glow: 1.2, turns: 1, spread: 1.0 },
  paramSchema: [
    { key: "freq", label: "Frequency", type: "slider", min: 1, max: 5, step: 0.1, default: 2.0 },
    { key: "thick", label: "Thickness", type: "slider", min: 0.3, max: 2.5, step: 0.05, default: 1.0 },
    { key: "glow", label: "Glow", type: "slider", min: 0.3, max: 3, step: 0.05, default: 1.2 },
    { key: "turns", label: "Loop Turns", type: "slider", min: 1, max: 3, step: 1, default: 1 },
    { key: "spread", label: "Spread", type: "slider", min: 0, max: 2, step: 0.05, default: 1.0 },
  ],
};
