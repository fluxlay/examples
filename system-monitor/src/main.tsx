import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { useSystemMonitor } from "@fluxlay/react";
import "./index.css";

function useDarkMode(): boolean {
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return dark;
}

type ColorKey = "status-ok" | "status-warn" | "status-danger" | "accent" | "accent-purple";

function resolveStatus(value: number, warnAt: number, dangerAt: number): ColorKey {
  if (value > dangerAt) return "status-danger";
  if (value > warnAt) return "status-warn";
  return "status-ok";
}

function textClass(key: ColorKey): string {
  switch (key) {
    case "status-ok":
      return "text-status-ok";
    case "status-warn":
      return "text-status-warn";
    case "status-danger":
      return "text-status-danger";
    case "accent":
      return "text-accent";
    case "accent-purple":
      return "text-accent-purple";
  }
}

function bgClass(key: ColorKey): string {
  switch (key) {
    case "status-ok":
      return "bg-status-ok";
    case "status-warn":
      return "bg-status-warn";
    case "status-danger":
      return "bg-status-danger";
    case "accent":
      return "bg-accent";
    case "accent-purple":
      return "bg-accent-purple";
  }
}

function cssVar(key: ColorKey): string {
  switch (key) {
    case "status-ok":
      return "var(--color-status-ok)";
    case "status-warn":
      return "var(--color-status-warn)";
    case "status-danger":
      return "var(--color-status-danger)";
    case "accent":
      return "var(--color-accent)";
    case "accent-purple":
      return "var(--color-accent-purple)";
  }
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

function GaugeBar({
  label,
  value,
  max,
  colorKey,
  unit,
}: {
  label: string;
  value: number;
  max: number;
  colorKey: ColorKey;
  unit?: string;
}) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const isHigh = percent > 80;
  const color = cssVar(colorKey);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-baseline font-mono text-xs">
        <span className={`tracking-[0.15em] uppercase ${textClass(colorKey)}`}>{label}</span>
        <span className="text-text-sub tabular-nums">
          {percent.toFixed(1)}%{unit ? ` (${unit})` : ""}
        </span>
      </div>
      <div className="relative h-2 bg-bar-bg rounded-sm overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-sm transition-all duration-500 ease-out ${bgClass(colorKey)}`}
          style={{
            width: `${percent}%`,
            boxShadow: isHigh ? `0 0 12px ${color}` : `0 0 4px color-mix(in srgb, ${color} 33%, transparent)`,
          }}
        />
        <div className="absolute inset-y-0 w-0.5 bg-text-muted animate-pulse" style={{ left: `${percent}%` }} />
      </div>
    </div>
  );
}

function CoreGrid({ cores }: { cores: number[] }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="font-mono text-xs tracking-[0.15em] uppercase text-accent">CPU CORES</div>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${Math.min(cores.length, 8)}, 1fr)` }}>
        {cores.map((usage, i) => {
          const intensity = usage / 100;
          const key = resolveStatus(usage, 50, 80);
          const color = cssVar(key);
          return (
            <div
              key={i.toString()}
              className="h-4 rounded-[2px] flex items-center justify-center font-mono text-[8px] tabular-nums transition-all duration-300"
              style={{
                backgroundColor: `color-mix(in srgb, ${color} ${Math.max(15, intensity * 100)}%, transparent)`,
                boxShadow: usage > 60 ? `0 0 6px color-mix(in srgb, ${color} 27%, transparent)` : "none",
                color: intensity > 0.4 ? "var(--color-core-text-active)" : "var(--color-core-text-idle)",
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
    return <div className="font-mono text-xs text-text-muted tracking-wider">BATTERY N/A</div>;
  }

  const key: ColorKey = level > 50 ? "status-ok" : level > 20 ? "status-warn" : "status-danger";
  const color = cssVar(key);
  const segments = 10;
  const filled = Math.round((level / 100) * segments);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline font-mono text-xs">
        <span className={`tracking-[0.15em] uppercase ${textClass(key)}`}>BATTERY {charging ? "⚡" : ""}</span>
        <span className="text-text-sub tabular-nums">{level.toFixed(1)}%</span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i.toString()}
            className={`h-3 flex-1 rounded-[1px] transition-all duration-300 ${i < filled ? bgClass(key) : "bg-bar-bg"}`}
            style={{
              boxShadow: i < filled ? `0 0 6px color-mix(in srgb, ${color} 33%, transparent)` : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function IoPanel({
  label,
  colorKey,
  rows,
}: {
  label: string;
  colorKey: ColorKey;
  rows: { icon: string; label: string; value: string }[];
}) {
  return (
    <div className="flex flex-col gap-2 font-mono text-xs">
      <div className={`tracking-[0.15em] uppercase ${textClass(colorKey)}`}>{label}</div>
      <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-1">
        {rows.map(row => (
          <React.Fragment key={row.label}>
            <span className="text-text-muted">{row.icon}</span>
            <span className="text-text-muted">{row.label}</span>
            <span className="text-text-sub text-right tabular-nums">{row.value}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

const SystemMonitor = () => {
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
  useDarkMode();
  const prevCpuRef = useRef(0);

  const smoothedCpu = prevCpuRef.current + (info.cpuUsage - prevCpuRef.current) * 0.3;
  prevCpuRef.current = smoothedCpu;

  const cpuIntensity = smoothedCpu / 100;
  const glowColor =
    cpuIntensity > 0.8 ? `rgba(255, 50, 80, ${cpuIntensity * 0.2})` : `rgba(0, 200, 255, ${cpuIntensity * 0.1})`;

  return (
    <div className="w-full h-full bg-bg text-text overflow-hidden relative flex items-center justify-center transition-colors duration-500">
      {/* 背景グロー */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${glowColor} 0%, transparent 70%)`,
        }}
      />

      {/* メインパネル */}
      <div className="relative z-10 w-full max-w-md p-8 flex flex-col gap-4">
        {/* ヘッダー */}
        <div className="flex items-baseline justify-between border-b border-border pb-3 mb-1">
          <div>
            <h1 className="font-mono text-sm tracking-[0.3em] uppercase text-accent">SYS_MONITOR</h1>
            {info.hostname && (
              <p className="font-mono text-[10px] text-text-muted mt-0.5">
                {info.hostname} &middot; {info.osName} &middot; {info.kernelVersion}
              </p>
            )}
            {info.cpuBrand && (
              <p className="font-mono text-[10px] text-text-faint mt-0.5">
                {info.cpuBrand} ({info.cpuArch}) {info.physicalCoreCount}P/{info.logicalCoreCount}L
              </p>
            )}
          </div>
          <div className="text-right font-mono text-[10px] text-text-muted">
            <div>UPTIME {formatUptime(info.uptimeSecs)}</div>
            <div>PROCS {info.processCount.toLocaleString()}</div>
            <div>LOAD {info.loadAverage.map(v => v.toFixed(2)).join(" ")}</div>
          </div>
        </div>

        {/* CPU 全体 */}
        <GaugeBar label="CPU" value={smoothedCpu} max={100} colorKey={resolveStatus(smoothedCpu, 50, 80)} />

        {/* CPU コアグリッド */}
        {info.cpuPerCore.length > 0 && <CoreGrid cores={info.cpuPerCore} />}

        {/* メモリ */}
        <GaugeBar
          label="MEMORY"
          value={info.memoryUsage}
          max={100}
          colorKey={info.memoryUsage > 80 ? "status-danger" : "accent-purple"}
          unit={`${formatBytes(info.memoryUsed)} / ${formatBytes(info.memoryTotal)}`}
        />

        {/* スワップ */}
        {info.swapTotal > 0 && (
          <GaugeBar
            label="SWAP"
            value={info.swapUsage}
            max={100}
            colorKey={info.swapUsage > 50 ? "status-warn" : "accent-purple"}
            unit={`${formatBytes(info.swapUsed)} / ${formatBytes(info.swapTotal)}`}
          />
        )}

        {/* バッテリー */}
        <BatteryIndicator level={info.batteryLevel} charging={info.batteryCharging} />

        {/* ネットワーク */}
        <IoPanel
          label="NETWORK"
          colorKey="accent"
          rows={[
            { icon: "▼", label: "RX", value: formatSpeed(info.networkRxBytesPerSec) },
            { icon: "▲", label: "TX", value: formatSpeed(info.networkTxBytesPerSec) },
          ]}
        />

        {/* ディスクI/O */}
        <IoPanel
          label="DISK I/O"
          colorKey="accent-purple"
          rows={[
            { icon: "◀", label: "READ", value: formatSpeed(info.diskReadBytesPerSec) },
            { icon: "▶", label: "WRITE", value: formatSpeed(info.diskWriteBytesPerSec) },
          ]}
        />

        {/* ディスク容量 */}
        {info.disks.length > 0 && (
          <div className="flex flex-col gap-2 font-mono text-xs">
            <div className="tracking-[0.15em] uppercase text-accent-storage">STORAGE</div>
            <div className="flex flex-col gap-1.5">
              {info.disks.map(disk => {
                const diskKey: ColorKey =
                  disk.usage > 90 ? "status-danger" : disk.usage > 70 ? "status-warn" : "accent-purple";
                return (
                  <div key={disk.mountPoint} className="flex flex-col gap-0.5">
                    <div className="flex justify-between text-text-muted">
                      <span>{disk.mountPoint}</span>
                      <span className="text-text-sub tabular-nums">
                        {formatBytes(disk.totalBytes - disk.availableBytes)} / {formatBytes(disk.totalBytes)}
                      </span>
                    </div>
                    <div className="relative h-1.5 bg-bar-bg rounded-sm overflow-hidden">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-sm transition-all duration-500 ${bgClass(diskKey)}`}
                        style={{ width: `${disk.usage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="absolute bottom-4 right-6 text-text-faint pointer-events-none select-none text-right">
        <p className="text-[10px] tracking-[0.2em] uppercase font-mono">Fluxlay System Monitor</p>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <SystemMonitor />
  </React.StrictMode>,
);
