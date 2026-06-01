import { StrictMode, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

import { useProperties } from "@fluxlay/react";

// ── Configurable properties (see fluxlay.yaml) ───────────────────────────────
type Props = {
  theme: "dark" | "light";
  hourFormat: "24" | "12";
  showSeconds: boolean;
  fontMode: string;
  animationMode: string;
};

// ── Typefaces ────────────────────────────────────────────────────────────────
const FONTS: Record<string, { family: string; gf: string }> = {
  playfair: { family: "'Playfair Display', serif", gf: "Playfair+Display:ital,wght@0,700;1,700" },
  bebas: { family: "'Bebas Neue', sans-serif", gf: "Bebas+Neue" },
  archivo: { family: "'Archivo Black', sans-serif", gf: "Archivo+Black" },
  spacemono: { family: "'Space Mono', monospace", gf: "Space+Mono:wght@700" },
  majormono: { family: "'Major Mono Display', monospace", gf: "Major+Mono+Display" },
  oswald: { family: "'Oswald', sans-serif", gf: "Oswald:wght@600" },
  cormorant: { family: "'Cormorant Garamond', serif", gf: "Cormorant+Garamond:wght@600" },
  abril: { family: "'Abril Fatface', serif", gf: "Abril+Fatface" }
};
const FONT_KEYS = Object.keys(FONTS);

// Particle entrance styles — how dots travel to their new glyph positions.
const ANIMATIONS = ["explode", "swirl", "rain", "converge", "vortex", "wave", "scatter"];

// ── Google Fonts (CSP-safe: fetch CSS, inline it; <link> would be blocked) ────
function loadGoogleFonts() {
  const families = FONT_KEYS.map(k => `family=${FONTS[k].gf}`).join("&");
  const url = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  fetch(url)
    .then(r => r.text())
    .then(css => {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);
    })
    .catch(() => {
      /* progressive enhancement — fall back to system fonts */
    });
}

function pickIndex(seed: number, len: number) {
  return ((seed * 2654435761) >>> 0) % len;
}

function formatTime(now: Date, fmt: "24" | "12") {
  let h = now.getHours();
  if (fmt === "12") {
    h = h % 12;
    if (h === 0) h = 12;
  }
  return {
    hh: String(h).padStart(2, "0"),
    mm: String(now.getMinutes()).padStart(2, "0"),
    ss: String(now.getSeconds()).padStart(2, "0")
  };
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

type Pt = { x: number; y: number };

// Render `lines` of text to an offscreen canvas and sample its filled pixels
// into a point cloud. Returns points plus the content bounding box so the
// caller can fit it anywhere on screen.
function sampleGlyphs(lines: string[], family: string, step: number): { points: Pt[]; w: number; h: number } {
  const OFF = 900;
  const c = document.createElement("canvas");
  c.width = OFF;
  c.height = OFF;
  const ctx = c.getContext("2d");
  if (!ctx) return { points: [], w: 1, h: 1 };

  const lineH = OFF / (lines.length + 0.4);
  const fontSize = lineH * 0.92;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${fontSize}px ${family}`;
  lines.forEach((line, i) => {
    ctx.fillText(line, OFF / 2, lineH * (i + 0.7));
  });

  const data = ctx.getImageData(0, 0, OFF, OFF).data;
  const points: Pt[] = [];
  let minX = OFF;
  let minY = OFF;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < OFF; y += step) {
    for (let x = 0; x < OFF; x += step) {
      if (data[(y * OFF + x) * 4 + 3] > 128) {
        points.push({ x, y });
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  // re-origin points to their bounding box
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  for (const p of points) {
    p.x -= minX;
    p.y -= minY;
  }
  return { points, w, h };
}

type Particle = {
  // source (start of transition) and target (glyph position) in screen px
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  delay: number; // 0..1 fraction of transition
  seed: number;
};

function Wallpaper() {
  const props = useProperties<Props>();
  const propsRef = useRef(props);
  propsRef.current = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadGoogleFonts();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuild(true);
    };

    let particles: Particle[] = [];
    let secParticles: Particle[] = [];
    let transitionStart = performance.now();
    const TRANSITION = 1100;
    const SEC_TRANSITION = 450;
    let secStart = performance.now();

    let epoch = 0;
    let lastMinute = -1;
    let lastSecond = -1;
    let fontFamily = "system-ui, sans-serif";

    // Map a point cloud onto a centered screen rect, producing target coords.
    const fit = (cloud: { points: Pt[]; w: number; h: number }, cx: number, cy: number, maxW: number, maxH: number) => {
      const scale = Math.min(maxW / cloud.w, maxH / cloud.h);
      const ox = cx - (cloud.w * scale) / 2;
      const oy = cy - (cloud.h * scale) / 2;
      return cloud.points.map(p => ({ x: ox + p.x * scale, y: oy + p.y * scale }));
    };

    // Assign a transition source for a target, per the active motion style.
    const sourceFor = (style: string, tx: number, ty: number): Pt => {
      const cx = W / 2;
      const cy = H / 2;
      const ang = Math.atan2(ty - cy, tx - cx);
      const r = Math.hypot(W, H);
      switch (style) {
        case "explode":
          return {
            x: cx + Math.cos(ang) * 18 + (Math.random() - 0.5) * 30,
            y: cy + Math.sin(ang) * 18 + (Math.random() - 0.5) * 30
          };
        case "rain":
          return { x: tx + (Math.random() - 0.5) * 40, y: -Math.random() * H * 0.6 };
        case "converge": {
          const a = Math.random() * Math.PI * 2;
          return { x: cx + Math.cos(a) * r * 0.7, y: cy + Math.sin(a) * r * 0.7 };
        }
        case "swirl":
        case "vortex": {
          const rad = Math.hypot(tx - cx, ty - cy) + 120;
          const a2 = ang + (style === "vortex" ? 2.4 : 1.2);
          return { x: cx + Math.cos(a2) * rad, y: cy + Math.sin(a2) * rad };
        }
        case "wave":
          return { x: tx - W * 0.7, y: ty + Math.sin(tx * 0.03) * 120 };
        default: // scatter
          return { x: Math.random() * W, y: Math.random() * H };
      }
    };

    const makeParticles = (targets: Pt[], prev: Particle[], style: string, useScatter: boolean): Particle[] => {
      return targets.map((t, i) => {
        let s: Pt;
        if (useScatter) {
          s = sourceFor(style, t.x, t.y);
        } else if (prev[i]) {
          s = { x: prev[i].tx, y: prev[i].ty };
        } else {
          s = { x: t.x, y: t.y };
        }
        return {
          sx: s.x,
          sy: s.y,
          tx: t.x,
          ty: t.y,
          delay: ((i % 50) / 50) * 0.35,
          seed: Math.random() * 1000
        };
      });
    };

    const rebuild = (force: boolean) => {
      const p = propsRef.current;
      const fmt = p.hourFormat ?? "24";
      const fontMode = p.fontMode ?? "shuffle";
      const animMode = p.animationMode ?? "shuffle";
      const { hh, mm } = formatTime(new Date(), fmt);

      const fontKey =
        fontMode !== "shuffle" && FONTS[fontMode] ? fontMode : FONT_KEYS[pickIndex(epoch + 1, FONT_KEYS.length)];
      fontFamily = FONTS[fontKey]?.family ?? "system-ui, sans-serif";

      const style =
        animMode !== "shuffle" && ANIMATIONS.includes(animMode)
          ? animMode
          : ANIMATIONS[pickIndex(epoch * 7 + 3, ANIMATIONS.length)];

      const cloud = sampleGlyphs([hh, mm], fontFamily, 12);
      const targets = fit(cloud, W / 2, H * 0.46, W * 0.62, H * 0.74);
      particles = makeParticles(targets, particles, style, true);
      transitionStart = performance.now();
      if (force) {
        // snap straight to glyph on resize (no dramatic entrance)
        for (const pt of particles) {
          pt.sx = pt.tx;
          pt.sy = pt.ty;
        }
      }
    };

    const rebuildSeconds = () => {
      const p = propsRef.current;
      if (!(p.showSeconds ?? false)) {
        secParticles = [];
        return;
      }
      const { ss } = formatTime(new Date(), p.hourFormat ?? "24");
      const cloud = sampleGlyphs([ss], fontFamily, 9);
      const targets = fit(cloud, W / 2, H * 0.9, W * 0.22, H * 0.12);
      secParticles = makeParticles(targets, secParticles, "scatter", secParticles.length === 0);
      secStart = performance.now();
    };

    let raf = 0;
    const frame = (now: number) => {
      const p = propsRef.current;
      const fmt = p.hourFormat ?? "24";
      const d = new Date();
      const minute = d.getHours() * 60 + d.getMinutes();
      const second = d.getSeconds();

      if (minute !== lastMinute) {
        if (lastMinute !== -1) epoch += 1;
        lastMinute = minute;
        rebuild(false);
        rebuildSeconds();
      }
      if ((p.showSeconds ?? false) && second !== lastSecond) {
        lastSecond = second;
        rebuildSeconds();
      }

      // Colors: theme base, polarity inverted every other minute (brutalist).
      const dark = (p.theme ?? "dark") === "dark";
      const inverted = epoch % 2 === 1;
      const lightBg = dark ? inverted : !inverted;
      const bg = lightBg ? "#f4f4f4" : "#0a0a0a";
      const fg = lightBg ? "#0a0a0a" : "#f4f4f4";

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = fg;

      const drawField = (list: Particle[], start: number, dur: number, dot: number) => {
        const elapsed = now - start;
        for (const pt of list) {
          const local = (elapsed - pt.delay * dur) / (dur * (1 - pt.delay * 0.5));
          const t = local <= 0 ? 0 : local >= 1 ? 1 : easeOutCubic(local);
          let x = pt.sx + (pt.tx - pt.sx) * t;
          let y = pt.sy + (pt.ty - pt.sy) * t;
          if (t >= 1) {
            // settled — gentle living drift
            x += Math.sin(now * 0.0012 + pt.seed) * 0.8;
            y += Math.cos(now * 0.0014 + pt.seed) * 0.8;
          }
          ctx.beginPath();
          ctx.arc(x, y, dot, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      drawField(particles, transitionStart, TRANSITION, Math.max(1.4, W / 900));
      if (p.showSeconds ?? false) {
        ctx.globalAlpha = 0.5;
        drawField(secParticles, secStart, SEC_TRANSITION, Math.max(1, W / 1300));
        ctx.globalAlpha = 1;
      }

      void fmt;
      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize);
    // re-sample once fonts arrive (glyph shapes change the point cloud)
    void document.fonts?.ready.then(() => rebuild(true));
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <main style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0a0a0a" }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <Wallpaper />
  </StrictMode>
);
