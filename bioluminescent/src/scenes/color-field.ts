// Shared procedural color field — flowing deep-sea aurora with
// domain warp so the color blobs undulate like northern-lights sheets.
// Sampled by both Backdrop and Particles so hues wave in lock-step.
export const COLOR_FIELD_GLSL = /* glsl */ `
vec3 colorField(vec2 p, float t) {
  // aurora-style domain warp — displaces sample position so colour
  // patterns flow like northern-lights sheets sweeping through the frame.
  // larger amplitude + slightly faster phase for unmistakable motion.
  vec2 warp = vec2(
    sin(p.y * 0.16 + t * 0.42) * 3.2 + cos(p.x * 0.11 + t * 0.33) * 1.8,
    cos(p.x * 0.13 + t * 0.36 + 1.7) * 2.0 + sin(p.y * 0.09 - t * 0.28) * 1.1
  );
  p += warp;

  float s1 = sin(p.x * 0.22 + t * 0.20);
  float s2 = cos(p.y * 0.18 + t * 0.24 + 1.3);
  float s3 = sin(p.x * 0.14 + p.y * 0.12 + t * 0.16);
  float s4 = cos(p.x * 0.32 + p.y * 0.26 + t * 0.28 + 3.1);
  float s5 = sin(p.y * 0.24 - p.x * 0.16 + t * 0.13 + 2.4);

  // deep-sea micro-organism palette: moody greens / teals with
  // cold cyan highlights — never muddy olive because all hues stay cool
  vec3 deep    = vec3(0.02, 0.05, 0.05);
  vec3 forest  = vec3(0.05, 0.14, 0.11);
  vec3 teal    = vec3(0.10, 0.26, 0.26);
  vec3 sea     = vec3(0.16, 0.38, 0.34);
  vec3 mint    = vec3(0.24, 0.48, 0.42);
  vec3 cyan    = vec3(0.18, 0.40, 0.52);

  float m1 = smoothstep(-0.1, 0.7, s1 + s3 * 0.6);
  float m2 = smoothstep(-0.2, 0.6, s2 + s4 * 0.5);
  float m3 = smoothstep(0.0, 0.9, s4 + s5 * 0.5);
  float m4 = smoothstep(0.25, 0.9, s3 - s4 * 0.3);

  vec3 col = mix(deep, forest, m1);
  col = mix(col, teal, m2 * 0.85);
  col = mix(col, sea, m3 * 0.7);
  col = mix(col, mint, m4 * 0.45);
  col = mix(col, cyan, m1 * m3 * 0.45);
  return col;
}
`;
