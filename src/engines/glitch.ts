import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Digital Glitch
 * RGB channel splitting, scanline block displacement and periodic glitch
 * bursts. Burst timing uses integer-harmonic sines so bursts land
 * identically at loop start/end — seamless.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_intense; // glitch intensity
uniform float u_p_rate;    // burst rate (integer harmonics)
uniform float u_p_rgb;     // RGB shift amount
uniform float u_p_scan;    // scanline amount

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  float rate = floor(u_p_rate + 0.5);

  // Base animated gradient field.
  vec2 p = vec2(uv.x * aspect, uv.y) * 2.2 + u_seed * 0.07;
  vec2 lt = loopVec(u_time);
  float base = fbm(p + lt * 0.8);

  // Glitch burst envelope: periodic, zero at loop seam.
  float burst = pow(0.5 + 0.5 * sin(u_time * rate * 2.0 + 1.3), 6.0);

  // Block displacement: rows shifted by hash of (row, quantized burst phase).
  float row = floor(uv.y * 28.0);
  float qphase = floor((0.5 + 0.5 * sin(u_time * rate)) * 6.0);
  float shift = (hash12(vec2(row * 1.7, qphase * 3.3 + floor(u_seed))) - 0.5)
              * burst * 0.35 * u_p_intense;

  // Sample the field 3x with RGB offsets.
  float r = fbm(p + vec2(shift + u_p_rgb * burst * 0.6, 0.0) + lt * 0.8);
  float g = fbm(p + vec2(shift, 0.0) + lt * 0.8);
  float b = fbm(p + vec2(shift - u_p_rgb * burst * 0.6, 0.0) + lt * 0.8);

  vec3 col = vec3(PAL(clamp(r, 0.0, 1.0)).r, PAL(clamp(g, 0.0, 1.0)).g, PAL(clamp(b, 0.0, 1.0)).b);

  // Horizontal tear lines during bursts.
  float tear = step(0.965, hash12(vec2(row, qphase))) * burst;
  col = mix(col, u_palette[4], tear * 0.7);

  // Chromatic edge streaks.
  col += vec3(1.0, 0.2, 0.5) * abs(shift) * 8.0 * burst;

  // Scanlines.
  col *= 1.0 - u_p_scan * 0.25 * (0.5 + 0.5 * sin(uv.y * u_res.y * 3.14159));

  // Digital noise pops.
  float nz = step(0.997 - burst * 0.02, hash12(uv * u_res * 0.25 + qphase));
  col += vec3(nz) * 0.6;

  float vig = smoothstep(1.35, 0.35, length(uv - 0.5) * 1.7);
  col *= mix(0.7, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const glitchEngine = {
  id: "glitch",
  name: "RGB Glitch",
  description:
    "Digital glitch bursts: RGB splits, block displacement and scanlines.",
  fragmentShader,
  defaultParams: { intense: 1.0, rate: 2, rgb: 1.0, scan: 0.7 },
  paramSchema: [
    { key: "intense", label: "Intensity", type: "slider", min: 0.2, max: 2.5, step: 0.05, default: 1.0 },
    { key: "rate", label: "Burst Rate", type: "slider", min: 1, max: 5, step: 1, default: 2 },
    { key: "rgb", label: "RGB Shift", type: "slider", min: 0, max: 2.5, step: 0.05, default: 1.0 },
    { key: "scan", label: "Scanlines", type: "slider", min: 0, max: 1.5, step: 0.05, default: 0.7 },
  ],
};
