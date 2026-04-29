import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

import { useSystemMonitor } from "@fluxlay/react";

const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const FONT_SIZE = 14;
const FADE_ALPHA = 0.05;
const BASE_SPEED = 0.4;
const MAX_SPEED = 1.5;

interface Column {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  charLen: number;
}

const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const columnsRef = useRef<Column[]>([]);
  const animRef = useRef(0);
  const info = useSystemMonitor({
    cpuIntervalMs: 500,
    memoryIntervalMs: 5000,
  });
  const infoRef = useRef(info);
  infoRef.current = info;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const randomChar = () => CHARS[Math.floor(Math.random() * CHARS.length)];

    const initColumns = () => {
      const w = canvas.width;
      const h = canvas.height;
      const colCount = Math.ceil(w / FONT_SIZE);
      columnsRef.current = Array.from({ length: colCount }, (_, i) => {
        const charLen = Math.floor(Math.random() * 15) + 8;
        return {
          x: i * FONT_SIZE,
          y: Math.random() * h * -1,
          speed: BASE_SPEED + Math.random() * 0.3,
          chars: Array.from({ length: charLen }, () => randomChar()),
          charLen,
        };
      });
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initColumns();
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      const w = canvas.width;
      const h = canvas.height;
      const { cpuUsage, cpuPerCore } = infoRef.current;

      // CPU-based parameters
      const cpuNorm = cpuUsage / 100;
      const speedMul = BASE_SPEED + (MAX_SPEED - BASE_SPEED) * cpuNorm;
      const fadeAlpha = FADE_ALPHA + cpuNorm * 0.02;

      // Fade effect
      ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
      ctx.fillRect(0, 0, w, h);

      ctx.font = `${FONT_SIZE}px monospace`;

      for (let i = 0; i < columnsRef.current.length; i++) {
        const col = columnsRef.current[i];

        // Per-core brightness
        const coreIndex = cpuPerCore.length > 0 ? i % cpuPerCore.length : 0;
        const coreCpu = cpuPerCore.length > 0 ? cpuPerCore[coreIndex] / 100 : cpuNorm;
        const brightness = 0.4 + coreCpu * 0.6;

        // Move column
        col.y += col.speed * speedMul * FONT_SIZE * 0.3;

        // Randomize a char occasionally
        if (Math.random() < 0.03) {
          const idx = Math.floor(Math.random() * col.charLen);
          col.chars[idx] = randomChar();
        }

        // Draw characters
        for (let j = 0; j < col.charLen; j++) {
          const charY = col.y - j * FONT_SIZE;
          if (charY < -FONT_SIZE || charY > h + FONT_SIZE) continue;

          if (j === 0) {
            // Head character - bright white/green
            const glow = 0.8 + cpuNorm * 0.2;
            ctx.fillStyle = `rgba(180, 255, 180, ${glow})`;
            ctx.shadowColor = `rgba(0, 255, 70, ${0.5 + cpuNorm * 0.5})`;
            ctx.shadowBlur = 8 + cpuNorm * 12;
          } else {
            // Trail characters
            const fade = 1 - j / col.charLen;
            const green = Math.floor(140 + 115 * fade * brightness);
            const alpha = fade * brightness * 0.9;
            ctx.fillStyle = `rgba(0, ${green}, 0, ${alpha})`;
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
          }

          ctx.fillText(col.chars[j], col.x, charY);
        }

        // Reset shadow
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;

        // Reset column when fully off screen
        if (col.y - col.charLen * FONT_SIZE > h) {
          col.y = Math.random() * -h * 0.5;
          col.speed = BASE_SPEED + Math.random() * 0.3;
          col.charLen = Math.floor(Math.random() * 15) + 8;
          col.chars = Array.from({ length: col.charLen }, () => randomChar());
        }
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
    <MatrixRain />
  </React.StrictMode>,
);
