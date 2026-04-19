export type Vec3 = [number, number, number];

export type EnvTarget = {
  sunX: number;
  sunY: number;
  phase: number;
  light: number;
  sunTint: Vec3;
  skyTint: Vec3;
  haze: number;
  agitation: number;
};

export function phaseFromDate(d: Date): number {
  const hours = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  return hours / 24;
}

type Key = {
  t: number;
  sun: Vec3;
  sky: Vec3;
  light: number;
  haze: number;
};

const KEYS: Key[] = [
  { t: 0.0, sun: [0.05, 0.12, 0.2], sky: [0.0, 0.02, 0.05], light: 0.18, haze: 0.15 },
  { t: 0.21, sun: [0.35, 0.3, 0.55], sky: [0.05, 0.06, 0.15], light: 0.35, haze: 0.3 },
  { t: 0.27, sun: [1.0, 0.55, 0.5], sky: [0.28, 0.18, 0.25], light: 0.7, haze: 0.4 },
  { t: 0.35, sun: [0.95, 0.85, 0.7], sky: [0.14, 0.3, 0.38], light: 0.95, haze: 0.25 },
  { t: 0.5, sun: [0.8, 1.0, 1.05], sky: [0.2, 0.52, 0.62], light: 1.15, haze: 0.2 },
  { t: 0.63, sun: [1.0, 0.9, 0.7], sky: [0.28, 0.45, 0.5], light: 1.0, haze: 0.25 },
  { t: 0.73, sun: [1.2, 0.65, 0.35], sky: [0.42, 0.28, 0.25], light: 0.85, haze: 0.4 },
  { t: 0.77, sun: [1.1, 0.4, 0.3], sky: [0.32, 0.15, 0.22], light: 0.6, haze: 0.5 },
  { t: 0.83, sun: [0.4, 0.28, 0.5], sky: [0.12, 0.1, 0.22], light: 0.38, haze: 0.35 },
  { t: 1.0, sun: [0.05, 0.12, 0.2], sky: [0.0, 0.02, 0.05], light: 0.18, haze: 0.15 },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function smoothstep01(u: number): number {
  return u * u * (3 - 2 * u);
}
function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function paletteForPhase(phase: number) {
  const t = ((phase % 1) + 1) % 1;
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i];
    const b = KEYS[i + 1];
    if (t >= a.t && t <= b.t) {
      const raw = (t - a.t) / (b.t - a.t);
      const u = smoothstep01(raw);
      return {
        sun: lerp3(a.sun, b.sun, u),
        sky: lerp3(a.sky, b.sky, u),
        light: lerp(a.light, b.light, u),
        haze: lerp(a.haze, b.haze, u),
      };
    }
  }
  const last = KEYS[0];
  return { sun: last.sun, sky: last.sky, light: last.light, haze: last.haze };
}

export function sunPositionFromPhase(phase: number): { sunX: number; sunY: number } {
  // 0.25 = sunrise (east, sunY=0), 0.5 = noon (overhead, sunY=1),
  // 0.75 = sunset (west), 0 and 1 = midnight (sunY=-1)
  const angle = (phase - 0.25) * Math.PI * 2;
  return { sunY: Math.sin(angle), sunX: -Math.cos(angle) };
}

type WeatherKind = "clear" | "cloudy" | "rain" | "storm";

type WeatherSummary = {
  kind: WeatherKind;
  cloudCover: number;
  precip: number;
  thunder: boolean;
};

const DEFAULT_WEATHER: WeatherSummary = {
  kind: "clear",
  cloudCover: 0.1,
  precip: 0.0,
  thunder: false,
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function parseWeather(stdout: string | null | undefined): WeatherSummary {
  if (!stdout) return DEFAULT_WEATHER;
  try {
    const json = JSON.parse(stdout);
    const cur = json?.current_condition?.[0];
    if (!cur) return DEFAULT_WEATHER;
    const cloudCover = clamp01(Number(cur.cloudcover) / 100);
    const precip = clamp01(Number(cur.precipMM) / 6);
    const code = Number(cur.weatherCode);
    const thunder = code === 200 || code === 386 || code === 389 || code === 392 || code === 395;
    let kind: WeatherKind;
    if (thunder || precip > 0.6) kind = "storm";
    else if (precip > 0.1) kind = "rain";
    else if (cloudCover > 0.5) kind = "cloudy";
    else kind = "clear";
    return { kind, cloudCover, precip, thunder };
  } catch {
    return DEFAULT_WEATHER;
  }
}

export function buildEnvTarget(phase: number, weather: WeatherSummary): EnvTarget {
  const pal = paletteForPhase(phase);
  const { sunX, sunY } = sunPositionFromPhase(phase);

  const haze = clamp01(pal.haze + weather.cloudCover * 0.4 + weather.precip * 0.2);
  const light = clamp01(pal.light * (1 - weather.cloudCover * 0.35) * (1 - weather.precip * 0.15));

  const sunAvg = (pal.sun[0] + pal.sun[1] + pal.sun[2]) / 3;
  const greyV: Vec3 = [sunAvg, sunAvg, sunAvg];
  const sunTint = lerp3(pal.sun, greyV, weather.cloudCover * 0.5);

  const agitation = clamp01(weather.precip * 0.7 + (weather.thunder ? 0.4 : 0));

  return {
    sunX,
    sunY,
    phase,
    light,
    sunTint,
    skyTint: pal.sky,
    haze,
    agitation,
  };
}

export function lerpScalar(current: number, target: number, k: number): number {
  return current + (target - current) * k;
}

export function lerpVec3(current: [number, number, number], target: Vec3, k: number) {
  current[0] += (target[0] - current[0]) * k;
  current[1] += (target[1] - current[1]) * k;
  current[2] += (target[2] - current[2]) * k;
}

export function approachRate(delta: number, timeConstant: number): number {
  return 1 - Math.exp(-delta / timeConstant);
}
