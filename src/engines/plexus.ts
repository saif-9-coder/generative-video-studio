import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Plexus / Constellation Network
 * Hash-grid nodes drift on loop circles; edges are drawn with the classic
 * Voronoi F2-F1 trick (distance between the two nearest nodes), so no O(n^2)
 * pair loop is needed. Fully seamless.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_density; // grid density
uniform float u_p_link;    // link distance threshold
uniform float u_p_glow;    // node glow
uniform float u_p_drift;   // node drift amount

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * u_p_density + u_seed * 0.17;
  vec2 lt = loopVec(u_time);

  vec2 ip = floor(p);
  vec2 fp = fract(p);

  // Two nearest node distances (Voronoi F1 / F2).
  float f1 = 8.0;
  float f2 = 8.0;
  vec2 nodeCol = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash22(ip + g + floor(u_seed));
      // Drift on a full circle per loop -> seamless.
      float ph = o.x * 6.28318;
      o = 0.5 + (o - 0.5) * 0.6 + u_p_drift * 0.22 * vec2(cos(u_time + ph), sin(u_time + ph));
      vec2 r = g + o - fp;
      float d = dot(r, r);
      if (d < f1) { f2 = f1; f1 = d; nodeCol = o; }
      else if (d < f2) { f2 = d; }
    }
  }
  f1 = sqrt(f1);
  f2 = sqrt(f2);

  vec3 col = PAL(0.02) * 0.55;

  // Edges where the two nearest nodes are almost equidistant and close.
  float edge = smoothstep(u_p_link, u_p_link * 0.55, f2 - f1) * smoothstep(u_p_link * 1.6, u_p_link * 0.4, f1);
  // Nodes as glowing dots.
  float node = exp(-f1 * f1 * 2600.0 * u_p_glow);
  float halo = exp(-f1 * 22.0) * 0.35 * u_p_glow;

  vec3 lineCol = mix(u_palette[2], u_palette[3], 0.5 + 0.5 * sin(u_time * 2.0 + f1 * 20.0));
  col += lineCol * edge * 0.85;
  col += u_palette[4] * node * 1.3;
  col += lineCol * halo;

  // Subtle drifting dust for depth.
  float dust = fbm(p * 0.5 + lt * 0.3);
  col += u_palette[1] * dust * 0.12;

  float vig = smoothstep(1.35, 0.35, length(uv - 0.5) * 1.7);
  col *= mix(0.7, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const plexusEngine = {
  id: "plexus",
  name: "Plexus Network",
  description:
    "Constellation node network with auto-connecting edges — neural/tech aesthetic.",
  fragmentShader,
  defaultParams: { density: 5.0, link: 0.16, glow: 1.0, drift: 0.8 },
  paramSchema: [
    { key: "density", label: "Node Density", type: "slider", min: 2, max: 10, step: 0.1, default: 5.0 },
    { key: "link", label: "Link Distance", type: "slider", min: 0.05, max: 0.4, step: 0.01, default: 0.16 },
    { key: "glow", label: "Node Glow", type: "slider", min: 0.3, max: 2.5, step: 0.05, default: 1.0 },
    { key: "drift", label: "Drift", type: "slider", min: 0, max: 1.5, step: 0.05, default: 0.8 },
  ],
};
