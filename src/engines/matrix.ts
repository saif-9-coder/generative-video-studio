import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Matrix Digital Rain
 * Columns of falling glyph blocks. Each column falls an integer number of
 * character rows per loop (fract-wrapped), so the cascade loops seamlessly.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_cols;   // column density
uniform float u_p_speed;  // fall speed multiplier
uniform float u_p_bright; // brightness
uniform float u_p_trail;  // trail length

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;

  float cols = floor(u_p_cols + 0.5);
  float rows = cols * 0.5625 / aspect * 2.2; // keep glyphs roughly square

  float colId = floor(uv.x * cols);
  float ch = hash12(vec2(colId * 1.37, floor(u_seed) + 4.2));
  // Integer rows-per-loop fall speed -> seamless fract wrap.
  float spd = (1.0 + floor(ch * 3.0)) * u_p_speed;
  float yy = fract(uv.y * rows - u_time * 0.15915 * rows * spd * 0.12 + ch * 7.0);

  // Glyph block pattern from hash of (column, row).
  float rowId = floor(uv.y * rows - u_time * 0.15915 * rows * spd * 0.12 + ch * 7.0);
  float g = hash12(vec2(colId * 7.7, rowId * 3.1));
  float glyph = step(0.35, g);

  // Column on/off + horizontal jitter for organic feel.
  float active = step(0.18, hash12(vec2(colId * 3.3, 9.9)));
  float jx = (hash12(vec2(colId, 1.1)) - 0.5) * 0.02;
  float inCol = smoothstep(0.5, 0.42, abs(fract(uv.x * cols + jx * cols) - 0.5));

  // Head glow at the leading edge, fading trail behind.
  float head = smoothstep(0.10, 0.0, yy);
  float trail = pow(1.0 - yy, 1.0 + u_p_trail * 2.0);

  vec3 col = vec3(0.008, 0.02, 0.015); // near-black green
  vec3 gcol = mix(u_palette[2], vec3(0.4, 1.0, 0.55), 0.4);
  vec3 hcol = mix(u_palette[4], vec3(0.9, 1.0, 0.9), 0.5);

  float m = glyph * active * inCol;
  col += gcol * m * trail * 0.85 * u_p_bright;
  col += hcol * m * head * 1.6 * u_p_bright;

  // Subtle screen vignette + scanlines.
  col *= 0.93 + 0.07 * sin(uv.y * u_res.y * 3.14159);
  float vig = smoothstep(1.35, 0.3, length(uv - 0.5) * 1.7);
  col *= mix(0.65, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const matrixEngine = {
  id: "matrix",
  name: "Digital Rain",
  description:
    "Matrix-style cascading code columns with glowing heads and fading trails.",
  fragmentShader,
  defaultParams: { cols: 64, speed: 1.2, bright: 1.0, trail: 1.0 },
  paramSchema: [
    { key: "cols", label: "Columns", type: "slider", min: 24, max: 140, step: 1, default: 64 },
    { key: "speed", label: "Fall Speed", type: "slider", min: 0.4, max: 2.5, step: 0.05, default: 1.2 },
    { key: "bright", label: "Brightness", type: "slider", min: 0.3, max: 2, step: 0.05, default: 1.0 },
    { key: "trail", label: "Trail Length", type: "slider", min: 0, max: 2.5, step: 0.05, default: 1.0 },
  ],
};
