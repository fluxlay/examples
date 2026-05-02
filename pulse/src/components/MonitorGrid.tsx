import { memo } from "react";
import { COLOR_GRID_MAJOR, COLOR_GRID_MINOR } from "../constants";

/** 医療モニター方眼背景。20px minor + 100px major のクロスハッチ。 */
function MonitorGridImpl({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(${COLOR_GRID_MAJOR} 1px, transparent 1px),
          linear-gradient(90deg, ${COLOR_GRID_MAJOR} 1px, transparent 1px),
          linear-gradient(${COLOR_GRID_MINOR} 1px, transparent 1px),
          linear-gradient(90deg, ${COLOR_GRID_MINOR} 1px, transparent 1px)
        `,
        backgroundSize: "100px 100px, 100px 100px, 20px 20px, 20px 20px",
      }}
    />
  );
}

export const MonitorGrid = memo(MonitorGridImpl);
