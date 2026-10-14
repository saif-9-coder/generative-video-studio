/**
 * Shared GLSL library prepended to every engine fragment shader.
 *
 * Seamless-loop contract:
 *   - `u_time` is the loop angle a in [0, 2PI).
 *   - Frame i of N uses a = (i / N) * 2PI, so frame N == frame 0 exactly.
 *   - ALL animation must be driven through `loopVec(u_time)` (circular
 *     time sampling: t = (cos a, sin a)). Any function of (cos a, sin a)
 *     is 2PI-periodic, therefore the rendered sequence loops seamlessly.
 */

// Fullscreen-triangle vertex shader (three.js ShaderMaterial prepends its
// own precision + built-in uniforms; we only add the uv varying).
export const VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const COMMON_GLSL = /* glsl */ `
uniform float u_time;   // loop angle a in [0, 2PI)
uniform vec2  u_res;    // render resolution in px
uniform float u_seed;   // per-render random seed
uniform vec3  u_palette[5];

varying vec2 v_uv;

// Circular time sampling: the ONLY source of animation time.
// Because (cos a, sin a) is 2PI-periodic, frame N == frame 0.
vec2 loopVec(float a) {
  return vec2(cos(a), sin(a));
}

// --- Hash / noise primitives (IQ-style) ---
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// 5-octave fractal Brownian motion with rotation to kill axis alignment.
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = r * p * 2.03;
    a *= 0.5;
  }
  return v;
}

// 5-stop gradient. Implemented as a mix chain (constant uniform indices)
// so it compiles on both WebGL1 and WebGL2.
vec3 pal5(float t, vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec3 c4) {
  t = clamp(t, 0.0, 1.0) * 4.0;
  vec3 col = mix(c0, c1, clamp(t, 0.0, 1.0));
  col = mix(col, c2, clamp(t - 1.0, 0.0, 1.0));
  col = mix(col, c3, clamp(t - 2.0, 0.0, 1.0));
  col = mix(col, c4, clamp(t - 3.0, 0.0, 1.0));
  return col;
}
#define PAL(t) pal5(t, u_palette[0], u_palette[1], u_palette[2], u_palette[3], u_palette[4])
`;
