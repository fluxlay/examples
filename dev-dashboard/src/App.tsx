import { useEffect, useMemo, useState } from "react";

import { useProperties } from "@fluxlay/react";

import { CalendarPanel, useCalendarEvents } from "./components/CalendarPanel";
import { PomodoroPanel } from "./components/PomodoroPanel";
import { PrColumn, useGithubPrs } from "./components/PrColumn";

interface DashboardProperties {
  [key: string]: number | string | boolean | string[] | null;
  githubToken: string;
  githubUsername: string;
  googleCalendarIcsUrl: string;
  pomodoroWorkMinutes: number;
  pomodoroBreakMinutes: number;
  refreshSeconds: number;
}

export function App() {
  const props = useProperties<DashboardProperties>();
  const token = (props.githubToken ?? "").trim();
  const username = (props.githubUsername ?? "").trim();
  const icsUrl = (props.googleCalendarIcsUrl ?? "").trim();
  const workMinutes = Math.max(1, props.pomodoroWorkMinutes ?? 25);
  const breakMinutes = Math.max(1, props.pomodoroBreakMinutes ?? 5);
  const refreshMs = Math.max(30, props.refreshSeconds ?? 120) * 1000;

  const myPrs = useGithubPrs(token, username, "author", refreshMs);
  const reviewPrs = useGithubPrs(token, username, "review", refreshMs);
  const events = useCalendarEvents(icsUrl, refreshMs);

  const now = useTickingNow();
  const timeStr = useMemo(
    () => now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    [now]
  );
  const dateStr = useMemo(
    () =>
      now.toLocaleDateString([], {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short"
      }),
    [now]
  );

  return (
    <main className="flex h-screen w-screen flex-col bg-zinc-950 pt-8 font-mono text-zinc-100">
      <header className="flex items-baseline justify-between border-b border-zinc-800 px-8 py-4">
        <div className="flex items-baseline gap-4">
          <h1 className="text-sm uppercase tracking-[0.3em] text-zinc-500">Dev Dashboard</h1>
          {username && <span className="text-xs text-zinc-600">@{username}</span>}
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-xs text-zinc-500">{dateStr}</span>
          <span className="text-2xl font-bold tabular-nums text-zinc-200">{timeStr}</span>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-2 grid-rows-2 overflow-hidden">
        <PrColumn
          title="My Open PRs"
          accent="text-emerald-400"
          accentBar="bg-emerald-400"
          state={myPrs}
          emptyMessage="開いている PR はありません"
          missingConfig={!token || !username}
          missingHint="GitHub Token と Username を設定してください"
        />
        <PrColumn
          title="Review Requested"
          accent="text-sky-400"
          accentBar="bg-sky-400"
          state={reviewPrs}
          emptyMessage="レビュー待ちの PR はありません"
          missingConfig={!token || !username}
          missingHint="GitHub Token と Username を設定してください"
        />
        <CalendarPanel state={events} configured={!!icsUrl} now={now} />
        <PomodoroPanel workMinutes={workMinutes} breakMinutes={breakMinutes} />
      </div>
    </main>
  );
}

// Re-renders every second so the header clock and any time-dependent panel
// state (calendar "ongoing" highlight, PR "X minutes ago" labels) refresh.
function useTickingNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
