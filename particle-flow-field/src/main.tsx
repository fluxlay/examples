import React, { useCallback, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

import { useMousePosition } from "@fluxlay/react";

// Simplex-like noise (2D)
const PERM = new Uint8Array(512);
{
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}

const GRAD = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

function noise2D(x: number, y: number): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  const g = (ix: number, iy: number) => {
    const g = GRAD[PERM[PERM[ix] + iy] & 7];
    return g[0] * (xf - (ix - xi)) + g[1] * (yf - (iy - yi));
  };

  const n00 = g(xi, yi);
  const n10 = g(xi + 1, yi);
  const n01 = g(xi, yi + 1);
  const n11 = g(xi + 1, yi + 1);

  return n00 + u * (n10 - n00) + v * (n01 - n00) + u * v * (n11 - n10 - n01 + n00);
}

const PARTICLE_COUNT = 2000;
const NOISE_SCALE = 0.003;
const SPEED = 1.5;
const MOUSE_RADIUS = 200;
const MOUSE_STRENGTH = 0.8;

interface Particle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  speed: number;
  hueOffset: number;
}

const ParticleFlowField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef(0);
  const animRef = useRef(0);
  const mousePos = useMousePosition();
  const mousePosRef = useRef(mousePos);
  mousePosRef.current = mousePos;

  const initParticles = useCallback((w: number, h: number) => {
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => {
      const x = Math.random() * w;
      const y = Math.random() * h;
      return {
        x, y, prevX: x, prevY: y,
        speed: 0.5 + Math.random() * 1.0,
        hueOffset: Math.random() * 60,
      };
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles(canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0, 0, 0, 1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      const w = canvas.width;
      const h = canvas.height;
      const t = timeRef.current;
      timeRef.current += 0.002;

      // Fade trail
      ctx.fillStyle = "rgba(0, 0, 0, 0.03)";
      ctx.fillRect(0, 0, w, h);

      const mp = mousePosRef.current;
      const mx = ((mp.x + 1) / 2) * w;
      const my = (1 - (mp.y + 1) / 2) * h;

      for (const p of particlesRef.current) {
        p.prevX = p.x;
        p.prevY = p.y;

        // Flow field angle from noise
        const angle = noise2D(p.x * NOISE_SCALE, p.y * NOISE_SCALE + t) * Math.PI * 4;
        let vx = Math.cos(angle) * SPEED * p.speed;
        let vy = Math.sin(angle) * SPEED * p.speed;

        // Mouse distortion
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (1 - dist / MOUSE_RADIUS) * MOUSE_STRENGTH;
          // Swirl around mouse
          vx += (-dy / dist) * force * SPEED * 3;
          vy += (dx / dist) * force * SPEED * 3;
        }

        p.x += vx;
        p.y += vy;

        // Wrap around
        if (p.x < 0) { p.x += w; p.prevX = p.x; }
        if (p.x > w) { p.x -= w; p.prevX = p.x; }
        if (p.y < 0) { p.y += h; p.prevY = p.y; }
        if (p.y > h) { p.y -= h; p.prevY = p.y; }

        // Color based on angle
        const hue = ((angle / (Math.PI * 4)) * 180 + 200 + p.hueOffset) % 360;
        const velocity = Math.sqrt(vx * vx + vy * vy);
        const alpha = Math.min(0.8, 0.2 + velocity * 0.1);

        ctx.beginPath();
        ctx.moveTo(p.prevX, p.prevY);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [initParticles]);

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
    <ParticleFlowField />
  </React.StrictMode>,
);
