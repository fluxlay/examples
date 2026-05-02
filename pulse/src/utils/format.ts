/** byte/秒を KB/s か MB/s に自動切替してフォーマット (例: "1.2 MB/s") */
export function formatBytesPerSec(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "-- KB/s";
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} KB/s`;
  }
  return `${(n / (1024 * 1024)).toFixed(2)} MB/s`;
}

/** バイトを GB（GiB）表示にフォーマット (例: "19.0") */
export function formatGiB(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  const gib = bytes / (1024 * 1024 * 1024);
  return gib.toFixed(1);
}

/** Uptime 秒数を `7d 14:23` 等のロング表示。 */
export function formatUptimeLong(secs: number): string {
  if (!Number.isFinite(secs) || secs < 0) return "--";
  const total = Math.floor(secs);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}`;
  return `${pad(h)}:${pad(m)}`;
}

/** Date を HH:MM:SS にフォーマット。 */
export function formatTime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
