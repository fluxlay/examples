import { memo } from "react";
import { BATTERY_LOW_THRESHOLD, BATTERY_SEGMENTS } from "../constants";

interface BatterySegmentsProps {
  level: number | null;
  charging: boolean | null;
}

/** 12 セグメントバー。level=null は DESKTOP 表示。<= 20% は alert 色。 */
function BatterySegmentsImpl({ level, charging }: BatterySegmentsProps) {
  if (level === null) {
    return (
      <div className="h-full flex items-center px-6">
        <span
          className="text-[14px] tracking-[0.4em] uppercase"
          style={{ color: "var(--color-text-dim)" }}
        >
          DESKTOP · NO BATTERY
        </span>
      </div>
    );
  }

  const safe = Math.max(0, Math.min(100, level));
  const filled = Math.round((safe / 100) * BATTERY_SEGMENTS);
  const isLow = safe < BATTERY_LOW_THRESHOLD;
  const onColor = isLow ? "var(--color-alert)" : "var(--color-bat)";
  const offColor = "rgba(255, 153, 204, 0.08)";

  return (
    <div className="h-full flex items-center gap-4 px-6">
      <div className="flex gap-[3px] flex-1">
        {Array.from({ length: BATTERY_SEGMENTS }).map((_, i) => {
          const on = i < filled;
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: segment index is stable identity
              key={i}
              className="flex-1"
              style={{
                height: 28,
                background: on ? onColor : offColor,
                boxShadow: on ? `0 0 10px ${onColor}` : "none",
                transition: "background 0.4s ease, box-shadow 0.4s ease",
              }}
            />
          );
        })}
      </div>
      {charging === true ? (
        <span
          className="text-[13px] tracking-[0.2em] uppercase shrink-0"
          style={{ color: "var(--color-bat)" }}
        >
          ⚡ CHARGING
        </span>
      ) : charging === false ? (
        <span
          className="text-[12px] tracking-[0.2em] uppercase shrink-0"
          style={{ color: "var(--color-text-dim)" }}
        >
          DISCHARGING
        </span>
      ) : null}
    </div>
  );
}

export const BatterySegments = memo(BatterySegmentsImpl);
