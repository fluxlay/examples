import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { approachRate, type EnvTarget, lerpScalar, lerpVec3 } from "../environment";

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Soft dome tracking the sun above the surface. Centre slides horizontally
// with sun azimuth, tint + strength are driven by env; haze broadens and
// dims the glow (cloudy / stormy weather diffuses the light).
const frag = /* glsl */ `
uniform float uTime;
uniform vec3 uSunTint;
uniform float uLight;
uniform float uHaze;
uniform float uSunX;
varying vec2 vUv;

void main() {
  vec2 centre = vec2(0.5 + uSunX * 0.4, 1.05);
  vec2 uv = vUv - centre;
  uv.x *= 1.1;
  float r = length(uv);
  float width = 0.42 + uHaze * 0.22;
  float dome = exp(-pow(r / width, 1.8));
  // subtle bright core — a focused sun shaft, not a blanket glow
  float core = exp(-pow(r / (0.18 + uHaze * 0.15), 2.2));
  vec2 e = abs(vUv - 0.5);
  float edge = smoothstep(0.5, 0.34, max(e.x, e.y));
  float glow = (dome * 0.55 + core * 0.25) * edge;
  float breath = 0.94 + 0.06 * sin(uTime * 0.35);
  float intensity = glow * 0.45 * breath * uLight * (1.0 - uHaze * 0.3);

  vec3 tint = uSunTint;
  gl_FragColor = vec4(tint * intensity, clamp(intensity * 0.9, 0.0, 1.0));
}
`;

type Props = { env: EnvTarget };

export function GodRays({ env }: Props) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSunTint: { value: new THREE.Vector3(0.3, 0.52, 0.5) },
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
    const sunArr: [number, number, number] = [sunTint.x, sunTint.y, sunTint.z];
    lerpVec3(sunArr, env.sunTint, k);
    sunTint.set(sunArr[0], sunArr[1], sunArr[2]);

    m.uniforms.uLight.value = lerpScalar(m.uniforms.uLight.value, env.light, k);
    m.uniforms.uHaze.value = lerpScalar(m.uniforms.uHaze.value, env.haze, k);
    m.uniforms.uSunX.value = lerpScalar(m.uniforms.uSunX.value, env.sunX, k);
  });

  return (
    <mesh position={[0, 4, -5]} renderOrder={-5}>
      <planeGeometry args={[30, 22]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
