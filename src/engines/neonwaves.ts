import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Neon / Cybernetic Waves
 * Layered sine/cosine wave ribbons with exponential neon glow falloff.
 * Each layer oscillates on the loop circle with its own phase and rate,
 * so the composite is exactly periodic.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_layers; // number of wave ribbons (2..8)
uniform float u_p_freq;   // spatial frequency
uniform float u_p_amp;    // wave amplitude
uniform float u_p_speed;  // oscillation rate over the loop
uniform float u_p_glow;   // neon glow sharpness

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);

  vec2 lt = loopVec(u_time);

  // Dark base tinted by the first palette stop.
  vec3 col = PAL(0.02) * 0.22;

  int layers = int(u_p_layers + 0.5);
  for (int i = 0; i < 8; i++) {
    if (i >= layers) break;
    float fi = float(i);
    float ph = fi * 1.7 + u_seed * 0.5;

    float y = 0.5
      + sin(p.x * (u_p_freq * (0.7 + fi * 0.23)) + lt.x * u_p_speed * (1.0 + fi * 0.2) + ph)
          * u_p_amp * (0.35 + fi * 0.09)
      + cos(p.x * u_p_freq * 0.53 - lt.y * u_p_speed * 0.8 + ph * 1.3)
          * u_p_amp * 0.22;

    float d = abs(uv.y - y);
    float line = exp(-d * d * u_p_glow * 420.0);

    float t = fi / max(float(layers - 1), 1.0);
    col += PAL(t) * line * (1.25 - t * 0.45);
  }

  // Faint scanline shimmer for a cybernetic finish.
  float scan = 0.96 + 0.04 * sin(uv.y * u_res.y * 0.9 + lt.x * 3.0);
  col *= scan;

  float vig = smoothstep(1.35, 0.3, length(uv - 0.5) * 1.7);
  col *= mix(0.8, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const neonwavesEngine: EngineDefinition = {
  id: "neonwaves",
  name: "Neon Waves",
  description:
    "Layered glowing sine ribbons — cybernetic waveforms with neon falloff.",
  fragmentShader,
  defaultParams: {
    layers: 5,
    freq: 3.2,
    amp: 0.32,
    speed: 1.2,
    glow: 1.0,
  },
  paramSchema: [
    { key: "layers", label: "Wave Layers", type: "slider", min: 2, max: 8, step: 1, default: 5 },
    { key: "freq", label: "Frequency", type: "slider", min: 0.8, max: 9, step: 0.1, default: 3.2 },
    { key: "amp", label: "Amplitude", type: "slider", min: 0.05, max: 0.8, step: 0.01, default: 0.32 },
    { key: "speed", label: "Oscillation", type: "slider", min: 0, max: 3, step: 0.05, default: 1.2 },
    { key: "glow", label: "Neon Glow", type: "slider", min: 0.2, max: 3, step: 0.05, default: 1.0 },
  ],
};
