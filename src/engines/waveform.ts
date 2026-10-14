import { COMMON_GLSL } from "./shaders";
import type { EngineDefinition } from "./registry";

/**
 * Audio-Reactive Style Equalizer
 * Procedural pseudo-spectrum (seeded sums of integer-harmonic sines) drives
 * pulsing EQ bars plus a waveform ribbon. All harmonics are 2PI-periodic.
 */
const fragmentShader =
  COMMON_GLSL +
  /* glsl */ `
uniform float u_p_bars;    // bar count
uniform float u_p_energy;  // motion energy
uniform float u_p_glow;    // glow
uniform float u_p_mirror;  // 0 = bars up, 1 = mirrored
uniform float u_p_wave;    // waveform ribbon amount

// Pseudo spectrum value for bar i in [0,1).
float spectrum(float i, float t) {
  float h = hash12(vec2(i * 3.17, floor(u_seed) + 1.3));
  float v = 0.45
    + 0.28 * sin(t * 2.0 + i * 0.9 + h * 6.28)
    + 0.17 * sin(t * 3.0 - i * 0.53 + h * 12.0)
    + 0.10 * sin(t * 5.0 + i * 1.7);
  return clamp(v * u_p_energy, 0.02, 1.0);
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_res.x / u_res.y;
  float bars = floor(u_p_bars + 0.5);

  vec3 col = PAL(0.02) * 0.5;

  float bw = aspect / bars;
  float bi = floor(uv.x / bw);
  float bf = fract(uv.x / bw);
  float h = spectrum(bi, u_time);

  // Bar body (rounded top via smoothstep).
  float y0 = 0.5 - mix(0.42 * h, 0.0, u_p_mirror * 0.0);
  float barTop = 0.5 - 0.44 * h;
  float barBot = mix(0.5 + 0.02, 0.5 + 0.44 * h, u_p_mirror);
  float inX = smoothstep(0.0, 0.12, bf) * smoothstep(1.0, 0.88, bf);
  float inY = smoothstep(barTop, barTop + 0.02, uv.y) * smoothstep(barBot, barBot - 0.02, uv.y);
  float bar = inX * inY;

  vec3 bcol = PAL(clamp(0.15 + h * 0.85, 0.0, 1.0));
  // Bright cap on each bar.
  float cap = inX * smoothstep(0.025, 0.0, abs(uv.y - barTop)) * step(0.5, h);
  col += bcol * bar * 1.1 + vec3(1.0) * cap * 0.7;
  col += bcol * inX * exp(-abs(uv.y - 0.5) * 3.0) * u_p_glow * 0.12;

  // Waveform ribbon across the bars.
  float wv = 0.0;
  for (int k = 1; k <= 4; k++) {
    float fk = float(k);
    wv += sin(uv.x * aspect * (2.0 + fk * 1.7) + u_time * fk + fk * 2.3) / (fk * 1.6);
  }
  wv = 0.5 + wv * 0.22 * u_p_energy;
  float wl = exp(-pow((uv.y - wv) * 34.0, 2.0));
  col = mix(col, col + u_palette[4] * wl * 0.9, u_p_wave);

  // Scanline shimmer.
  col *= 0.94 + 0.06 * sin(uv.y * u_res.y * 3.14159);

  float vig = smoothstep(1.35, 0.35, length(vec2(uv.x - 0.5, (uv.y - 0.5) * 0.8)) * 1.8);
  col *= mix(0.7, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const waveformEngine = {
  id: "waveform",
  name: "Spectrum EQ",
  description:
    "Pulsing equalizer bars and waveform ribbon driven by a procedural pseudo-spectrum.",
  fragmentShader,
  defaultParams: { bars: 48, energy: 1.1, glow: 1.0, mirror: 0, wave: 0.8 },
  paramSchema: [
    { key: "bars", label: "Bar Count", type: "slider", min: 16, max: 96, step: 1, default: 48 },
    { key: "energy", label: "Energy", type: "slider", min: 0.3, max: 2, step: 0.05, default: 1.1 },
    { key: "glow", label: "Glow", type: "slider", min: 0, max: 2, step: 0.05, default: 1.0 },
    { key: "mirror", label: "Mirror Bars", type: "slider", min: 0, max: 1, step: 1, default: 0 },
    { key: "wave", label: "Waveform", type: "slider", min: 0, max: 1, step: 0.05, default: 0.8 },
  ],
};
