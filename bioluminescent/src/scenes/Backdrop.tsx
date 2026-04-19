import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { approachRate, type EnvTarget, lerpScalar, lerpVec3 } from "../environment";
import { COLOR_FIELD_GLSL } from "./color-field";

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Fullscreen plane samples the shared color field and layers aurora
// curtains on top. Time-based motion + env-driven surface light: the
// horizon glow tracks sun azimuth, light level controls overall brightness,
// and haze washes the upper half toward a milky overcast.
const frag =
  /* glsl */ `
uniform float uTime;
uniform vec2 uFieldScale;
uniform vec3 uSunTint;
uniform vec3 uSkyTint;
uniform float uLight;
uniform float uHaze;
uniform float uSunX;
varying vec2 vUv;

float hash21(vec2 p) {
  p = fract(p * vec2(234.83, 812.19));
  p += dot(p, p + 41.7);
  return fract(p.x * p.y);
}
` +
  COLOR_FIELD_GLSL +
  /* glsl */ `
void main() {
  vec2 p = (vUv - 0.5) * uFieldScale;

  vec3 col = colorField(p, uTime);

  vec3 detail = colorField(p * 2.4 + vec2(3.1, -2.4), uTime * 0.65);
  col = mix(col, detail, 0.4);

  float w1 = sin(p.x * 0.08 + uTime * 0.32) * 2.4;
  float w2 = cos(p.x * 0.05 + uTime * 0.24 + 1.6) * 1.6;
  float bandA = sin(p.y * 0.28 + w1 + uTime * 0.5) * 0.5 + 0.5;
  float bandB = sin(p.y * 0.19 + w2 + uTime * 0.4 + 2.1) * 0.5 + 0.5;
  float curtain = pow(max(bandA, bandB * 0.85), 2.4);

  vec3 auroraTint = mix(vec3(0.18, 0.42, 0.34), vec3(0.28, 0.52, 0.72), bandA);
  col += auroraTint * curtain * 0.55;

  // sky colour bias — gentle hue shift, not saturation. night = blue,
  // noon = slight cyan, dusk = warm. keeps the deep-sea palette readable.
  col = col * (0.6 + uSkyTint * 1.3);

  // surface sun bleed — narrow shaft of light streaming in from the
  // sun's direction, not a broad glow. intentionally small so the scene
  // reads as "underwater with a partial sunbeam", not "lit from above".
  float surfaceFactor = smoothstep(0.32, 0.72, vUv.y);
  float horizonDist = abs(vUv.x - (0.5 + uSunX * 0.4));
  float sunShaft = surfaceFactor * exp(-pow(horizonDist * 4.5, 2.0));
  col = mix(col, uSunTint * 1.1, sunShaft * 0.55);

  // very subtle azimuth bias — just a hint of direction, no broad wash
  float sideBias = (vUv.x - 0.5) * 2.0 * uSunX;
  float sideTint = smoothstep(0.2, 1.0, sideBias) * surfaceFactor;
  col = mix(col, uSunTint * 0.8, sideTint * 0.12);

  // haze: milky overcast wash — only on heavy weather
  col = mix(col, vec3(0.4, 0.44, 0.5), uHaze * surfaceFactor * 0.3);

  // overall light level — compressed range; day is moderately brighter
  // than night but never approaches pure white
  col *= mix(0.12, 0.55, uLight);

  float grain = hash21(vUv * 900.0 + uTime * 13.0);
  col += (grain - 0.5) * 0.018;

  gl_FragColor = vec4(col, 1.0);
}
`;

type Props = { env: EnvTarget };

export function Backdrop({ env }: Props) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFieldScale: { value: new THREE.Vector2(32, 22) },
      uSunTint: { value: new THREE.Vector3(0.3, 0.52, 0.5) },
      uSkyTint: { value: new THREE.Vector3(0.15, 0.35, 0.5) },
      uLight: { value: 0.7 },
      uHaze: { value: 0.25 },
      uSunX: { value: 0 },
    }),
    [],
  );

  useFrame((state, delta) => {
    const m = materialRef.current;
    if (!m) return;
    m.uniforms.uTime.value = state.clock.elapsedTime;

    const k = approachRate(delta, 0.6);
    const sunTint = m.uniforms.uSunTint.value as THREE.Vector3;
    const skyTint = m.uniforms.uSkyTint.value as THREE.Vector3;
    const sunArr: [number, number, number] = [sunTint.x, sunTint.y, sunTint.z];
    const skyArr: [number, number, number] = [skyTint.x, skyTint.y, skyTint.z];
    lerpVec3(sunArr, env.sunTint, k);
    lerpVec3(skyArr, env.skyTint, k);
    sunTint.set(sunArr[0], sunArr[1], sunArr[2]);
    skyTint.set(skyArr[0], skyArr[1], skyArr[2]);

    m.uniforms.uLight.value = lerpScalar(m.uniforms.uLight.value, env.light, k);
    m.uniforms.uHaze.value = lerpScalar(m.uniforms.uHaze.value, env.haze, k);
    m.uniforms.uSunX.value = lerpScalar(m.uniforms.uSunX.value, env.sunX, k);
  });

  return (
    <mesh position={[0, 0, -12]} renderOrder={-10}>
      <planeGeometry args={[60, 40]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
