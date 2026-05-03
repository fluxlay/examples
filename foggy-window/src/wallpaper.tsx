import { useProperties } from "@fluxlay/react";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import { Background } from "./components/Background";
import { RainLayer } from "./components/RainLayer";
import { WindowGlass } from "./components/WindowGlass";
import { DEFAULTS } from "./constants";
import { useNormalizedMouse } from "./hooks/useNormalizedMouse";

interface Properties {
  condensation: number;
  rainIntensity: number;
  cityLightBreath: number;
}

interface SceneProps {
  condensation: number;
  rainIntensity: number;
  cityLightBreath: number;
}

function Scene({ condensation, rainIntensity, cityLightBreath }: SceneProps) {
  const mouseRef = useNormalizedMouse();
  return (
    <>
      <Background mouseRef={mouseRef} cityLightBreath={cityLightBreath} />
      <RainLayer intensity={rainIntensity} mouseRef={mouseRef} />
      <WindowGlass condensation={condensation} />
    </>
  );
}

export default function Wallpaper() {
  const props = useProperties<Partial<Properties>>();
  const condensation =
    typeof props.condensation === "number"
      ? props.condensation
      : DEFAULTS.condensation;
  const rainIntensity =
    typeof props.rainIntensity === "number"
      ? props.rainIntensity
      : DEFAULTS.rainIntensity;
  const cityLightBreath =
    typeof props.cityLightBreath === "number"
      ? props.cityLightBreath
      : DEFAULTS.cityLightBreath;

  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 1], zoom: 1, near: 0.01, far: 100 }}
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
        powerPreference: "high-performance",
      }}
    >
      <Suspense fallback={null}>
        <Scene
          condensation={condensation}
          rainIntensity={rainIntensity}
          cityLightBreath={cityLightBreath}
        />
      </Suspense>
    </Canvas>
  );
}
