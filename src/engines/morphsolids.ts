import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Morphing Platonic Solids (raymarched SDF)
 * cube -> sphere -> torus -> octahedron driven by a triangle wave over the
 * loop angle (0->1->0), so the morph is perfectly seamless.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_size;   // solid size
uniform float u_p_smooth; // morph smoothing
uniform float u_p_glow;   // rim glow

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}
float sdOct(vec3 p, float s) {
  p = abs(p);
  return (p.x + p.y + p.z - s) * 0.57735027;
}
mat3 rotY(float a) {
  float c = cos(a), s = sin(a);
  return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
}

float sstep(float a, float b, float x) {
  return smoothstep(a - u_p_smooth * 0.25, b + u_p_smooth * 0.25, x);
}

float mapMorph(vec3 p, float m3) {
  float s = u_p_size;
  float dBox = sdBox(p, vec3(s * 0.8));
  float dSph = length(p) - s;
  float dTor = length(vec2(length(p.xy) - s * 0.72, p.z)) - s * 0.30;
  float dOct = sdOct(p, s * 1.35);
  float d1 = mix(dBox, dSph, sstep(0.0, 1.0, m3));
  float d2 = mix(dTor, dOct, sstep(2.0, 3.0, m3));
  return mix(d1, d2, sstep(1.0, 2.0, m3));
}

vec3 calcNormal(vec3 p, float m3) {
  vec2 e = vec2(0.008, 0.0);
  return normalize(vec3(
    mapMorph(p + e.xyy, m3) - mapMorph(p - e.xyy, m3),
    mapMorph(p + e.yxy, m3) - mapMorph(p - e.yxy, m3),
    mapMorph(p + e.yyx, m3) - mapMorph(p - e.yyx, m3)));
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 ndc = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) * 2.0;

  // Triangle wave over the loop: 0 -> 1 -> 0, seamless.
  float tri = abs(fract(u_time * 0.15915) - 0.5) * 2.0;
  float m3 = tri * 3.0;

  vec3 ro = vec3(0.0, 0.0, 3.0);
  vec3 rd = normalize(vec3(ndc, -1.7));
  // Solid rotates exactly one turn per loop.
  vec3 prd = rotY(-u_time) * rd;
  vec3 pro = rotY(-u_time) * ro;

  float t = 0.0;
  int i = 0;
  for (i = 0; i < 40; i++) {
    float d = mapMorph(pro + prd * t, m3);
    if (d < 0.003 || t > 8.0) break;
    t += d * 0.9;
  }

  vec3 col = PAL(0.03) * 0.55;
  col += u_palette[1] * fbm(ndc * 1.6 + vec2(cos(u_time), sin(u_time)) * 0.25) * 0.12;

  if (t < 8.0) {
    vec3 p = pro + prd * t;
    vec3 n = calcNormal(p, m3);
    vec3 l = normalize(vec3(0.5, 0.7, 0.6));
    float dif = clamp(dot(n, l), 0.0, 1.0);
    float fres = pow(1.0 - clamp(dot(n, -prd), 0.0, 1.0), 2.5);
    vec3 base = mix(u_palette[0], u_palette[2], 0.45 + dif * 0.45);
    col = base * (0.35 + dif * 0.85) + u_palette[3] * fres * u_p_glow;
    // Morph-stage accent: hue shifts as the solid transforms.
    col += u_palette[1] * (0.5 + 0.5 * sin(m3 * 2.1)) * 0.25;
  }

  float vig = smoothstep(1.5, 0.3, length(ndc) * 0.75);
  col *= mix(0.6, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const morphsolidsEngine = {
  id: "morphsolids",
  name: "Morphing Solids",
  description:
    "A solid that melts cube to sphere to torus to octahedron, endlessly.",
  fragmentShader,
  defaultParams: { size: 0.85, smooth: 0.8, glow: 1.0 },
  paramSchema: [
    { key: "size", label: "Size", type: "slider", min: 0.4, max: 1.3, step: 0.01, default: 0.85 },
    { key: "smooth", label: "Morph Smooth", type: "slider", min: 0.1, max: 1.6, step: 0.05, default: 0.8 },
    { key: "glow", label: "Rim Glow", type: "slider", min: 0, max: 2.5, step: 0.05, default: 1.0 },
  ],
};
