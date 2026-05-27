import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";

import { useMousePosition } from "@fluxlay/react";

import { Shader } from "./shader.tsx";

// Shadertoy-style snippet. Paste any `void mainImage(...)` shader here and it
// will work — the built-in uniforms (iResolution, iTime, iTimeDelta, iFrame)
// are auto-injected by <Shader/>.
//
// `iMouse` is NOT a built-in: wallpaper windows are click-through so native
// pointer events never fire. Read the cursor with useMousePosition() from
// @fluxlay/react and pass it explicitly as a custom uniform — see below.
const FRAGMENT = `
uniform vec2 iMouse;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  vec2 mouse = (iMouse - 0.5 * iResolution.xy) / iResolution.y;

  // Drifting plasma with a warp toward the cursor.
  float t = iTime * 0.3;
  vec2 p = uv + 0.4 * (mouse - uv) * exp(-length(mouse - uv) * 2.0);
  float v = 0.0;
  v += sin(p.x * 3.0 + t);
  v += sin(p.y * 4.0 - t * 1.3);
  v += sin((p.x + p.y) * 5.0 + t * 0.7);
  v += sin(length(p) * 8.0 - t * 1.5);
  v *= 0.25;

  vec3 col = 0.5 + 0.5 * cos(6.2831 * (v + vec3(0.0, 0.33, 0.67)));
  fragColor = vec4(col, 1.0);
}`;

function Wallpaper() {
  // useMousePosition returns coordinates in [-1, 1] with Y pointing up.
  // Convert to pixels with top-left origin to match gl_FragCoord (the
  // shader flips to bottom-left where needed).
  const { x, y } = useMousePosition();
  const iMouse = useMemo<readonly [number, number]>(
    () => [((x + 1) / 2) * window.innerWidth, ((y + 1) / 2) * window.innerHeight],
    [x, y]
  );

  return <Shader fragment={FRAGMENT} uniforms={{ iMouse }} />;
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <Wallpaper />
  </StrictMode>
);
