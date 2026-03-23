import { useAudio, useMediaMetadata, useProperties } from "@fluxlay/react";
import { StrictMode, useCallback, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const BAR_COUNT = 128;
const TWO_PI = Math.PI * 2;

function hslToRgb(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return `rgb(${Math.round(f(0) * 255)},${Math.round(f(8) * 255)},${Math.round(f(4) * 255)})`;
}

type Properties = {
  showMediaInfo: boolean;
  transparentBg: boolean;
  bgColor: string;
};

function AudioVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const audio = useAudio({ numBands: BAR_COUNT });
  const {
    showMediaInfo = true,
    transparentBg = true,
    bgColor = "#000000",
  } = useProperties<Properties>();
  const media = useMediaMetadata();
  const audioRef = useRef({ rms: 0, peak: 0, spectrum: [] as number[] });
  const smoothDataRef = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  const artworkImgRef = useRef<HTMLImageElement | null>(null);
  const artworkUrlRef = useRef<string | null>(null);
  const recordAngleRef = useRef(0);
  const lastTimeRef = useRef(performance.now() / 1000);
  const isPlayingRef = useRef(false);
  const showMediaInfoRef = useRef(true);
  const transparentBgRef = useRef(false);
  const bgColorRef = useRef("#000000");

  useEffect(() => {
    isPlayingRef.current = media.isPlaying;
  }, [media.isPlaying]);

  useEffect(() => {
    showMediaInfoRef.current = showMediaInfo;
    transparentBgRef.current = transparentBg;
    bgColorRef.current = bgColor;
  }, [showMediaInfo, transparentBg, bgColor]);

  useEffect(() => {
    audioRef.current = {
      rms: audio.rms,
      peak: audio.peak,
      spectrum: audio.spectrum,
    };
  }, [audio.rms, audio.peak, audio.spectrum]);

  useEffect(() => {
    if (media.artwork === artworkUrlRef.current) return;
    artworkUrlRef.current = media.artwork;
    if (!media.artwork) {
      artworkImgRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      artworkImgRef.current = img;
    };
    img.src = media.artwork;
  }, [media.artwork]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
    }

    const time = performance.now() / 1000;
    const { rms, peak, spectrum } = audioRef.current;

    // Smooth the spectrum data
    const smooth = smoothDataRef.current;
    for (let i = 0; i < BAR_COUNT; i++) {
      const target = spectrum[i] ?? 0;
      smooth[i] += (target - smooth[i]) * 0.2;
    }

    // Clear with fade trail — faster fade when audio is loud
    const fadeAlpha = 0.12 + rms * 0.15;
    if (transparentBgRef.current) {
      ctx.clearRect(0, 0, w, h);
    } else {
      const bg = bgColorRef.current;
      const r = Number.parseInt(bg.slice(1, 3), 16);
      const g = Number.parseInt(bg.slice(3, 5), 16);
      const b = Number.parseInt(bg.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${fadeAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    const cx = w / 2;
    const cy = h / 2;
    const baseRadius = Math.min(w, h) * 0.18;
    const maxBarHeight = Math.min(w, h) * 0.22;
    const hueShift = time * 20;

    // Draw outer glow — intensity scales with peak
    const glowGrad = ctx.createRadialGradient(
      cx,
      cy,
      baseRadius * 0.5,
      cx,
      cy,
      baseRadius + maxBarHeight * 1.2,
    );
    const glowIntensity = 0.02 + peak * 0.06;
    glowGrad.addColorStop(0, `rgba(100, 50, 255, ${glowIntensity})`);
    glowGrad.addColorStop(0.5, `rgba(0, 150, 255, ${glowIntensity * 0.6})`);
    glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    // Draw artwork in center circle (spinning like a record)
    const innerRadius = baseRadius * 0.6;
    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;
    if (isPlayingRef.current) {
      recordAngleRef.current += dt * 0.5;
    }
    if (showMediaInfoRef.current) {
      const artworkImg = artworkImgRef.current;
      if (artworkImg) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(recordAngleRef.current);
        ctx.beginPath();
        ctx.arc(0, 0, innerRadius - 4, 0, TWO_PI);
        ctx.closePath();
        ctx.clip();
        const artSize = (innerRadius - 4) * 2;
        ctx.globalAlpha = 0.8;
        ctx.drawImage(
          artworkImg,
          -artSize / 2,
          -artSize / 2,
          artSize,
          artSize,
        );
        ctx.globalAlpha = 1;
        ctx.restore();

        // Record center hole
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, TWO_PI);
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fill();
      }
    }

    // Draw circular bars (outer)
    ctx.save();
    ctx.translate(cx, cy);

    for (let i = 0; i < BAR_COUNT; i++) {
      const angle = (i / BAR_COUNT) * TWO_PI - Math.PI / 2;
      const value = smooth[i];
      const barHeight = value * maxBarHeight;

      const hue = (hueShift + (i / BAR_COUNT) * 120) % 360;
      const saturation = 0.7 + value * 0.3;
      const lightness = 0.4 + value * 0.3;

      const x1 = Math.cos(angle) * baseRadius;
      const y1 = Math.sin(angle) * baseRadius;
      const x2 = Math.cos(angle) * (baseRadius + barHeight);
      const y2 = Math.sin(angle) * (baseRadius + barHeight);

      ctx.shadowColor = hslToRgb(hue, saturation, lightness);
      ctx.shadowBlur = 6 + value * 14;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = hslToRgb(hue, saturation, lightness);
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    // Draw mirrored inner bars
    for (let i = 0; i < BAR_COUNT; i++) {
      const angle = (i / BAR_COUNT) * TWO_PI - Math.PI / 2;
      const value = smooth[i];
      const barHeight = value * maxBarHeight * 0.4;

      const hue = (hueShift + 180 + (i / BAR_COUNT) * 120) % 360;

      const x1 = Math.cos(angle) * innerRadius;
      const y1 = Math.sin(angle) * innerRadius;
      const x2 = Math.cos(angle) * (innerRadius - barHeight);
      const y2 = Math.sin(angle) * (innerRadius - barHeight);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = hslToRgb(hue, 0.6, 0.35 + value * 0.2);
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Center ring — pulses with RMS
    const pulseRadius = baseRadius + rms * 4;
    ctx.beginPath();
    ctx.arc(0, 0, pulseRadius, 0, TWO_PI);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.06 + rms * 0.1})`;
    ctx.lineWidth = 1 + rms * 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, innerRadius, 0, TWO_PI);
    ctx.strokeStyle = `rgba(255, 255, 255, 0.05)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Waveform ring
    const waveRadius = baseRadius * 0.85;
    ctx.beginPath();
    for (let i = 0; i <= BAR_COUNT; i++) {
      const idx = i % BAR_COUNT;
      const angle = (i / BAR_COUNT) * TWO_PI - Math.PI / 2;
      const value = smooth[idx];
      const r = waveRadius + value * maxBarHeight * 0.15;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + rms * 0.15})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    // Floating particles — size and brightness react to audio
    const particleCount = 40;
    for (let i = 0; i < particleCount; i++) {
      const seed = i * 137.508;
      const t = time * 0.3 + seed;
      const orbitRadius =
        baseRadius +
        maxBarHeight * 0.8 +
        Math.sin(t * 0.7 + seed) * 40 +
        peak * 30;
      const angle = (t * 0.2 + seed) % TWO_PI;
      const px = cx + Math.cos(angle) * orbitRadius;
      const py = cy + Math.sin(angle) * orbitRadius;
      const freqIdx = Math.floor((i / particleCount) * BAR_COUNT);
      const freqValue = smooth[freqIdx];
      const brightness = 0.2 + freqValue * 0.8;
      const size = 1 + freqValue * 3;

      const hue = (hueShift + (i / particleCount) * 360) % 360;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, TWO_PI);
      ctx.fillStyle = hslToRgb(hue, 0.8, brightness * 0.5);
      ctx.globalAlpha = brightness * 0.7;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    animFrameRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  const progress =
    media.duration && media.elapsedTime
      ? media.elapsedTime / media.duration
      : 0;

  return (
    <div
      className="w-full h-full overflow-hidden relative"
      style={{ backgroundColor: transparentBg ? "transparent" : bgColor }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
      {showMediaInfo && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none select-none text-center">
          {media.title && (
            <div className="text-white/70 text-lg font-light tracking-wider">
              {media.title}
            </div>
          )}
          {media.artist && (
            <div className="text-white/40 text-sm mt-0.5">{media.artist}</div>
          )}
          {media.duration != null && media.duration > 0 && (
            <div className="mt-2 w-48 mx-auto h-[2px] bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/40 rounded-full transition-all duration-1000"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <AudioVisualizer />
  </StrictMode>,
);
