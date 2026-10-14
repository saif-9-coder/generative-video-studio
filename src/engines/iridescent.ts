import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Soap Bubble / Thin-Film Iridescence
 * Large soft bubble forms drift on the loop circle; their surfaces show
 * rainbow thin-film interference that shifts hue over the loop.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_bubbles; // bubble count
uniform float u_p_film;    // interference frequency
uniform float u_p_drift;   // drift amount
uniform float u_p_gloss;   // rim gloss strength

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 lt = loopVec(u_time);

  // Deep blue-black liquid backdrop with soft caustic shimmer.
  float bg_n = fbm(p * 2.0 + lt * 0.4 + u_seed * 0.13);
  vec3 col = PAL(0.04) * (0.35 + bg_n * 0.5);

  int n = int(u_p_bubbles + 0.5);
  for (int i = 0; i < 5; i++) {
    if (i >= n) break;
    float fi = float(i);
    vec2 h = hash22(vec2(fi * 7.31, floor(u_seed) + 2.7));
    vec2 c = vec2(mix(0.25, aspect - 0.25, h.x), mix(0.2, 0.8, h.y));
    // Drift on a full circle: seamless by construction.
    c += u_p_drift * 0.35 * vec2(cos(u_time + fi * 2.4), sin(u_time + fi * 2.4));
    float rad = mix(0.10, 0.30, hash12(vec2(fi * 3.7, 5.1)));

    float d = length(p - c);
    float body = smoothstep(rad, rad * 0.82, d);

    // Thin-film interference: phase depends on radius + loop angle.
    float phase = (rad - d) * u_p_film * 40.0 - u_time * 2.0 + fi * 1.7;
    vec3 film = 0.5 + 0.5 * cos(phase + vec3(0.0, 2.094, 4.188));
    // Tint the rainbow through the palette for art direction.
    film = mix(film, PAL(clamp(0.5 + 0.5 * sin(phase * 0.5), 0.0, 1.0)), 0.45);

    // Bright rim with a glossy highlight offset.
    float rim = smoothstep(rad, rad * 0.94, d) * smoothstep(rad * 0.7, rad * 0.94, d);
    vec2 hl = normalize(vec2(-0.5, 0.75));
    float gloss = pow(clamp(dot(normalize(p - c + 0.0001), hl), 0.0, 1.0), 6.0)
                * smoothstep(rad, rad * 0.55, d);

    vec3 bcol = film * (0.25 + body * 0.75);
    bcol += vec3(1.0) * rim * u_p_gloss * 0.8;
    bcol += vec3(1.0, 0.98, 0.95) * gloss * u_p_gloss;

    float alpha = clamp(body + rim * 0.9, 0.0, 1.0);
    col = mix(col, bcol, alpha * 0.92);
  }

  float vig = smoothstep(1.3, 0.3, length(uv - 0.5) * 1.7);
  col *= mix(0.7, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const iridescentEngine = {
  id: "iridescent",
  name: "Thin-Film Bubbles",
  description:
    "Holographic soap bubbles with rainbow thin-film interference shifting over the loop.",
  fragmentShader,
  defaultParams: { bubbles: 3, film: 1.0, drift: 0.8, gloss: 1.0 },
  paramSchema: [
    { key: "bubbles", label: "Bubble Count", type: "slider", min: 1, max: 5, step: 1, default: 3 },
    { key: "film", label: "Film Frequency", type: "slider", min: 0.3, max: 2.5, step: 0.05, default: 1.0 },
    { key: "drift", label: "Drift", type: "slider", min: 0, max: 1.5, step: 0.05, default: 0.8 },
    { key: "gloss", label: "Gloss", type: "slider", min: 0, max: 2, step: 0.05, default: 1.0 },
  ],
};
