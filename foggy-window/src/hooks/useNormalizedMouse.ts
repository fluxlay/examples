import { useMousePosition } from "@fluxlay/react";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

const SMOOTHING = 0.05;

export function useNormalizedMouse() {
  const backendMouse = useMousePosition();
  const ref = useRef(new THREE.Vector2(0.5, 0.5));
  const target = useRef(new THREE.Vector2(0.5, 0.5));

  useFrame((state) => {
    const isBackend = backendMouse.x !== 0 || backendMouse.y !== 0;
    if (isBackend) {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      target.current.set(
        THREE.MathUtils.clamp(backendMouse.x / w, 0, 1),
        THREE.MathUtils.clamp(backendMouse.y / h, 0, 1),
      );
    } else {
      target.current.set(
        (state.pointer.x + 1) * 0.5,
        (state.pointer.y + 1) * 0.5,
      );
    }

    ref.current.x += (target.current.x - ref.current.x) * SMOOTHING;
    ref.current.y += (target.current.y - ref.current.y) * SMOOTHING;
  });

  return ref;
}
