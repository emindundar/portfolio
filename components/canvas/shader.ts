export const vertex = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Yavaş noise + hafif grid distortion. Renkler uniform: zemin ve vurgu.
export const fragment = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform float uTime;
uniform vec2 uMouse;      // 0..1
uniform vec2 uRes;
uniform vec3 uBg;
uniform vec3 uAccent;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);

  // fareye hafif tepki
  vec2 m = (uMouse - 0.5) * 0.15;
  float n = noise(p * 2.0 + uTime * 0.05 + m);
  float n2 = noise(p * 6.0 - uTime * 0.03);

  // grid distortion: ince çizgiler, noise ile kayar
  vec2 g = fract((p + n * 0.08) * 12.0);
  float line = smoothstep(0.0, 0.02, g.x) * smoothstep(0.0, 0.02, g.y);
  float grid = 1.0 - line;

  // Zeminden vurguya karışım: her iki temada da token renkleri arasında kalır
  float k = 0.06 * n + 0.04 * n2 + 0.10 * grid;
  vec3 col = mix(uBg, uAccent, k);

  // vignette: kenarlar zemine döner (açık temada grileşmez)
  float d = distance(uv, vec2(0.5));
  col = mix(col, uBg, smoothstep(0.4, 0.9, d) * 0.6);

  gl_FragColor = vec4(col, 1.0);
}
`;
