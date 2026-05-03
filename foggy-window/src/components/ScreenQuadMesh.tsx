import { useMemo } from "react";
import * as THREE from "three";
import type { ReactNode, Ref } from "react";

interface Props {
  children: ReactNode;
  renderOrder?: number;
  meshRef?: Ref<THREE.Mesh>;
}

export function ScreenQuadMesh({ children, renderOrder, meshRef }: Props) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]);
    const uvs = new Float32Array([0, 0, 2, 0, 0, 2]);
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    return g;
  }, []);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      renderOrder={renderOrder}
      frustumCulled={false}
    >
      {children}
    </mesh>
  );
}
