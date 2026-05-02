import { memo } from "react";
import { HEADER_HEIGHT } from "../constants";

interface BpmDisplayProps {
  cpuUsage: number;
  isCritical: boolean;
  color: string;
}

/** 大型 BPM 数字 (実値 = CPU%)。critical 時は点滅 + alert 色。 */
function BpmDisplayImpl({ cpuUsage, isCritical, color }: BpmDisplayProps) {
  const safe = Math.max(0, Math.min(100, cpuUsage));
  const valueColor = isCritical ? "var(--color-alert)" : color;
  return (
    <div
      className="absolute pointer-events-none flex flex-col items-end"
      style={{
        right: 32,
        top: HEADER_HEIGHT + 24,
        color: valueColor,
        fontFamily: "var(--font-mono)",
      }}
    >
      <div
        className={isCritical ? "alert-flash tabular-nums" : "tabular-nums"}
        style={{
          fontSize: 132,
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          textShadow: `0 0 24px ${valueColor}`,
        }}
      >
        {safe.toFixed(0)}
      </div>
      <div
        className="text-[10px] tracking-[0.4em] uppercase mt-1"
        style={{ color: "var(--color-text-dim)" }}
      >
        CPU · BPM (synth)
      </div>
    </div>
  );
}

export const BpmDisplay = memo(BpmDisplayImpl);
