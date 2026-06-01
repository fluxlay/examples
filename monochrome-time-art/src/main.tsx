import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { useProperties } from "@fluxlay/react";

// ── Configurable properties (see fluxlay.yaml) ───────────────────────────────
type Props = {
  theme: "dark" | "light";
  hourFormat: "24" | "12";
  showSeconds: boolean;
  showWeather: boolean;
  weatherLocation: string;
  fontMode: string;
  animationMode: string;
};

// ── Typefaces ────────────────────────────────────────────────────────────────
// key -> { family (CSS font-family), gf (Google Fonts family spec) }
// A unified family of bold display faces — grotesque / condensed sans plus a
// few high-contrast serifs. They all share the same Swiss, poster temperament,
// so shuffling between them stays cohesive minute to minute.
const FONTS: Record<string, { family: string; gf: string }> = {
  archivo: { family: "'Archivo Black', sans-serif", gf: "Archivo+Black" },
  anton: { family: "'Anton', sans-serif", gf: "Anton" },
  bebas: { family: "'Bebas Neue', sans-serif", gf: "Bebas+Neue" },
  oswald: { family: "'Oswald', sans-serif", gf: "Oswald:wght@700" },
  saira: { family: "'Saira Condensed', sans-serif", gf: "Saira+Condensed:wght@700" },
  khand: { family: "'Khand', sans-serif", gf: "Khand:wght@700" },
  barlow: { family: "'Barlow Condensed', sans-serif", gf: "Barlow+Condensed:wght@700" },
  inter: { family: "'Inter', sans-serif", gf: "Inter:wght@800" },
  playfair: { family: "'Playfair Display', serif", gf: "Playfair+Display:wght@700" },
  dmserif: { family: "'DM Serif Display', serif", gf: "DM+Serif+Display" },
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
  return ((seed * 2654435761) >>> 0) % len;
}

// ── Weather (Open-Meteo, no API key, CORS-enabled → plain fetch works) ────────
type WeatherKind = "sun" | "partly" | "cloud" | "fog" | "rain" | "snow" | "thunder";
type Weather = { temp: number; kind: WeatherKind; place: string };

// WMO weather interpretation codes → icon kind.
function weatherKind(code: number): WeatherKind {
  if (code === 0) return "sun";
  if (code <= 2) return "partly";
  if (code === 3) return "cloud";
  if (code <= 48) return "fog";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "rain";
  if (code <= 86) return "snow";
  return "thunder";
}

// Minimal, geometric line icons drawn inline as SVG (CSP-safe, no external
// assets). Single consistent stroke weight in `currentColor` for a clean,
// strictly-monochrome Swiss look.
function WeatherIcon({ kind }: { kind: WeatherKind }) {
  const common = {
    width: "1.55em",
    height: "1.55em",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: { display: "block" }
  };
  const cloud = "M18 18.5H7.5A4 4 0 0 1 7 10.55 6 6 0 0 1 18.3 11 3.75 3.75 0 0 1 18 18.5Z";
  switch (kind) {
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
        </svg>
      );
    case "partly":
      return (
        <svg {...common}>
          <circle cx="8.5" cy="8" r="3" />
          <path d="M8.5 2.6v1.4M3 8H1.6M13.4 8H12M4.4 4.4l1 1M12.6 4.4l-1 1" />
          <path d="M18 19H9a3.5 3.5 0 0 1-.4-6.97A5 5 0 0 1 18.3 12 3.3 3.3 0 0 1 18 19Z" />
        </svg>
      );
    case "cloud":
      return (
        <svg {...common}>
          <path d={cloud} />
        </svg>
      );
    case "fog":
      return (
        <svg {...common}>
          <path d="M4 9h16M6 13h12M8 17h8" />
        </svg>
      );
    case "rain":
      return (
        <svg {...common}>
          <path d={cloud} />
          <path d="M9 20.5l-1 2M13 20.5l-1 2M17 20.5l-1 2" />
        </svg>
      );
    case "snow":
      return (
        <svg {...common}>
          <path d={cloud} />
          <path d="M9 21h.01M13 21.5h.01M17 21h.01" />
        </svg>
      );
    case "thunder":
      return (
        <svg {...common}>
          <path d={cloud} />
          <path d="M13 19l-3 3.5h3l-2.5 3" />
        </svg>
      );
  }
}

function useWeather(enabled: boolean, location: string): Weather | null {
  const [weather, setWeather] = useState<Weather | null>(null);
  useEffect(() => {
    if (!enabled || !location.trim()) {
      setWeather(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
        ).then(r => r.json());
        const g = geoRes?.results?.[0];
        if (!g) return;
        const fc = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&current=temperature_2m,weather_code`
        ).then(r => r.json());
        const cur = fc?.current;
        if (cancelled || !cur) return;
        setWeather({ temp: Math.round(cur.temperature_2m), kind: weatherKind(cur.weather_code), place: g.name });
      } catch {
        /* network/parse failure — leave the weather line hidden */
      }
    };
    void load();
    const id = setInterval(() => void load(), 30 * 60 * 1000); // refresh every 30 min
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, location]);
  return weather;
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
  const showWeather = props.showWeather ?? false;
  const weatherLocation = props.weatherLocation ?? "Tokyo";
  const fontMode = props.fontMode ?? "shuffle";
  const animationMode = props.animationMode ?? "shuffle";

  useGoogleFonts();
  const weather = useWeather(showWeather, weatherLocation);

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

  // Swiss-poster layout: left-aligned, vertically centred. The time is a single
  // horizontal HH MM line set inside an inverted highlight block (black on
  // white), with the seconds sitting just below and slightly indented.
  return (
    <main
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingLeft: "8vw",
        background: bg,
        color: fg,
        overflow: "hidden",
        userSelect: "none"
      }}
    >
      <Styles />
      <div
        // re-mount on each minute so the entrance animation replays
        key={epoch}
        style={{
          animation: `fx-${animation} 900ms cubic-bezier(0.16, 1, 0.3, 1) both`,
          transformOrigin: "left center"
        }}
      >
        <span
          className="time-box"
          style={{
            display: "inline-block",
            background: fg,
            color: bg,
            padding: "0.14em 0.16em",
            fontFamily,
            fontWeight: 700,
            fontSize: "min(20vw, 26vh)",
            lineHeight: 1,
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap"
          }}
        >
          {hh}&nbsp;{mm}
        </span>
      </div>

      {(showSeconds || hourFormat === "12") && (
        <div
          style={{
            marginTop: "0.35em",
            marginLeft: "0.4em",
            display: "flex",
            alignItems: "baseline",
            gap: "0.5em",
            fontFamily,
            fontWeight: 700,
            opacity: 0.92,
            fontSize: "min(7vw, 9vh)",
            letterSpacing: "0.02em"
          }}
        >
          {hourFormat === "12" && <span style={{ opacity: 0.6 }}>{ampm}</span>}
          {showSeconds && (
            <span
              key={ss}
              style={{
                display: "inline-block",
                fontVariantNumeric: "tabular-nums",
                animation: "fx-sectick 600ms ease both",
                minWidth: "2ch"
              }}
            >
              {ss}
            </span>
          )}
        </div>
      )}

      {weather && (
        // Anchored to the bottom-left corner, flush to the same 8vw left axis as
        // the time — a quiet caption tier across the page's active negative space.
        <div
          style={{
            position: "absolute",
            left: "8vw",
            bottom: "7vh",
            display: "flex",
            alignItems: "center",
            gap: "0.55em",
            fontFamily,
            fontWeight: 600,
            opacity: 0.5,
            fontSize: "min(2.6vw, 3.4vh)",
            letterSpacing: "0.18em",
            textTransform: "uppercase"
          }}
        >
          <WeatherIcon kind={weather.kind} />
          <span>
            {weather.place} {weather.temp}°
          </span>
        </div>
      )}
    </main>
  );
}

function Styles() {
  // All entrance animations live here. Pure CSS, CSP-safe (inline <style>).
  return (
    <style>{`
      /* Trim the line box to the cap height / alphabetic baseline so the white
         block hugs the digits with even top & bottom padding across every font,
         regardless of each typeface's intrinsic vertical metrics. */
      .time-box {
        text-box-trim: trim-both;
        text-box-edge: cap alphabetic;
        text-box: trim-both cap alphabetic;
      }
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
        100% { transform: translateY(0); opacity: 1; }
      }
    `}</style>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <Wallpaper />
  </StrictMode>
);
