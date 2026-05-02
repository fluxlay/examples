import { memo } from "react";
import { HEADER_HEIGHT, MENUBAR_OFFSET } from "../constants";
import { formatUptimeLong } from "../utils/format";

interface PatientHeaderProps {
  hostname: string;
  osName: string;
  cpuBrand: string;
  uptimeSecs: number;
  currentTime: string;
}

/** 上部 status bar。患者 ID 風に hostname / OS / CPU brand / uptime / 時刻。 */
function PatientHeaderImpl(props: PatientHeaderProps) {
  return (
    <div
      className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 text-[11px] tracking-[0.2em] uppercase"
      style={{
        height: HEADER_HEIGHT,
        paddingTop: MENUBAR_OFFSET,
        color: "var(--color-text-dim)",
        borderBottom: "1px solid rgba(0,255,200,0.12)",
      }}
    >
      <div className="flex items-center gap-6 min-w-0">
        <span style={{ color: "var(--color-accent)" }}>● PULSE</span>
        <span className="truncate" style={{ color: "var(--color-text)" }}>
          ID: {props.hostname || "—"}
        </span>
        <span className="truncate hidden md:inline">{props.osName || "—"}</span>
        <span className="truncate hidden lg:inline">{props.cpuBrand || "—"}</span>
      </div>
      <div className="flex items-center gap-6 tabular-nums shrink-0">
        <span>UP {formatUptimeLong(props.uptimeSecs)}</span>
        <span style={{ color: "var(--color-text)" }}>{props.currentTime}</span>
      </div>
    </div>
  );
}

export const PatientHeader = memo(PatientHeaderImpl);
