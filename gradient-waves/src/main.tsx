import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

import { useMousePosition } from "@fluxlay/react";

interface WaveLayer {
  baseAmplitude: number;
  frequency: number;
  speed: number;
  phaseOffset: number;
  yOffset: number;
  opacity: number;
}

const LAYERS: WaveLayer[] = [
  { baseAmplitude: 60, frequency: 0.8, speed: 0.3, phaseOffset: 0, yOffset: 0.65, opacity: 0.3 },
  { baseAmplitude: 50, frequency: 1.0, speed: 0.4, phaseOffset: 1.2, yOffset: 0.70, opacity: 0.35 },
  { baseAmplitude: 45, frequency: 1.3, speed: 0.5, phaseOffset: 2.5, yOffset: 0.75, opacity: 0.4 },
  { baseAmplitude: 35, frequency: 1.6, speed: 0.6, phaseOffset: 3.8, yOffset: 0.80, opacity: 0.45 },
  { baseAmplitude: 25, frequency: 2.0, speed: 0.7, phaseOffset: 5.0, yOffset: 0.85, opacity: 0.5 },
];

// Time-aware color palettes (HSL)
function getTimeColors(): { bg: [number, number, number]; colors: [number, number, number][] } {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 8) {
    // Sunrise: warm oranges and pinks
    return {
      bg: [25, 30, 8],
      colors: [
        [20, 90, 55], [35, 95, 60], [350, 80, 55], [45, 90, 50], [10, 85, 50],
      ],
    };
  }
  if (hour >= 8 && hour < 17) {
    // Day: ocean blues and teals
    return {
      bg: [210, 40, 8],
      colors: [
        [195, 80, 50], [210, 85, 55], [180, 75, 45], [220, 80, 60], [200, 90, 50],
      ],
    };
  }
  if (hour >= 17 && hour < 20) {
    // Sunset: purples and magentas
    return {
      bg: [280, 30, 8],
      colors: [
        [280, 70, 50], [300, 75, 55], [260, 65, 45], [320, 80, 50], [290, 85, 55],
      ],
    };
  }
  // Night: deep blues and cyans
  return {
    bg: [230, 40, 5],
    colors: [
      [220, 70, 35], [240, 60, 40], [200, 80, 30], [250, 65, 45], [210, 75, 35],
    ],
  };
}

const GradientWaves = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const timeRef = useRef(0);
  const mousePos = useMousePosition();
  const mousePosRef = useRef(mousePos);
  mousePosRef.current = mousePos;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      const w = canvas.width;
      const h = canvas.height;
      const t = timeRef.current;
      timeRef.current += 0.008;

      const mp = mousePosRef.current;
      // Mouse normalized 0-1
      const mx = (mp.x + 1) / 2;
      const my = 1 - (mp.y + 1) / 2;

      const { bg, colors } = getTimeColors();

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, `hsl(${bg[0]}, ${bg[1]}%, ${bg[2] + 3}%)`);
      bgGrad.addColorStop(1, `hsl(${bg[0]}, ${bg[1]}%, ${bg[2]}%)`);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Draw each wave layer
      for (let li = 0; li < LAYERS.length; li++) {
        const layer = LAYERS[li];
        const color = colors[li];

        // Mouse influence on amplitude and frequency
        const mouseAmplitude = 1 + (my - 0.5) * 0.6;
        const mouseFreqShift = (mx - 0.5) * 0.3;
        const amplitude = layer.baseAmplitude * mouseAmplitude;
        const freq = layer.frequency + mouseFreqShift;

        const baseY = h * layer.yOffset;

        ctx.beginPath();
        ctx.moveTo(0, h);

        for (let x = 0; x <= w; x += 2) {
          const nx = x / w;
          const wave1 = Math.sin(nx * Math.PI * 2 * freq + t * layer.speed + layer.phaseOffset) * amplitude;
          const wave2 = Math.sin(nx * Math.PI * 2 * freq * 1.5 + t * layer.speed * 0.7 + layer.phaseOffset * 1.3) * amplitude * 0.3;
          const wave3 = Math.sin(nx * Math.PI * 2 * freq * 0.5 + t * layer.speed * 1.3) * amplitude * 0.2;

          // Mouse proximity warp
          const dx = nx - mx;
          const distSq = dx * dx;
          const mouseWarp = Math.exp(-distSq * 20) * amplitude * 0.5 * (my - 0.5);

          const y = baseY + wave1 + wave2 + wave3 + mouseWarp;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(w, h);
        ctx.closePath();

        // Gradient fill
        const grad = ctx.createLinearGradient(0, baseY - amplitude, 0, h);
        grad.addColorStop(0, `hsla(${color[0]}, ${color[1]}%, ${color[2]}%, ${layer.opacity})`);
        grad.addColorStop(0.5, `hsla(${color[0] + 15}, ${color[1]}%, ${color[2] - 10}%, ${layer.opacity * 0.7})`);
        grad.addColorStop(1, `hsla(${color[0] + 30}, ${color[1]}%, ${color[2] - 20}%, ${layer.opacity * 0.3})`);

        ctx.fillStyle = grad;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%", background: "#000" }}
    />
  );
};

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <GradientWaves />
  </React.StrictMode>,
);
