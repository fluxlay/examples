export const rainVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const rainFrag = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2  uResolution;
uniform float uIntensity;
uniform vec2  uMouse;
uniform float uParallax;

varying vec2 vUv;

float hash11f(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash21f(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 rainStreak(
  vec2 uv,
  float time,
  float layerSeed,
  float cols,
  float dropSpacing,
  float dropLen,
  float speedBase,
  float speedRange,
  float widthBase,
  float opacity,
  vec3  tint,
  float colPresence,
  float cycleActive
) {
  float colId = floor(uv.x * cols);
  float colHash = hash11f(colId * 1.71 + layerSeed);

  if (colHash > colPresence * uIntensity) return vec3(0.0);

  float speed = speedBase + hash11f(colId * 3.31 + layerSeed) * speedRange;

  float windPhase = time * 0.32 + colHash * 6.2831;
  float jitter = sin(windPhase) * 0.0008 + sin(windPhase * 2.3) * 0.0003;

  float yProgress = (uv.y / dropSpacing) + time * speed + colHash * 11.0;
  float yPhase = fract(yProgress);
  float yCycle = floor(yProgress);

  float cycleHash = hash21f(vec2(yCycle, colId) * 1.913 + layerSeed);
  if (cycleHash > cycleActive) return vec3(0.0);

  float body = smoothstep(0.0, 0.05, yPhase) *
               (1.0 - smoothstep(dropLen * 0.55, dropLen, yPhase));

  float thickness = mix(widthBase * 0.55, widthBase, smoothstep(0.0, dropLen * 0.85, yPhase));

  float xLocal = fract(uv.x * cols) - 0.5 + jitter * cols;
  float xCore = smoothstep(thickness, 0.0, abs(xLocal));

  float headFocus = smoothstep(dropLen * 0.65, dropLen * 0.95, yPhase) *
                    (1.0 - smoothstep(dropLen * 0.95, dropLen, yPhase));
  float headGlow = smoothstep(thickness * 1.5, 0.0, abs(xLocal)) * headFocus * 0.35;

  float streakAttenuation = 0.7 + cycleHash * 0.3;

  return tint * (body * xCore + headGlow) * opacity * streakAttenuation;
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 uv = vUv;

  // Parallax shift: rain is foreground, so it moves more than background.
  // Direction matches background (mouse right → uv shifts +x).
  vec2 mouseOff = (uMouse - 0.5) * 2.0 * uParallax;

  vec3 total = vec3(0.0);

  // FAR rain layer: parallax × 1.0 (just slightly faster than background)
  {
    vec2 luv = uv + mouseOff * 1.0;
    luv.x += luv.y * 0.0820;
    total += rainStreak(luv, uTime, 0.0,
      200.0 * aspect, 0.32, 0.22,
      0.55, 0.50,
      0.18, 0.07,
      vec3(0.95, 0.97, 1.05),
      0.45, 0.30);
  }

  // MID rain layer: parallax × 1.6 (closer to viewer)
  {
    vec2 luv = uv + mouseOff * 1.6;
    luv.x += luv.y * 0.0875;
    luv.y += 0.187;
    total += rainStreak(luv, uTime, 47.0,
      100.0 * aspect, 0.42, 0.26,
      0.85, 0.60,
      0.16, 0.09,
      vec3(0.96, 1.00, 1.08),
      0.30, 0.25);
  }

  if (total.r + total.g + total.b < 0.002) discard;

  gl_FragColor = vec4(total, 1.0);
}
`;
