import { memo } from "react";

/** Critical 時の薄い赤 vignette。 */
function AlertOverlayImpl({ isCritical }: { isCritical: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          "radial-gradient(circle at 50% 50%, transparent 35%, rgba(255, 51, 68, 0.18) 100%)",
        opacity: isCritical ? 1 : 0,
        transition: "opacity 1.2s ease",
      }}
    />
  );
}

export const AlertOverlay = memo(AlertOverlayImpl);
