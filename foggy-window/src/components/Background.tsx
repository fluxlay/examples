import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject, RefObject } from "react";
import * as THREE from "three";
import { BG_TEXTURE_PATH, PARALLAX_STRENGTH } from "../constants";
import { ScreenQuadMesh } from "./ScreenQuadMesh";

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const frag = /* glsl */ `
precision highp float;

uniform sampler2D uTex;
uniform vec2  uTexSize;
uniform vec2  uResolution;
uniform vec2  uMouse;
uniform float uParallax;
uniform float uTime;
uniform float uBreathStrength;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  float screenAspect = uResolution.x / max(uResolution.y, 1.0);
  float texAspect = uTexSize.x / max(uTexSize.y, 1.0);
  vec2 scale;
  vec2 offset;
  if (screenAspect > texAspect) {
    scale = vec2(1.0, texAspect / screenAspect);
    offset = vec2(0.0, (1.0 - scale.y) * 0.5);
  } else {
    scale = vec2(screenAspect / texAspect, 1.0);
    offset = vec2((1.0 - scale.x) * 0.5, 0.0);
  }

  vec2 mouseOffset = (uMouse - 0.5) * 2.0;
  vec2 parallax = mouseOffset * uParallax;
  vec2 imageUv = vUv * scale + offset + parallax;

  vec3 color = texture2D(uTex, imageUv).rgb;

  // ===== City lights breathing =====
  // Detect bright pixels (street lights / windows) by luma.
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float brightMask = smoothstep(0.32, 0.70, luma);

  // Per-cell phase so each light pulses on its own rhythm.
  vec2 cell = floor(imageUv * 90.0);
  float phaseSlow = hash(cell) * 6.2831;
  float phaseFast = hash(cell + 7.3) * 6.2831;

  // Slow ambient breathing (~5s period)
  float slow = 0.5 + 0.5 * sin(uTime * 0.45 + phaseSlow);
  // Subtle faster ripple
  float fast = 0.5 + 0.5 * sin(uTime * 1.30 + phaseFast);
  float pulse = mix(slow, slow * fast, 0.40);

  // ~15% of cells flicker (occasional malfunctioning bulbs / neon)
  float flickerSeed = hash(cell + 13.7);
  float flickerActive = step(0.85, flickerSeed);
  float flicker = mix(1.0, 0.45 + 0.55 * sin(uTime * 9.0 + flickerSeed * 137.0), flickerActive);

  // Combine: scale brightness by (1 + (pulse-0.5) * strength) only on bright pixels
  float modulation = 1.0 + (pulse - 0.5) * 2.0 * uBreathStrength;
  modulation *= flicker;

  color = mix(color, color * modulation, brightMask);

  gl_FragColor = vec4(color, 1.0);
}
`;

interface Props {
  mouseRef: MutableRefObject<THREE.Vector2> | RefObject<THREE.Vector2>;
  cityLightBreath: number;
}

export function Background({ mouseRef, cityLightBreath }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const texture = useTexture(BG_TEXTURE_PATH);

  useEffect(() => {
    if (!texture) return;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  const breathRef = useRef(cityLightBreath);
  useEffect(() => {
    breathRef.current = cityLightBreath;
  }, [cityLightBreath]);

  const uniforms = useMemo(
    () => ({
      uTex: { value: null as THREE.Texture | null },
      uTexSize: { value: new THREE.Vector2(1, 1) },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uParallax: { value: PARALLAX_STRENGTH },
      uTime: { value: 0 },
      uBreathStrength: { value: cityLightBreath },
    }),
    [],
  );

  useFrame((state) => {
    const m = matRef.current;
    if (!m) return;
    if (texture && texture.image) {
      m.uniforms.uTex.value = texture;
      const img = texture.image as HTMLImageElement;
      const w = img.naturalWidth || img.width || 1;
      const h = img.naturalHeight || img.height || 1;
      (m.uniforms.uTexSize.value as THREE.Vector2).set(w, h);
    }
    (m.uniforms.uResolution.value as THREE.Vector2).set(
      state.size.width,
      state.size.height,
    );
    if (mouseRef.current) {
      (m.uniforms.uMouse.value as THREE.Vector2).copy(mouseRef.current);
    }
    m.uniforms.uTime.value = state.clock.elapsedTime;
    m.uniforms.uBreathStrength.value = breathRef.current;
  });

  return (
    <ScreenQuadMesh renderOrder={-20}>
      <shaderMaterial
        ref={matRef}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </ScreenQuadMesh>
  );
}
