import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Realistic Fire & Flames
 * fBm-eroded rising flame body, hash-based flickering ember sparks and a
 * soft smoke plume. Rising motion uses fract-wrapped coordinates that
 * complete an integer number of wraps per loop, so the sequence is seamless.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_scale;  // zoom
uniform float u_p_height; // flame height
uniform float u_p_turb;   // flame turbulence
uniform float u_p_embers; // ember density
uniform float u_p_smoke;  // smoke amount

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * u_p_scale + u_seed * 0.37;
  vec2 lt = loopVec(u_time);

  // Seamless rising coordinate: exactly 2 wraps per loop (2 / 2PI).
  float rise = fract(p.y * 1.5 - u_time * 0.31831 * 2.0);

  // Flame body: width narrows with height, eroded by rising fBm.
  float width = mix(0.55, 0.06, pow(uv.y, 0.8)) * u_p_height;
  float n = fbm(vec2(p.x * 2.0, rise * 3.0) + lt * u_p_turb * 0.6);
  float n2 = fbm(vec2(p.x * 5.0 + 9.1, rise * 6.0 - u_time * 0.0) + lt * 0.3);
  float body = width - abs(p.x - aspect * 0.5 * u_p_scale) + (n - 0.5) * 0.55 + (n2 - 0.5) * 0.22;
  float flame = smoothstep(0.0, 0.28, body) * smoothstep(1.05, 0.25, uv.y);

  // Hot core.
  float core = smoothstep(0.12, 0.5, body) * smoothstep(0.85, 0.1, uv.y);
  float heat = clamp(flame * 0.75 + core * 0.6, 0.0, 1.0);
  vec3 col = PAL(clamp(heat, 0.0, 1.0));
  col += vec3(1.0, 0.85, 0.6) * pow(core, 2.0) * 0.55;

  // Embers: grid sparks rising with integer row-shift per loop (seamless).
  vec2 eg = vec2(p.x * 14.0, p.y * 9.0 + u_time * 1.43239); // 9 / 2PI rows per loop
  vec2 eid = floor(eg);
  vec2 ef = fract(eg) - 0.5;
  float eh = hash12(eid + floor(u_seed));
  float spark = step(eh, u_p_embers * 0.28) * smoothstep(0.32, 0.05, length(ef));
  float flick = 0.55 + 0.45 * sin(u_time * 6.0 + eh * 40.0);
  float emberMask = smoothstep(1.0, 0.15, uv.y) * smoothstep(0.0, 0.25, uv.y);
  col += vec3(1.0, 0.45, 0.1) * spark * flick * emberMask * 1.4;

  // Smoke plume above the flame.
  float sn = fbm(p * 1.6 + vec2(lt.x * 0.8, rise * 1.2 - 0.4));
  float smoke = smoothstep(0.45, 0.9, sn) * smoothstep(0.35, 0.75, uv.y) * u_p_smoke;
  vec3 smokeCol = mix(vec3(0.12), PAL(0.12), 0.5);
  col = mix(col, smokeCol, clamp(smoke * 0.75, 0.0, 1.0));

  // Dark backdrop so flames read as stock footage.
  vec3 bg = PAL(0.02) * 0.35;
  col = mix(bg, col, clamp(flame + spark * emberMask + smoke, 0.0, 1.0));

  float vig = smoothstep(1.3, 0.3, length(uv - 0.5) * 1.7);
  col *= mix(0.7, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const fireEngine = {
  id: "fire",
  name: "Ember Fire",
  description:
    "Realistic rising flames with fBm erosion, flickering ember sparks and a drifting smoke plume.",
  fragmentShader,
  defaultParams: { scale: 1.6, height: 1.0, turb: 1.4, embers: 0.7, smoke: 0.8 },
  paramSchema: [
    { key: "scale", label: "Zoom", type: "slider", min: 0.8, max: 3.5, step: 0.05, default: 1.6 },
    { key: "height", label: "Flame Height", type: "slider", min: 0.4, max: 1.8, step: 0.05, default: 1.0 },
    { key: "turb", label: "Turbulence", type: "slider", min: 0, max: 3, step: 0.05, default: 1.4 },
    { key: "embers", label: "Embers", type: "slider", min: 0, max: 1.5, step: 0.05, default: 0.7 },
    { key: "smoke", label: "Smoke", type: "slider", min: 0, max: 1.5, step: 0.05, default: 0.8 },
  ],
};
