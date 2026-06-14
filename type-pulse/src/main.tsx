import { useCallback, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

import { useKeyboard, useProperties } from "@fluxlay/react";

const TAU = Math.PI * 2;

// Cap the device-pixel ratio so 4K / Retina stays bounded in cost. The paper
// grain dithers the flat background, so capping DPR does not reintroduce banding.
const MAX_DPR = 2;

// Grain noise tile (device pixels). Small and tiled so it costs nothing.
const GRAIN_TILE = 128;
// Luminance jitter applied to the background, in 0-255 units (±3/255).
const GRAIN_AMPLITUDE = 3;

const RIPPLE_BIRTH_OPACITY = 0.35;
const RIPPLE_START_RADIUS_CSS = 2; // px (in CSS units, scaled by DPR at runtime)
const RIPPLE_BASE_RADIUS_CSS = 60; // px
const RIPPLE_RATE_GAIN_CSS = 10; // px added per keystroke/sec, capped
const RIPPLE_RATE_CAP = 8; // keystrokes/sec ceiling for the size bonus
const SECOND_RING_RATE = 6; // keystrokes/sec above which a second ring is added
const MAX_LIVE_RIPPLES = 600; // hard cap to stay light during extreme bursts

type Theme = "paper" | "ink";

interface Props {
  theme: Theme;
  followThemeColor: boolean;
  rippleColor: string;
  rippleLifetime: number;
  rippleSize: number;
  paperGrain: boolean;
}

const THEMES: Record<Theme, { bg: string; ripple: string }> = {
  paper: { bg: "#f4f2ec", ripple: "#2a2a2a" },
  ink: { bg: "#101113", ripple: "#e8e6e0" }
};

interface Ripple {
  // Position in device pixels. Chosen at random and deliberately unrelated to
  // which key was pressed — the key code is never read.
  x: number;
  y: number;
  born: number; // performance.now() timestamp (ms)
  finalRadius: number; // device px, fixed at birth
  secondRing: boolean; // added during fast typing
}

// Live render configuration, mirrored into a ref so the rAF loop always reads
// the latest user properties without restarting.
interface RenderConfig {
  bg: string;
  rippleRgb: [number, number, number];
  lifetime: number; // seconds
  size: number; // sensitivity multiplier (s)
  grain: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const TypePulse = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const props = useProperties<Partial<Props>>();
  const theme: Theme = props.theme === "ink" ? "ink" : "paper";
  const themeColors = THEMES[theme];
  // By default the ripple color follows the theme; turning the toggle off lets
  // the user pick an explicit color.
  const followThemeColor = props.followThemeColor ?? true;
  const rippleColor =
    followThemeColor || !props.rippleColor?.trim() ? themeColors.ripple : props.rippleColor;
  const lifetime = clamp(props.rippleLifetime ?? 2.5, 1, 5);
  const size = clamp(props.rippleSize ?? 1, 0.5, 2);
  const grain = props.paperGrain ?? true;

  // Mutable state shared between event handlers and the render loop.
  const config = useRef<RenderConfig>({
    bg: themeColors.bg,
    rippleRgb: hexToRgb(rippleColor),
    lifetime,
    size,
    grain
  });
  config.current = {
    bg: themeColors.bg,
    rippleRgb: hexToRgb(rippleColor),
    lifetime,
    size,
    grain
  };

  const ripples = useRef<Ripple[]>([]);
  const keyTimes = useRef<number[]>([]); // recent keystroke timestamps (sliding 1s window)
  const dprRef = useRef(1);
  const runningRef = useRef(false);
  const rafRef = useRef(0);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Imperative hooks set up inside the mount effect, callable from elsewhere.
  const ensureRunningRef = useRef<() => void>(() => {});
  const refreshBackgroundRef = useRef<() => void>(() => {});

  // Spawn a ripple per keystroke. Privacy: we read ONLY `event.repeat` (to drop
  // auto-repeat) — never `event.code` or modifiers. The position is random.
  const onKeyDown = useCallback((event: { repeat: boolean }) => {
    if (event.repeat) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const now = performance.now();

    // Sliding 1-second window → current typing rate (keystrokes/sec).
    const times = keyTimes.current;
    times.push(now);
    while (times.length > 0 && now - times[0] > 1000) times.shift();
    const rate = times.length;

    const dpr = dprRef.current;
    const { size: s } = config.current;
    const finalRadiusCss = (RIPPLE_BASE_RADIUS_CSS + Math.min(rate, RIPPLE_RATE_CAP) * RIPPLE_RATE_GAIN_CSS) * s;

    const ripple: Ripple = {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      born: now,
      finalRadius: finalRadiusCss * dpr,
      secondRing: rate > SECOND_RING_RATE
    };

    const live = ripples.current;
    live.push(ripple);
    if (live.length > MAX_LIVE_RIPPLES) live.splice(0, live.length - MAX_LIVE_RIPPLES);

    ensureRunningRef.current();
  }, []);

  useKeyboard({ onKeyDown });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Build the static background (solid color + optional grain) into an
    // offscreen canvas at device resolution. Rebuilt only on resize / theme /
    // grain change — never per frame.
    const buildBackground = () => {
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) return;

      let bg = bgCanvasRef.current;
      if (!bg) {
        bg = document.createElement("canvas");
        bgCanvasRef.current = bg;
      }
      bg.width = w;
      bg.height = h;
      const bgCtx = bg.getContext("2d");
      if (!bgCtx) return;

      const cfg = config.current;
      bgCtx.fillStyle = cfg.bg;
      bgCtx.fillRect(0, 0, w, h);

      if (cfg.grain) {
        const tile = document.createElement("canvas");
        tile.width = GRAIN_TILE;
        tile.height = GRAIN_TILE;
        const tileCtx = tile.getContext("2d");
        if (tileCtx) {
          const [br, bgc, bb] = hexToRgb(cfg.bg);
          const img = tileCtx.createImageData(GRAIN_TILE, GRAIN_TILE);
          const data = img.data;
          for (let i = 0; i < data.length; i += 4) {
            // Monochrome luminance jitter: same delta on every channel.
            const d = Math.round((Math.random() * 2 - 1) * GRAIN_AMPLITUDE);
            data[i] = clamp(br + d, 0, 255);
            data[i + 1] = clamp(bgc + d, 0, 255);
            data[i + 2] = clamp(bb + d, 0, 255);
            data[i + 3] = 255;
          }
          tileCtx.putImageData(img, 0, 0);
          const pattern = bgCtx.createPattern(tile, "repeat");
          if (pattern) {
            bgCtx.fillStyle = pattern;
            bgCtx.fillRect(0, 0, w, h);
          }
        }
      }
    };

    // Paint a single static frame (just the background). Used when idle so the
    // screen is correct without keeping the loop alive.
    const paintIdle = () => {
      const bg = bgCanvasRef.current;
      if (bg) ctx.drawImage(bg, 0, 0);
    };

    const drawRipple = (ripple: Ripple, now: number) => {
      const cfg = config.current;
      const t = (now - ripple.born) / 1000 / cfg.lifetime;
      if (t >= 1) return;

      const dpr = dprRef.current;
      const eased = easeOutCubic(t);
      const startRadius = RIPPLE_START_RADIUS_CSS * dpr;
      const radius = startRadius + (ripple.finalRadius - startRadius) * eased;
      const [r, g, b] = cfg.rippleRgb;

      // Source-over with per-ripple alpha: overlapping ripples accumulate and
      // read as denser interference. Fades linearly to zero over the lifetime.
      const alpha = RIPPLE_BIRTH_OPACITY * (1 - t);
      ctx.lineWidth = dpr; // ~1 CSS px regardless of DPR

      ctx.beginPath();
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.arc(ripple.x, ripple.y, radius, 0, TAU);
      ctx.stroke();

      if (ripple.secondRing) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.7})`;
        ctx.arc(ripple.x, ripple.y, radius * 0.6, 0, TAU);
        ctx.stroke();
      }
    };

    const frame = () => {
      const now = performance.now();
      const cfg = config.current;

      // Clear to the static background, then draw the live ripples on top.
      paintIdle();

      const live = ripples.current;
      let writeIndex = 0;
      for (let i = 0; i < live.length; i++) {
        const ripple = live[i];
        if ((now - ripple.born) / 1000 < cfg.lifetime) {
          drawRipple(ripple, now);
          live[writeIndex++] = ripple;
        }
      }
      live.length = writeIndex;

      // Keep the loop alive only while there is something to animate and the
      // surface is visible. Otherwise stop entirely (zero idle CPU).
      if (live.length > 0 && !document.hidden) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        runningRef.current = false;
      }
    };

    const ensureRunning = () => {
      if (runningRef.current || document.hidden) return;
      if (ripples.current.length === 0) return;
      runningRef.current = true;
      rafRef.current = requestAnimationFrame(frame);
    };
    ensureRunningRef.current = ensureRunning;

    // Rebuild the static background after a property change (theme / grain /
    // color / size). Repaint immediately when idle so it shows without a key.
    refreshBackgroundRef.current = () => {
      buildBackground();
      if (!runningRef.current) paintIdle();
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      dprRef.current = dpr;
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      buildBackground();
      if (!runningRef.current) paintIdle();
    };

    // Stop drawing while hidden (display asleep / occluded); repaint and resume
    // when visible again. Note: we key off visibility, not focus — a desktop
    // wallpaper is generally never the focused surface.
    const onVisibility = () => {
      if (document.hidden) {
        if (runningRef.current) {
          cancelAnimationFrame(rafRef.current);
          runningRef.current = false;
        }
      } else {
        paintIdle();
        ensureRunning();
      }
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Theme / grain / color / size changes: rebuild the static background and, if
  // idle, repaint it immediately so the change is visible without a keystroke.
  useEffect(() => {
    refreshBackgroundRef.current();
  }, [theme, grain, rippleColor, size, followThemeColor]);

  return <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />;
};

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<TypePulse />);
