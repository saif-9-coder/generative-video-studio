import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Liquid Metal Metaballs
 * 2D SDF field of seven mercury blobs orbiting on loop circles and
 * merging into a liquid-metal mass. Metallic shading via field gradient.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_goo;   // gooeyness (merge threshold)
uniform float u_p_metal; // metallic contrast
uniform float u_p_glow;   // glow

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) * 2.0;

  // Metaball field: sum of r^2 / d^2.
  float field = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 h = hash22(vec2(fi * 3.91, floor(u_seed) + 6.3));
    // Orbit on full circles with integer speeds -> seamless.
    float spd = 1.0 + mod(fi, 2.0);
    vec2 c = (h - 0.5) * 1.1
           + 0.42 * vec2(cos(u_time * spd + fi * 2.2), sin(u_time * spd + fi * 1.7));
    float r = mix(0.16, 0.30, hash12(vec2(fi * 7.7, 2.2)));
    vec2 d = p - c;
    field += (r * r) / max(dot(d, d), 0.0004);
  }
  field /= u_p_goo * 2.2;

  // Surface shading from the field gradient (finite differences).
  float e = 0.012;
  vec2 grad = vec2(0.0);
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 h = hash22(vec2(fi * 3.91, floor(u_seed) + 6.3));
    float spd = 1.0 + mod(fi, 2.0);
    vec2 c = (h - 0.5) * 1.1
           + 0.42 * vec2(cos(u_time * spd + fi * 2.2), sin(u_time * spd + fi * 1.7));
    float r = mix(0.16, 0.30, hash12(vec2(fi * 7.7, 2.2)));
    vec2 dx1 = p + vec2(e, 0.0) - c;
    vec2 dx0 = p - vec2(e, 0.0) - c;
    vec2 dy1 = p + vec2(0.0, e) - c;
    vec2 dy0 = p - vec2(0.0, e) - c;
    grad.x += (r * r) / max(dot(dx1, dx1), 0.0004) - (r * r) / max(dot(dx0, dx0), 0.0004);
    grad.y += (r * r) / max(dot(dy1, dy1), 0.0004) - (r * r) / max(dot(dy0, dy0), 0.0004);
  }
  grad /= (2.0 * e * u_p_goo * 2.2);

  float surf = smoothstep(0.85, 1.05, field);
  vec3 n = normalize(vec3(-grad * 0.35, 1.0));
  vec3 l = normalize(vec3(0.45, 0.6, 0.65));
  float dif = clamp(dot(n, l), 0.0, 1.0);
  float spec = pow(clamp(dot(reflect(-l, n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 24.0);

  vec3 col = PAL(0.04) * 0.55;
  // Environment reflection bands for liquid metal.
  float env = 0.5 + 0.5 * sin((n.x + n.y) * 6.0 + u_time);
  vec3 metal = mix(u_palette[0], u_palette[2], 0.3 + dif * 0.5);
  metal = mix(metal, u_palette[4], spec * u_p_metal);
  metal += u_palette[3] * env * 0.18 * u_p_metal;
  col = mix(col, metal * (0.4 + dif * 0.8) + vec3(1.0) * spec * 0.7, surf);

  // Glow halo hugging the surface.
  float halo = smoothstep(0.55, 0.95, field) * (1.0 - surf);
  col += u_palette[2] * halo * 0.5 * u_p_glow;

  float vig = smoothstep(1.5, 0.35, length(p) * 0.85);
  col *= mix(0.65, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const metaballsEngine = {
  id: "metaballs",
  name: "Liquid Metaballs",
  description:
    "Mercury blobs merging into liquid metal — organic SDF goo.",
  fragmentShader,
  defaultParams: { goo: 1.0, metal: 1.0, glow: 1.0 },
  paramSchema: [
    { key: "goo", label: "Gooeyness", type: "slider", min: 0.4, max: 2, step: 0.05, default: 1.0 },
    { key: "metal", label: "Metallic", type: "slider", min: 0.2, max: 2.5, step: 0.05, default: 1.0 },
    { key: "glow", label: "Halo Glow", type: "slider", min: 0, max: 2, step: 0.05, default: 1.0 },
  ],
};
