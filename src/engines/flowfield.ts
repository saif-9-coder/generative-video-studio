import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Generative Flow Fields & Lines
 * A Perlin-style vector field is derived from fBm; luminous streaks are
 * drawn perpendicular to the local flow direction and advected along it.
 * Everything is a closed function of the loop vector -> seamless.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_scale;  // field zoom
uniform float u_p_lines;  // line density
uniform float u_p_thick;  // line thickness
uniform float u_p_speed;  // advection speed over the loop
uniform float u_p_twist;  // field curl amount

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * u_p_scale + u_seed * 0.61;

  vec2 lt = loopVec(u_time);

  // Vector field from two offset fBm samples (cheap curl-ish field).
  float n1 = fbm(p * 1.5 + lt * u_p_speed);
  float n2 = fbm(p * 1.5 + vec2(4.7, 9.1) - lt * u_p_speed);
  float ang = (n1 - n2) * u_p_twist * 6.28318;
  vec2 dir = vec2(cos(ang), sin(ang));
  vec2 perp = vec2(-dir.y, dir.x);

  // Streak pattern: high-frequency stripes across the flow, warped along it.
  float along = dot(p, dir);
  float across = dot(p, perp);
  float warpStripe = fbm(vec2(along * 2.0, across * 2.0) + lt * 0.6) * 5.0;
  float s = sin(across * u_p_lines * 22.0 + warpStripe);
  float line = smoothstep(1.0 - u_p_thick * 0.85, 1.0, 1.0 - abs(s));

  // Under-glow advected along the flow direction.
  float glowField = fbm(p * 2.0 + dir * (lt.x * u_p_speed * 1.5));

  vec3 col = PAL(clamp(glowField * 0.6 + line * 0.55, 0.0, 1.0));
  col += PAL(clamp(0.55 + line * 0.4, 0.0, 1.0)) * line * 0.35;

  float vig = smoothstep(1.3, 0.4, length(uv - 0.5) * 1.7);
  col *= mix(0.68, 1.05, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const flowfieldEngine: EngineDefinition = {
  id: "flowfield",
  name: "Flow Field Lines",
  description:
    "Particles-as-streaks advected through a curling Perlin vector field.",
  fragmentShader,
  defaultParams: {
    scale: 3.0,
    lines: 1.4,
    thick: 0.55,
    speed: 1.0,
    twist: 1.6,
  },
  paramSchema: [
    { key: "scale", label: "Field Scale", type: "slider", min: 0.8, max: 8, step: 0.05, default: 3.0 },
    { key: "lines", label: "Line Count", type: "slider", min: 0.3, max: 4, step: 0.05, default: 1.4 },
    { key: "thick", label: "Line Thickness", type: "slider", min: 0.05, max: 1, step: 0.01, default: 0.55 },
    { key: "speed", label: "Flow Speed", type: "slider", min: 0, max: 2.5, step: 0.05, default: 1.0 },
    { key: "twist", label: "Field Curl", type: "slider", min: 0, max: 4, step: 0.05, default: 1.6 },
  ],
};
