import { memo, type ReactNode, useEffect, useRef } from "react";
import { LANE_LABEL_WIDTH } from "../constants";

interface VitalLaneProps {
  medicalLabel: string;
  meaningLabel: string;
  primaryValue: string;
  secondaryValue?: string;
  color: string;
  baselinePercent: number;
  amplitudeRange: number;
  getSnapshot?: () => Float32Array;
  height: number | string;
  bottom?: boolean;
  children?: ReactNode;
}

/** 1 vital レーン: 左ラベル列 + 右 trace canvas (または DOM child)。
 *  trace は getSnapshot を 60fps で描画し、最右に書き込みカーソル線を描く。 */
function VitalLaneImpl(props: VitalLaneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    if (props.children) return; // canvas 不使用
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cssW = 0;
    let cssH = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      cssW = wrap.clientWidth;
      cssH = wrap.clientHeight;
      if (cssW <= 0 || cssH <= 0) return;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    let frame = 0;
    const draw = () => {
      const cur = propsRef.current;
      const snap = cur.getSnapshot?.();
      if (cssW > 0 && cssH > 0 && snap) {
        ctx.clearRect(0, 0, cssW, cssH);
        const n = snap.length;
        const dx = cssW / Math.max(1, n - 1);
        const baselineY = cssH * cur.baselinePercent;
        const ampPx = cssH * cur.amplitudeRange;

        ctx.strokeStyle = cur.color;
        ctx.shadowColor = cur.color;
        ctx.shadowBlur = 4;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const v = snap[i] ?? 0;
          const x = i * dx;
          const y = baselineY - v * ampPx;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // write cursor at right edge
        ctx.strokeStyle = cur.color;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cssW - 0.5, 0);
        ctx.lineTo(cssW - 0.5, cssH);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [props.children]);

  return (
    <div
      className="flex"
      style={{
        height: props.height,
        borderBottom: props.bottom ? "none" : "1px solid rgba(0,255,200,0.08)",
      }}
    >
      <div
        className="flex flex-col justify-center px-6 shrink-0 gap-1"
        style={{ width: LANE_LABEL_WIDTH }}
      >
        <div
          className="text-[14px] font-semibold tracking-[0.18em] uppercase"
          style={{ color: props.color }}
        >
          {props.medicalLabel}
        </div>
        <div
          className="text-[10px] tracking-[0.4em] uppercase"
          style={{ color: "var(--color-text-dim)" }}
        >
          {props.meaningLabel}
        </div>
        <div
          className="text-[24px] tabular-nums leading-none mt-1"
          style={{ color: "var(--color-text)" }}
        >
          {props.primaryValue}
        </div>
        {props.secondaryValue ? (
          <div
            className="text-[11px] mt-0.5 tabular-nums"
            style={{ color: "var(--color-text-dim)" }}
          >
            {props.secondaryValue}
          </div>
        ) : null}
      </div>
      <div ref={wrapRef} className="flex-1 relative" style={{ minWidth: 0 }}>
        {props.children ?? <canvas ref={canvasRef} className="block" />}
      </div>
    </div>
  );
}

export const VitalLane = memo(VitalLaneImpl);
