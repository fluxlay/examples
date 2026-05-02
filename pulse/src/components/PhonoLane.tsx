import { memo, useEffect, useRef } from "react";
import { LANE_LABEL_WIDTH } from "../constants";

interface PhonoLaneProps {
  primaryValue: string;
  secondaryValue?: string;
  color: string;
  rmsRef: React.MutableRefObject<number>;
  peakRef: React.MutableRefObject<number>;
  spectrumRef: React.MutableRefObject<number[]>;
  height: number | string;
  bottom?: boolean;
}

const BAND_COUNT = 24;
const LED_ROWS = 12;
const SIDE_MARGIN = 12;
const BAR_GAP = 2;
const SEG_GAP = 1;
const PADDING_Y = 8;
const PEAK_DECAY_PER_SEC = 0.55;
const PEAK_COLOR = "#ff77aa";

/** PHONO レーン: VFD/LED 風スペクトラムアナライザー。
 *  spectrum を 24 帯にビン化し、各バンドを 12 セグメントの LED で積み上げる。
 *  各バンドにピークホールド表示（赤）が降下する。 */
function PhonoLaneImpl({
  primaryValue,
  secondaryValue,
  color,
  rmsRef: _rmsRef,
  peakRef: _peakRef,
  spectrumRef,
  height,
  bottom,
}: PhonoLaneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef(color);
  colorRef.current = color;
  const smoothBandsRef = useRef(new Float32Array(BAND_COUNT));
  const peakHoldRef = useRef(new Float32Array(BAND_COUNT));

  useEffect(() => {
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
    let lastNow = performance.now();
    const smoothBands = smoothBandsRef.current;
    const peakHold = peakHoldRef.current;
    const bands = new Float32Array(BAND_COUNT);

    const draw = (now: number) => {
      const dt = Math.min(0.1, (now - lastNow) / 1000);
      lastNow = now;

      if (cssW > 0 && cssH > 0) {
        ctx.clearRect(0, 0, cssW, cssH);

        const spectrum = spectrumRef.current;
        const n = spectrum.length;

        // Rebin spectrum to BAND_COUNT bands.
        if (n > 0) {
          const binSize = n / BAND_COUNT;
          for (let i = 0; i < BAND_COUNT; i++) {
            const start = Math.floor(i * binSize);
            const end = Math.max(start + 1, Math.floor((i + 1) * binSize));
            let sum = 0;
            let cnt = 0;
            for (let j = start; j < end && j < n; j++) {
              sum += spectrum[j] ?? 0;
              cnt++;
            }
            bands[i] = cnt > 0 ? sum / cnt : 0;
          }
        } else {
          bands.fill(0);
        }

        // Asymmetric smoothing: snap up, fall slow.
        for (let i = 0; i < BAND_COUNT; i++) {
          const target = Math.min(1, (bands[i] ?? 0) * 1.6);
          const current = smoothBands[i] ?? 0;
          const a = target > current ? 0.5 : 0.18;
          smoothBands[i] = current + (target - current) * a;
        }

        // Peak hold update.
        for (let i = 0; i < BAND_COUNT; i++) {
          const v = smoothBands[i] ?? 0;
          if (v > (peakHold[i] ?? 0)) {
            peakHold[i] = v;
          } else {
            peakHold[i] = Math.max(0, (peakHold[i] ?? 0) - PEAK_DECAY_PER_SEC * dt);
          }
        }

        // Geometry.
        const usableH = cssH - PADDING_Y * 2;
        const segHeight = (usableH - SEG_GAP * (LED_ROWS - 1)) / LED_ROWS;
        const bottomY = cssH - PADDING_Y;
        const totalBarSpace = cssW - SIDE_MARGIN * 2 - BAR_GAP * (BAND_COUNT - 1);
        const barWidth = Math.max(1, totalBarSpace / BAND_COUNT);
        const onColor = colorRef.current;
        const offColor = "rgba(187, 136, 255, 0.07)";

        for (let i = 0; i < BAND_COUNT; i++) {
          const x = SIDE_MARGIN + i * (barWidth + BAR_GAP);
          const v = smoothBands[i] ?? 0;
          const lit = Math.min(LED_ROWS, Math.floor(v * LED_ROWS));

          // OFF segments (dim background grid).
          ctx.fillStyle = offColor;
          for (let j = 0; j < LED_ROWS; j++) {
            const y = bottomY - (j + 1) * segHeight - j * SEG_GAP;
            ctx.fillRect(x, y, barWidth, segHeight);
          }

          // ON segments.
          if (lit > 0) {
            ctx.fillStyle = onColor;
            ctx.shadowColor = onColor;
            ctx.shadowBlur = 4;
            for (let j = 0; j < lit; j++) {
              const y = bottomY - (j + 1) * segHeight - j * SEG_GAP;
              ctx.fillRect(x, y, barWidth, segHeight);
            }
            ctx.shadowBlur = 0;
          }

          // Peak hold (sits one row above the lit stack).
          const peakV = peakHold[i] ?? 0;
          const peakRow = Math.min(LED_ROWS, Math.floor(peakV * LED_ROWS));
          if (peakRow > lit && peakRow > 0) {
            const y = bottomY - peakRow * segHeight - (peakRow - 1) * SEG_GAP;
            ctx.fillStyle = PEAK_COLOR;
            ctx.shadowColor = PEAK_COLOR;
            ctx.shadowBlur = 3;
            ctx.fillRect(x, y, barWidth, Math.max(1.5, segHeight * 0.4));
            ctx.shadowBlur = 0;
          }
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [spectrumRef]);

  return (
    <div
      className="flex"
      style={{
        height,
        borderBottom: bottom ? "none" : "1px solid rgba(0,255,200,0.08)",
      }}
    >
      <div
        className="flex flex-col justify-center px-6 shrink-0 gap-1"
        style={{ width: LANE_LABEL_WIDTH }}
      >
        <div className="text-[14px] font-semibold tracking-[0.18em] uppercase" style={{ color }}>
          PHONO
        </div>
        <div
          className="text-[10px] tracking-[0.4em] uppercase"
          style={{ color: "var(--color-text-dim)" }}
        >
          Audio
        </div>
        <div
          className="text-[18px] tabular-nums leading-none mt-1 truncate"
          style={{ color: "var(--color-text)" }}
          title={primaryValue}
        >
          {primaryValue}
        </div>
        {secondaryValue ? (
          <div
            className="text-[11px] mt-0.5 truncate"
            style={{ color: "var(--color-text-dim)" }}
            title={secondaryValue}
          >
            {secondaryValue}
          </div>
        ) : null}
      </div>
      <div ref={wrapRef} className="flex-1 relative" style={{ minWidth: 0 }}>
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  );
}

export const PhonoLane = memo(PhonoLaneImpl);
