import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Dynamic Topographic Contours
 * fBm terrain elevation rendered as isolines that breathe and wave over
 * the loop — a best-seller style for corporate backgrounds.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_scale;  // terrain zoom
uniform float u_p_levels; // contour line count
uniform float u_p_drift;  // terrain drift per loop
uniform float u_p_width;  // line width
uniform float u_p_glow;   // line glow

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * u_p_scale + u_seed * 0.23;
  vec2 lt = loopVec(u_time);

  // Elevation field drifting on the loop circle.
  float e = fbm(p + lt * u_p_drift);
  e += 0.35 * fbm(p * 2.3 - lt * u_p_drift * 1.4);
  e = clamp(e * 1.15, 0.0, 1.0);

  // Isolines via fract; fixed-width smoothstep (WebGL1-safe, no fwidth).
  float f = fract(e * u_p_levels);
  float dline = abs(f - 0.5) * 2.0; // 0 at line center
  float line = smoothstep(1.0 - u_p_width * 0.25, 1.0, 1.0 - dline);
  float glow = pow(1.0 - dline, 3.0) * u_p_glow * 0.35;

  // Fill tint between contours, colored by elevation.
  vec3 col = PAL(0.06) * (0.5 + e * 0.6);
  vec3 lineCol = PAL(clamp(e, 0.0, 1.0));
  col += lineCol * (line * 1.1 + glow);

  // Occasional highlighted major contour every 5th line.
  float major = smoothstep(0.985, 1.0, 1.0 - abs(fract(e * u_p_levels / 5.0) - 0.5) * 2.0);
  col += u_palette[4] * major * 0.35;

  float vig = smoothstep(1.3, 0.35, length(uv - 0.5) * 1.65);
  col *= mix(0.72, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const topoEngine = {
  id: "topo",
  name: "Topo Contours",
  description:
    "Dynamic topographic map: fBm terrain isolines that wave and breathe seamlessly.",
  fragmentShader,
  defaultParams: { scale: 2.4, levels: 14, drift: 0.9, width: 1.0, glow: 0.8 },
  paramSchema: [
    { key: "scale", label: "Terrain Zoom", type: "slider", min: 0.8, max: 6, step: 0.05, default: 2.4 },
    { key: "levels", label: "Contour Lines", type: "slider", min: 5, max: 30, step: 1, default: 14 },
    { key: "drift", label: "Drift", type: "slider", min: 0, max: 2, step: 0.05, default: 0.9 },
    { key: "width", label: "Line Width", type: "slider", min: 0.2, max: 3, step: 0.05, default: 1.0 },
    { key: "glow", label: "Glow", type: "slider", min: 0, max: 2, step: 0.05, default: 0.8 },
  ],
};
