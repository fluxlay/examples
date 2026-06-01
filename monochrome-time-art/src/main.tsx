import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
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
// key -> { family (CSS font-family), gf (Google Fonts family spec) }
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

// ── Animations ───────────────────────────────────────────────────────────────
// Each maps to a CSS @keyframes name defined in <Styles>. Per-character entrance.
const ANIMATIONS = ["flip", "slide", "dissolve", "blur", "glitch", "fall", "scale"];

// Inject the Google Fonts stylesheet by fetching its CSS and inlining it.
// A plain <link rel="stylesheet"> to fonts.googleapis.com is blocked by the
// wallpaper CSP (style-src does not include external origins), but fetching the
// CSS (connect-src allows the declared origin) and injecting it as an inline
// <style> works — the referenced gstatic font files then load via font-src.
function useGoogleFonts() {
  useEffect(() => {
    const families = FONT_KEYS.map(k => `family=${FONTS[k].gf}`).join("&");
    const url = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    let style: HTMLStyleElement | null = null;
    let cancelled = false;
    fetch(url)
      .then(r => r.text())
      .then(css => {
        if (cancelled) return;
        style = document.createElement("style");
        style.textContent = css;
        document.head.appendChild(style);
      })
      .catch(() => {
        /* fonts are progressive enhancement; fall back to system fonts */
      });
    return () => {
      cancelled = true;
      if (style) style.remove();
    };
  }, []);
}

// Deterministic-ish pick that advances each minute without Math.random
// (keeps font/animation stable within a minute and varied across minutes).
function pickIndex(seed: number, len: number) {
  const h = (seed * 2654435761) >>> 0;
  return h % len;
}

function formatTime(now: Date, fmt: "24" | "12") {
  let h = now.getHours();
  if (fmt === "12") {
    h = h % 12;
    if (h === 0) h = 12;
  }
  const hh = String(h).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return { hh, mm, ss, ampm: now.getHours() < 12 ? "AM" : "PM" };
}

function Wallpaper() {
  const props = useProperties<Props>();
  const theme = props.theme ?? "dark";
  const hourFormat = props.hourFormat ?? "24";
  const showSeconds = props.showSeconds ?? false;
  const fontMode = props.fontMode ?? "shuffle";
  const animationMode = props.animationMode ?? "shuffle";

  useGoogleFonts();

  const [now, setNow] = useState(() => new Date());
  // `epoch` increments on every minute change; used to re-key + re-trigger the
  // entrance animation and to advance the shuffled font/animation choices.
  const [epoch, setEpoch] = useState(0);
  const lastMinuteRef = useRef<number>(now.getMinutes());

  useEffect(() => {
    const id = setInterval(() => {
      const next = new Date();
      setNow(next);
      const m = next.getHours() * 60 + next.getMinutes();
      if (m !== lastMinuteRef.current) {
        lastMinuteRef.current = m;
        setEpoch(e => e + 1);
      }
    }, 250);
    return () => clearInterval(id);
  }, []);

  const { hh, mm, ss, ampm } = formatTime(now, hourFormat);

  const fontKey = useMemo(() => {
    if (fontMode !== "shuffle" && FONTS[fontMode]) return fontMode;
    return FONT_KEYS[pickIndex(epoch + 1, FONT_KEYS.length)];
  }, [fontMode, epoch]);

  const animation = useMemo(() => {
    if (animationMode !== "shuffle" && ANIMATIONS.includes(animationMode)) return animationMode;
    return ANIMATIONS[pickIndex(epoch * 7 + 3, ANIMATIONS.length)];
  }, [animationMode, epoch]);

  const fg = theme === "dark" ? "#f5f5f5" : "#0a0a0a";
  const bg = theme === "dark" ? "#0a0a0a" : "#f5f5f5";
  const fontFamily = FONTS[fontKey]?.family ?? "system-ui, sans-serif";

  const mainChars = `${hh}:${mm}`.split("");

  return (
    <main
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: bg,
        color: fg,
        overflow: "hidden",
        userSelect: "none"
      }}
    >
      <Styles />
      <div
        // re-mount the whole row on each minute so the entrance animation replays
        key={epoch}
        style={{
          fontFamily,
          fontWeight: 700,
          fontSize: "min(34vw, 46vh)",
          lineHeight: 1,
          letterSpacing: "0.02em",
          display: "flex",
          alignItems: "baseline"
        }}
      >
        {mainChars.map((ch, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              animation: `fx-${animation} 900ms cubic-bezier(0.16, 1, 0.3, 1) both`,
              animationDelay: `${i * 90}ms`,
              transformOrigin: "center",
              minWidth: ch === ":" ? "0.35em" : undefined,
              textAlign: "center"
            }}
          >
            {ch}
          </span>
        ))}
      </div>

      {(showSeconds || hourFormat === "12") && (
        <div
          style={{
            marginTop: "0.5em",
            display: "flex",
            alignItems: "baseline",
            gap: "0.6em",
            fontFamily,
            fontWeight: 400,
            opacity: 0.45,
            fontSize: "min(7vw, 9vh)",
            letterSpacing: "0.25em"
          }}
        >
          {hourFormat === "12" && <span>{ampm}</span>}
          {showSeconds && (
            <span
              key={ss}
              style={{
                display: "inline-block",
                fontVariantNumeric: "tabular-nums",
                animation: "fx-sectick 600ms ease both",
                minWidth: "2ch",
                textAlign: "center"
              }}
            >
              {ss}
            </span>
          )}
        </div>
      )}
    </main>
  );
}

function Styles() {
  // All entrance animations live here. Pure CSS, CSP-safe (inline <style>).
  return (
    <style>{`
      @keyframes fx-flip {
        0%   { transform: rotateX(-90deg); opacity: 0; }
        100% { transform: rotateX(0deg); opacity: 1; }
      }
      @keyframes fx-slide {
        0%   { transform: translateY(-0.6em); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
      @keyframes fx-dissolve {
        0%   { transform: scale(1.4); opacity: 0; letter-spacing: 0.4em; }
        100% { transform: scale(1); opacity: 1; letter-spacing: 0; }
      }
      @keyframes fx-blur {
        0%   { filter: blur(22px); opacity: 0; }
        100% { filter: blur(0); opacity: 1; }
      }
      @keyframes fx-glitch {
        0%   { transform: translate(-0.12em, 0.08em) skewX(18deg); opacity: 0; }
        40%  { transform: translate(0.08em, -0.04em) skewX(-10deg); opacity: 1; }
        70%  { transform: translate(-0.03em, 0) skewX(4deg); }
        100% { transform: translate(0, 0) skewX(0); opacity: 1; }
      }
      @keyframes fx-fall {
        0%   { transform: translateY(-0.8em) rotate(-12deg); opacity: 0; }
        60%  { transform: translateY(0.08em) rotate(3deg); opacity: 1; }
        100% { transform: translateY(0) rotate(0); opacity: 1; }
      }
      @keyframes fx-scale {
        0%   { transform: scale(0); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes fx-sectick {
        0%   { transform: translateY(-0.25em); opacity: 0; }
        100% { transform: translateY(0); opacity: 0.45; }
      }
    `}</style>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <Wallpaper />
  </StrictMode>
);
