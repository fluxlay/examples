import { useBackendMouse } from "@fluxlay/react";
import { Environment, MeshTransmissionMaterial, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import * as THREE from "three";

function GlassModel() {
  const { nodes } = useGLTF("/glass-cube.glb");
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const backendMouse = useBackendMouse();

  const lastUpdateTime = useRef(0);

  useFrame(state => {
    const currentTime = state.clock.getElapsedTime();
    if (currentTime - lastUpdateTime.current < 1 / 30) return;
    lastUpdateTime.current = currentTime;

    if (groupRef.current) {
      // バックエンドの座標があればそれを使用し、なければフロントエンドのマウス座標を使用する
      const isBackendActive = backendMouse.x !== 0 || backendMouse.y !== 0;
      const x = isBackendActive ? backendMouse.x : state.pointer.x;
      const y = isBackendActive ? backendMouse.y : state.pointer.y;

      const targetRotationX = -y * 0.5;
      const targetRotationY = x * 0.5;

      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotationX, 0.1);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotationY, 0.1);
    }

    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.x += 0.002;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh ref={meshRef} {...nodes.cube}>
        <MeshTransmissionMaterial
          thickness={0.35}
          roughness={0}
          transmission={1}
          ior={1.5}
          chromaticAberration={1}
          backside={true}
        />
      </mesh>
    </group>
  );
}

const BackgroundLines = () => {
  return (
    <group position={[0, 0, -2]}>
      {" "}
      {/* 文字より少し後ろに置く */}
      {[1, 0, -1].map(y => (
        <mesh key={y} position={[0, y * 0.5, 0]}>
          <planeGeometry args={[10, 0.01]} />
          {/* 横幅10、厚さ0.01の細い線 */}
          <meshBasicMaterial color="#fff" transparent opacity={1} />
        </mesh>
      ))}
    </group>
  );
};

function App() {
  return (
    <main className="flex justify-center items-center h-screen bg-[#f0f0f0]">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
      >
        <color attach="background" args={["#000000"]} />

        <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={35} />

        <Environment preset="studio" />

        <Suspense fallback={null}>
          <group position={[0, 0, 0]}>
            <BackgroundLines />

            <GlassModel />

            <directionalLight intensity={2} position={[0, 2, 3]} />
          </group>
        </Suspense>
      </Canvas>
    </main>
  );
}

export default App;
