import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Floating Crystals (raymarched SDF)
 * Three octahedron crystals orbiting on loop circles, rotating by exactly
 * one turn per loop. Iridescent fresnel shading. 40 march steps.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_size;   // crystal size
uniform float u_p_irid;   // iridescence strength
uniform float u_p_glow;   // glow

float sdOct(vec3 p, float s) {
  p = abs(p);
  return (p.x + p.y + p.z - s) * 0.57735027;
}

mat3 rotY(float a) {
  float c = cos(a), s = sin(a);
  return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
}
mat3 rotX(float a) {
  float c = cos(a), s = sin(a);
  return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
}

float mapCrystals(vec3 p) {
  float d = 1e5;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float ph = fi * 2.094 + u_seed * 0.01;
    // Orbit on a full circle -> seamless.
    vec3 c = vec3(cos(u_time + ph) * 0.85, sin(u_time * 1.0 + ph * 1.3) * 0.55, -0.4 - fi * 0.5);
    vec3 q = rotY(u_time + fi * 2.0) * rotX(u_time * 0.7 + fi) * (p - c);
    float s = u_p_size * (1.0 - fi * 0.18);
    d = min(d, sdOct(q, s));
  }
  // Floor reflection plane for grounding.
  d = min(d, p.y + 1.15);
  return d;
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.008, 0.0);
  return normalize(vec3(
    mapCrystals(p + e.xyy) - mapCrystals(p - e.xyy),
    mapCrystals(p + e.yxy) - mapCrystals(p - e.yxy),
    mapCrystals(p + e.yyx) - mapCrystals(p - e.yyx)));
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 ndc = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) * 2.0;

  vec3 ro = vec3(0.0, 0.15, 2.6);
  vec3 rd = normalize(vec3(ndc, -1.6));

  float t = 0.0;
  int i = 0;
  for (i = 0; i < 40; i++) {
    float d = mapCrystals(ro + rd * t);
    if (d < 0.003 || t > 9.0) break;
    t += d * 0.9;
  }

  vec3 col = PAL(0.03) * 0.5;
  // Ambient dust.
  col += u_palette[1] * fbm(ndc * 2.0 + vec2(cos(u_time), sin(u_time)) * 0.3) * 0.15;

  if (t < 9.0) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    vec3 l = normalize(vec3(0.6, 0.8, 0.5));
    float dif = clamp(dot(n, l), 0.0, 1.0);
    float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0);
    vec3 irid = 0.5 + 0.5 * cos(6.28318 * (fres * 1.4 + u_p_irid * 0.4) + vec3(0.0, 2.094, 4.188));
    irid = mix(irid, PAL(clamp(fres, 0.0, 1.0)), 0.5);
    vec3 base = mix(u_palette[0] * 0.4, u_palette[2], 0.35 + dif * 0.4);
    col = base * (0.35 + dif * 0.75) + irid * fres * u_p_irid + u_palette[4] * pow(fres, 6.0) * 0.8;
  }

  // Glow sprites at crystal cores.
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float ph = fk * 2.094 + u_seed * 0.01;
    vec2 c2 = vec2(cos(u_time + ph) * 0.85, sin(u_time + ph * 1.3) * 0.55);
    vec2 pp = (ndc - c2 * vec2(1.0, 1.0)) ;
    col += u_palette[3] * exp(-dot(pp, pp) * 22.0) * 0.35 * u_p_glow;
  }

  float vig = smoothstep(1.5, 0.3, length(ndc) * 0.75);
  col *= mix(0.6, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const crystalsEngine = {
  id: "crystals",
  name: "Iridescent Crystals",
  description:
    "Raymarched floating octahedron crystals with fresnel iridescence.",
  fragmentShader,
  defaultParams: { size: 0.42, irid: 1.0, glow: 1.0 },
  paramSchema: [
    { key: "size", label: "Crystal Size", type: "slider", min: 0.2, max: 0.7, step: 0.01, default: 0.42 },
    { key: "irid", label: "Iridescence", type: "slider", min: 0, max: 2.5, step: 0.05, default: 1.0 },
    { key: "glow", label: "Core Glow", type: "slider", min: 0, max: 2, step: 0.05, default: 1.0 },
  ],
};
