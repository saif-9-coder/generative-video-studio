import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Infinite Fractal Tunnel (raymarched)
 * Kaleidoscopic folded tunnel with a z-period that advances by an integer
 * number of periods per loop — the camera appears to fly forward forever
 * while frame N == frame 0. 40 march steps keep preview realtime.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_cycles; // tunnel periods per loop (integer)
uniform float u_p_radius; // tunnel radius
uniform float u_p_glow;   // wall glow

float mapTunnel(vec3 p, float cyc) {
  // Kaleidoscopic fold.
  p.xy = abs(p.xy) - 0.45;
  float ca = cos(u_time);
  float sa = sin(u_time);
  p.xy = mat2(ca, -sa, sa, ca) * p.xy;
  // Scroll the pattern: integer periods per loop -> seamless.
  p.z = mod(p.z + u_time * 0.15915 * 4.0 * cyc, 4.0) - 2.0;
  float d = length(p.xy) - u_p_radius;
  d += 0.07 * sin(p.z * 4.5 + u_time * 2.0);
  return d;
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 ndc = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) * 2.0;
  float cyc = floor(u_p_cycles + 0.5);

  vec3 ro = vec3(0.0, 0.0, 1.6);
  vec3 rd = normalize(vec3(ndc, -1.4));

  float t = 0.0;
  float glow = 0.0;
  int i = 0;
  for (i = 0; i < 40; i++) {
    vec3 p = ro + rd * t;
    float d = mapTunnel(p, cyc);
    glow += 0.06 / (0.4 + abs(d) * 8.0);
    if (d < 0.002 || t > 12.0) break;
    t += d * 0.85;
  }

  float depth = 1.0 - clamp(t / 12.0, 0.0, 1.0);
  float steps = float(i) / 40.0;
  vec3 col = PAL(clamp(depth * 0.85 + steps * 0.25, 0.0, 1.0));
  col += u_palette[3] * glow * u_p_glow * 0.5;
  col *= 0.35 + depth * 0.9;

  // Speed lines near the edges.
  float sl = smoothstep(0.6, 1.3, length(ndc));
  col += u_palette[2] * sl * 0.12 * (0.6 + 0.4 * sin(u_time * 4.0));

  float vig = smoothstep(1.4, 0.3, length(ndc) * 0.8);
  col *= mix(0.55, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const fractaltunnelEngine = {
  id: "fractaltunnel",
  name: "Fractal Tunnel",
  description:
    "Raymarched kaleidoscopic tunnel — an endless forward flight, loop-safe.",
  fragmentShader,
  defaultParams: { cycles: 2, radius: 0.34, glow: 1.0 },
  paramSchema: [
    { key: "cycles", label: "Cycles / Loop", type: "slider", min: 1, max: 4, step: 1, default: 2 },
    { key: "radius", label: "Tunnel Radius", type: "slider", min: 0.15, max: 0.6, step: 0.01, default: 0.34 },
    { key: "glow", label: "Wall Glow", type: "slider", min: 0, max: 2.5, step: 0.05, default: 1.0 },
  ],
};
