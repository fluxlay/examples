import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { KernelSize } from "postprocessing";
import { Backdrop } from "./scenes/Backdrop";
import { GodRays } from "./scenes/GodRays";
import { Particles } from "./scenes/Particles";
import { useEnvironment } from "./useEnvironment";

export function Wallpaper() {
  const env = useEnvironment();
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 50 }}
      dpr={[1, 1.75]}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#01030a"]} />
      <fog attach="fog" args={["#01030a", 6, 20]} />
      <Backdrop env={env} />
      <GodRays env={env} />
      <Particles env={env} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          intensity={0.35}
          luminanceThreshold={0.5}
          luminanceSmoothing={0.4}
          mipmapBlur
          radius={0.65}
          kernelSize={KernelSize.LARGE}
        />
      </EffectComposer>
    </Canvas>
  );
}
