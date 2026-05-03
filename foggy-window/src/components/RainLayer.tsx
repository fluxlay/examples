import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject, RefObject } from "react";
import * as THREE from "three";
import { PARALLAX_STRENGTH } from "../constants";
import { rainFrag, rainVert } from "../shaders/rain";
import { ScreenQuadMesh } from "./ScreenQuadMesh";

interface Props {
  intensity: number;
  mouseRef: MutableRefObject<THREE.Vector2> | RefObject<THREE.Vector2>;
}

export function RainLayer({ intensity, mouseRef }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const intensityRef = useRef(intensity);
  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uIntensity: { value: intensity },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uParallax: { value: PARALLAX_STRENGTH },
    }),
    [],
  );

  useFrame((state) => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uTime.value = state.clock.elapsedTime;
    m.uniforms.uIntensity.value = intensityRef.current;
    (m.uniforms.uResolution.value as THREE.Vector2).set(
      state.size.width,
      state.size.height,
    );
    if (mouseRef.current) {
      (m.uniforms.uMouse.value as THREE.Vector2).copy(mouseRef.current);
    }
  });

  return (
    <ScreenQuadMesh renderOrder={-10}>
      <shaderMaterial
        ref={matRef}
        vertexShader={rainVert}
        fragmentShader={rainFrag}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </ScreenQuadMesh>
  );
}
