import { memo } from "react";
import { FOOTER_HEIGHT } from "../constants";

interface PatientFooterProps {
  isCritical: boolean;
  currentTime: string;
}

/** 下部 status bar。NORMAL / ALERT 状態と現在時刻。 */
function PatientFooterImpl({ isCritical, currentTime }: PatientFooterProps) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-6 text-[11px] tracking-[0.2em] uppercase"
      style={{
        height: FOOTER_HEIGHT,
        color: "var(--color-text-dim)",
        borderTop: "1px solid rgba(0,255,200,0.12)",
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className={isCritical ? "alert-flash" : ""}
          style={{
            color: isCritical ? "var(--color-alert)" : "var(--color-text)",
          }}
        >
          ▌ {isCritical ? "ALERT · CRITICAL LOAD" : "NORMAL OPERATION"}
        </span>
      </div>
      <div className="tabular-nums" style={{ color: "var(--color-text)" }}>
        {currentTime}
      </div>
    </div>
  );
}

export const PatientFooter = memo(PatientFooterImpl);
