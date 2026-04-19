import { useShell } from "@fluxlay/react";
import { useEffect, useMemo, useState } from "react";
import { buildEnvTarget, type EnvTarget, parseWeather, phaseFromDate } from "./environment";

// dev-only time-lapse: > 0 cycles the full 24h day in this many seconds.
// set to 0 (or remove) for production — then phase follows the real clock.
const DEMO_CYCLE_SECONDS = 0;

export function useEnvironment(): EnvTarget {
  const weather = useShell("weather", { refreshInterval: 600_000 });

  const tickMs = DEMO_CYCLE_SECONDS > 0 ? 250 : 60_000;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  return useMemo(() => {
    const phase =
      DEMO_CYCLE_SECONDS > 0
        ? (((now.getTime() / 1000 / DEMO_CYCLE_SECONDS) % 1) + 1) % 1
        : phaseFromDate(now);
    const w = parseWeather(weather.result?.stdout);
    return buildEnvTarget(phase, w);
  }, [now, weather.result?.stdout]);
}
