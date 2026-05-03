export const glassVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const glassFrag = /* glsl */ `
precision highp float;

uniform sampler2D uBackground;
uniform vec2  uTexSize;
uniform vec2  uResolution;
uniform float uTime;
uniform float uCondensation;
uniform float uBlurStrength;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

vec2 coverUv(vec2 uv, vec2 texSize, vec2 resolution) {
  float screenAspect = resolution.x / max(resolution.y, 1.0);
  float texAspect = texSize.x / max(texSize.y, 1.0);
  vec2 scale;
  vec2 offset;
  if (screenAspect > texAspect) {
    scale = vec2(1.0, texAspect / screenAspect);
    offset = vec2(0.0, (1.0 - scale.y) * 0.5);
  } else {
    scale = vec2(screenAspect / texAspect, 1.0);
    offset = vec2((1.0 - scale.x) * 0.5, 0.0);
  }
  return uv * scale + offset;
}

vec3 blur9(sampler2D tex, vec2 uv, vec2 px) {
  vec2 d1 = vec2(1.3846153846) * px;
  vec2 d2 = vec2(3.2307692308) * px;
  vec3 col = texture2D(tex, uv).rgb * 0.2270270270;
  col += texture2D(tex, uv + vec2(d1.x, 0.0)).rgb * 0.1581081081;
  col += texture2D(tex, uv - vec2(d1.x, 0.0)).rgb * 0.1581081081;
  col += texture2D(tex, uv + vec2(d2.x, 0.0)).rgb * 0.0351351351;
  col += texture2D(tex, uv - vec2(d2.x, 0.0)).rgb * 0.0351351351;
  col += texture2D(tex, uv + vec2(0.0, d1.y)).rgb * 0.1581081081;
  col += texture2D(tex, uv - vec2(0.0, d1.y)).rgb * 0.1581081081;
  col += texture2D(tex, uv + vec2(0.0, d2.y)).rgb * 0.0351351351;
  col += texture2D(tex, uv - vec2(0.0, d2.y)).rgb * 0.0351351351;
  return col;
}

void main() {
  vec2 bgUv = coverUv(vUv, uTexSize, uResolution);
  vec2 px = uBlurStrength / uResolution;
  vec3 blurred = blur9(uBackground, bgUv, px);

  // Condensation noise (5-octave fbm), animated slowly
  float fogPattern = fbm(vUv * 3.5 + vec2(uTime * 0.012, uTime * 0.020));

  // Top of the window has stronger condensation than the bottom
  float vGrad = mix(0.30, 1.0, smoothstep(0.05, 0.85, vUv.y));

  float fogIntensity = clamp(uCondensation * (0.55 + fogPattern * 0.50) * vGrad, 0.0, 0.95);

  // Slight cool tint to the foggy view (water film)
  vec3 fogTint = vec3(0.55, 0.62, 0.72);
  vec3 fogged = mix(blurred, fogTint, 0.18);

  gl_FragColor = vec4(fogged, fogIntensity);
}
`;
