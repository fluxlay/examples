import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BG_TEXTURE_PATH } from "../constants";
import { glassFrag, glassVert } from "../shaders/glass";
import { ScreenQuadMesh } from "./ScreenQuadMesh";

interface Props {
  condensation: number;
}

export function WindowGlass({ condensation }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const texture = useTexture(BG_TEXTURE_PATH);

  useEffect(() => {
    if (!texture) return;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  const condensationRef = useRef(condensation);
  useEffect(() => {
    condensationRef.current = condensation;
  }, [condensation]);

  const uniforms = useMemo(
    () => ({
      uBackground: { value: null as THREE.Texture | null },
      uTexSize: { value: new THREE.Vector2(1, 1) },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uCondensation: { value: condensation },
      uBlurStrength: { value: 8.0 },
    }),
    [],
  );

  useFrame((state) => {
    const m = matRef.current;
    if (!m) return;
    if (texture && texture.image) {
      m.uniforms.uBackground.value = texture;
      const img = texture.image as HTMLImageElement;
      const w = img.naturalWidth || img.width || 1;
      const h = img.naturalHeight || img.height || 1;
      (m.uniforms.uTexSize.value as THREE.Vector2).set(w, h);
    }
    (m.uniforms.uResolution.value as THREE.Vector2).set(
      state.size.width,
      state.size.height,
    );
    m.uniforms.uTime.value = state.clock.elapsedTime;
    m.uniforms.uCondensation.value = condensationRef.current;
  });

  return (
    <ScreenQuadMesh renderOrder={0}>
      <shaderMaterial
        ref={matRef}
        vertexShader={glassVert}
        fragmentShader={glassFrag}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        depthTest={false}
      />
    </ScreenQuadMesh>
  );
}
