import { useAudio, useMediaMetadata, useProperties, useSystemMonitor } from "@fluxlay/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const BAR_COUNT = 128;

type ThemeMode = "auto" | "dark" | "light";

type Properties = {
  themeMode: ThemeMode;
  showMediaInfo: boolean;
};

function useTheme(mode: ThemeMode): boolean {
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const dark = mode === "dark" ? true : mode === "light" ? false : systemDark;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return dark;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes.toFixed(0)} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 ** 2) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / 1024 ** 2).toFixed(2)} MB/s`;
}

function formatUptime(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function GaugeBar({ label, value, unit }: { label: string; value: number; unit?: string }) {
  const percent = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-baseline font-mono text-[10px]">
        <span className="tracking-[0.25em] uppercase text-fg-strong">{label}</span>
        <span className="text-fg-muted tabular-nums">
          {percent.toFixed(1)}%{unit ? ` · ${unit}` : ""}
        </span>
      </div>
      <div className="relative h-[3px] bg-track overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-fg-strong transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function CoreGrid({ cores }: { cores: number[] }) {
  const cols = Math.min(cores.length, 16);
  return (
    <div className="flex flex-col gap-1">
      <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-fg-strong">CPU CORES</div>
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {cores.map((usage, i) => {
          const intensity = Math.max(0.06, usage / 100);
          return (
            <div
              key={i.toString()}
              className="h-3 font-mono text-[8px] flex items-center justify-center tabular-nums"
              style={{
                backgroundColor: `color-mix(in srgb, var(--color-fg) ${intensity * 100}%, transparent)`,
                color: usage > 50 ? "var(--color-bg)" : "var(--color-fg-muted)",
              }}
            >
              {usage.toFixed(0)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BatteryIndicator({ level, charging }: { level: number | null; charging: boolean | null }) {
  if (level === null) {
    return <div className="font-mono text-[10px] text-fg-muted tracking-[0.25em] uppercase">BATTERY · N/A</div>;
  }
  const segments = 12;
  const filled = Math.round((level / 100) * segments);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-baseline font-mono text-[10px]">
        <span className="tracking-[0.25em] uppercase text-fg-strong">
          BATTERY{charging ? " · CHG" : ""}
        </span>
        <span className="text-fg-muted tabular-nums">{level.toFixed(1)}%</span>
      </div>
      <div className="flex gap-[2px]">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i.toString()}
            className={`h-2 flex-1 ${i < filled ? "bg-fg-strong" : "bg-track"}`}
          />
        ))}
      </div>
    </div>
  );
}

function IoRow({ label, rows }: { label: string; rows: { label: string; value: string }[] }) {
  return (
    <div className="flex flex-col gap-1 font-mono text-[10px]">
      <div className="tracking-[0.25em] uppercase text-fg-strong">{label}</div>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        {rows.map((row) => (
          <React.Fragment key={row.label}>
            <span className="text-fg-muted">{row.label}</span>
            <span className="text-fg-sub text-right tabular-nums">{row.value}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function AudioStrip({ heightRatio = 0.18 }: { heightRatio?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const audio = useAudio({ numBands: BAR_COUNT });
  const audioRef = useRef({ rms: 0, peak: 0, spectrum: [] as number[] });
  const smoothRef = useRef<Float32Array>(new Float32Array(BAR_COUNT));

  useEffect(() => {
    audioRef.current = { rms: audio.rms, peak: audio.peak, spectrum: audio.spectrum };
  }, [audio.rms, audio.peak, audio.spectrum]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = Math.max(80, Math.round(window.innerHeight * heightRatio));

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.clearRect(0, 0, w, h);

    const styles = getComputedStyle(document.documentElement);
    const fg = styles.getPropertyValue("--color-fg").trim() || "#ffffff";
    const fgGhost = styles.getPropertyValue("--color-fg-ghost").trim() || "rgba(255,255,255,0.08)";

    const { rms, spectrum } = audioRef.current;
    const smooth = smoothRef.current;
    for (let i = 0; i < BAR_COUNT; i++) {
      const target = spectrum[i] ?? 0;
      smooth[i] += (target - smooth[i]) * 0.25;
    }

    ctx.fillStyle = fgGhost;
    ctx.fillRect(0, h - 1, w, 1);

    const gap = 1;
    const slot = w / BAR_COUNT;
    const barWidth = Math.max(1, slot - gap);
    const maxBarHeight = h * 0.92;

    ctx.fillStyle = fg;
    for (let i = 0; i < BAR_COUNT; i++) {
      const v = smooth[i];
      const barHeight = Math.max(1, v * maxBarHeight);
      const x = i * slot + gap / 2;
      const y = h - barHeight;
      ctx.fillRect(x, y, barWidth, barHeight);
    }

    ctx.beginPath();
    for (let i = 0; i < BAR_COUNT; i++) {
      const v = smooth[i];
      const x = i * slot + slot / 2;
      const y = h - v * maxBarHeight - 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = fg;
    ctx.globalAlpha = 0.35 + rms * 0.4;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;

    animFrameRef.current = requestAnimationFrame(draw);
  }, [heightRatio]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  return <canvas ref={canvasRef} className="block w-full" />;
}

function MediaInfoLine() {
  const media = useMediaMetadata();
  if (!media.title && !media.artist) return null;
  const progress =
    media.duration && media.elapsedTime ? media.elapsedTime / media.duration : 0;
  return (
    <div className="flex items-center gap-3 font-mono text-[10px] text-fg-sub tracking-[0.15em] uppercase">
      <span className="text-fg-strong truncate max-w-[40ch]">{media.title || "—"}</span>
      {media.artist && <span className="text-fg-muted truncate max-w-[30ch]">· {media.artist}</span>}
      {media.duration != null && media.duration > 0 && (
        <span className="ml-auto h-[2px] w-32 bg-track relative">
          <span
            className="absolute inset-y-0 left-0 bg-fg-strong transition-[width] duration-1000"
            style={{ width: `${progress * 100}%` }}
          />
        </span>
      )}
    </div>
  );
}

const MonochromeMonitor = () => {
  const { themeMode = "auto", showMediaInfo = true } = useProperties<Properties>();
  useTheme(themeMode);

  const info = useSystemMonitor({
    cpuIntervalMs: 500,
    memoryIntervalMs: 1000,
    networkIntervalMs: 1000,
    diskIoIntervalMs: 2000,
    diskSpaceIntervalMs: 30000,
    batteryIntervalMs: 10000,
    processIntervalMs: 10000,
    loadAverageIntervalMs: 5000,
  });

  const prevCpuRef = useRef(0);
  const smoothedCpu = prevCpuRef.current + (info.cpuUsage - prevCpuRef.current) * 0.3;
  prevCpuRef.current = smoothedCpu;

  return (
    <div className="w-full h-full bg-bg text-fg overflow-hidden relative font-mono transition-colors duration-500">
      {/* Top-left: identity */}
      <div className="absolute top-8 left-8 max-w-[40ch] flex flex-col gap-1">
        <div className="text-[10px] tracking-[0.4em] uppercase text-fg-strong">MONO · MONITOR</div>
        {info.hostname && (
          <div className="text-[10px] text-fg-sub tracking-[0.15em] uppercase">
            {info.hostname} · {info.osName} {info.kernelVersion}
          </div>
        )}
        {info.cpuBrand && (
          <div className="text-[10px] text-fg-muted tracking-[0.15em] uppercase">
            {info.cpuBrand} ({info.cpuArch}) {info.physicalCoreCount}P / {info.logicalCoreCount}L
          </div>
        )}
      </div>

      {/* Top-right: uptime / load / processes */}
      <div className="absolute top-8 right-8 flex flex-col items-end gap-1 text-[10px] tracking-[0.2em] uppercase">
        <div className="text-fg-muted">
          UPTIME <span className="text-fg-strong tabular-nums">{formatUptime(info.uptimeSecs)}</span>
        </div>
        <div className="text-fg-muted">
          PROCS <span className="text-fg-strong tabular-nums">{info.processCount.toLocaleString()}</span>
        </div>
        <div className="text-fg-muted">
          LOAD{" "}
          <span className="text-fg-strong tabular-nums">
            {info.loadAverage.map((v) => v.toFixed(2)).join(" ")}
          </span>
        </div>
      </div>

      {/* Mid-left: CPU + cores + network */}
      <div className="absolute top-1/2 left-8 -translate-y-1/2 w-[320px] flex flex-col gap-5">
        <GaugeBar label="CPU" value={smoothedCpu} />
        {info.cpuPerCore.length > 0 && <CoreGrid cores={info.cpuPerCore} />}
        <IoRow
          label="NETWORK"
          rows={[
            { label: "RX", value: formatSpeed(info.networkRxBytesPerSec) },
            { label: "TX", value: formatSpeed(info.networkTxBytesPerSec) },
          ]}
        />
      </div>

      {/* Mid-right: memory / swap / battery / disk i/o */}
      <div className="absolute top-1/2 right-8 -translate-y-1/2 w-[320px] flex flex-col gap-5">
        <GaugeBar
          label="MEMORY"
          value={info.memoryUsage}
          unit={`${formatBytes(info.memoryUsed)} / ${formatBytes(info.memoryTotal)}`}
        />
        {info.swapTotal > 0 && (
          <GaugeBar
            label="SWAP"
            value={info.swapUsage}
            unit={`${formatBytes(info.swapUsed)} / ${formatBytes(info.swapTotal)}`}
          />
        )}
        <BatteryIndicator level={info.batteryLevel} charging={info.batteryCharging} />
        <IoRow
          label="DISK I/O"
          rows={[
            { label: "READ", value: formatSpeed(info.diskReadBytesPerSec) },
            { label: "WRITE", value: formatSpeed(info.diskWriteBytesPerSec) },
          ]}
        />
      </div>

      {/* Storage strip — sits just above the audio visualizer */}
      {info.disks.length > 0 && (
        <div className="absolute left-8 right-8 bottom-[calc(18%+96px)] flex flex-col gap-1 text-[10px]">
          <div className="tracking-[0.25em] uppercase text-fg-strong">STORAGE</div>
          <div
            className="grid gap-x-6 gap-y-1"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
          >
            {info.disks.map((disk) => (
              <div key={disk.mountPoint} className="flex flex-col gap-0.5">
                <div className="flex justify-between text-fg-muted">
                  <span className="truncate">{disk.mountPoint}</span>
                  <span className="text-fg-sub tabular-nums">
                    {formatBytes(disk.totalBytes - disk.availableBytes)} / {formatBytes(disk.totalBytes)}
                  </span>
                </div>
                <div className="relative h-[2px] bg-track">
                  <div
                    className="absolute inset-y-0 left-0 bg-fg-strong"
                    style={{ width: `${disk.usage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Media info — hovers above the audio strip */}
      {showMediaInfo && (
        <div className="absolute left-8 right-8 bottom-[calc(18%+24px)]">
          <MediaInfoLine />
        </div>
      )}

      {/* Bottom audio visualizer */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <AudioStrip heightRatio={0.18} />
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <MonochromeMonitor />
  </React.StrictMode>,
);
