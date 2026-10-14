import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Bokeh & Floating Dust
 * Soft out-of-focus glowing discs in three parallax depth layers, drifting
 * on loop circles — wedding / luxury background aesthetic.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_count;  // disc density
uniform float u_p_soft;   // softness
uniform float u_p_drift;  // drift amount
uniform float u_p_bright; // brightness

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;

  // Deep gradient backdrop.
  vec3 col = PAL(0.05) * (0.5 + 0.3 * (1.0 - uv.y));

  for (int L = 0; L < 3; L++) {
    float fl = float(L);
    float layerScale = u_p_count * (1.0 + fl * 0.7);
    vec2 p = vec2(uv.x * aspect, uv.y) * layerScale + fl * 13.7 + u_seed * 0.11;

    vec2 ip = floor(p);
    vec2 fp = fract(p);
    vec2 h = hash22(ip);

    // Disc center drifts on a full circle -> seamless; deeper = slower.
    float sp = 1.0 / (1.0 + fl * 0.8);
    vec2 c = 0.5 + (h - 0.5) * 0.5
           + u_p_drift * 0.3 * sp * vec2(cos(u_time * sp + h.x * 6.28), sin(u_time * sp + h.y * 6.28));

    float rad = mix(0.10, 0.34, h.x) * (1.0 - fl * 0.22);
    float d = length(fp - c);

    // Soft disc with bright core ring (bokeh edge highlight).
    float disc = smoothstep(rad, rad * (1.0 - u_p_soft * 0.75), d);
    float edge = smoothstep(rad, rad * 0.86, d) * smoothstep(rad * 0.55, rad * 0.86, d);
    float depthFade = 1.0 - fl * 0.28;

    vec3 tint = mix(u_palette[2], u_palette[3], h.y);
    float tw = 0.6 + 0.4 * sin(u_time * (1.0 + fl * 0.5) + h.x * 40.0);
    col += tint * (disc * 0.55 + edge * 0.9) * tw * u_p_bright * depthFade;
  }

  // Fine floating dust.
  vec2 dp = vec2(uv.x * aspect, uv.y) * 40.0;
  vec2 dip = floor(dp);
  vec2 dfp = fract(dp) - 0.5;
  float dh = hash12(dip + floor(u_seed));
  vec2 dc = (hash22(dip + 5.0) - 0.5) * 0.7 + u_p_drift * 0.2 * vec2(cos(u_time + dh * 6.28), sin(u_time + dh * 6.28));
  float dust = step(dh, 0.3) * smoothstep(0.10, 0.02, length(dfp - dc));
  col += u_palette[4] * dust * 0.5;

  float vig = smoothstep(1.3, 0.3, length(uv - 0.5) * 1.7);
  col *= mix(0.68, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const bokehEngine = {
  id: "bokeh",
  name: "Bokeh Dreams",
  description:
    "Floating out-of-focus light discs with parallax depth — luxury ambience.",
  fragmentShader,
  defaultParams: { count: 4.0, soft: 1.0, drift: 0.9, bright: 1.0 },
  paramSchema: [
    { key: "count", label: "Disc Density", type: "slider", min: 1.5, max: 9, step: 0.1, default: 4.0 },
    { key: "soft", label: "Softness", type: "slider", min: 0.2, max: 1.6, step: 0.05, default: 1.0 },
    { key: "drift", label: "Drift", type: "slider", min: 0, max: 1.8, step: 0.05, default: 0.9 },
    { key: "bright", label: "Brightness", type: "slider", min: 0.3, max: 2, step: 0.05, default: 1.0 },
  ],
};
