import ICAL from "ical.js";
import { useEffect, useState } from "react";

import { proxiedFetch } from "@fluxlay/react";

import { formatDateKey, formatTime } from "../lib/format";
import type { Loadable } from "../lib/loadable";
import { ErrorBlock, Hint, Panel } from "./Panel";

type CalendarEvent = {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location: string | null;
};

/**
 * Parse an ICS feed and return events that overlap [from, to]. Recurring
 * events are expanded via ical.js's iterator so RRULE / EXDATE are honoured.
 */
function parseIcsEvents(icsText: string, from: Date, to: Date): CalendarEvent[] {
  const jcal = ICAL.parse(icsText);
  const root = new ICAL.Component(jcal);
  const vevents = root.getAllSubcomponents("vevent");
  const out: CalendarEvent[] = [];

  for (const v of vevents) {
    const event = new ICAL.Event(v);
    const baseId = event.uid ?? Math.random().toString(36);

    if (event.isRecurring()) {
      const it = event.iterator();
      let occ: ICAL.Time | null;
      let safety = 0;
      while ((occ = it.next()) && safety++ < 200) {
        const startDate = occ.toJSDate();
        if (startDate > to) break;
        const details = event.getOccurrenceDetails(occ);
        const endDate = details.endDate.toJSDate();
        if (endDate < from) continue;
        out.push({
          id: `${baseId}@${startDate.toISOString()}`,
          summary: event.summary || "(no title)",
          start: startDate,
          end: endDate,
          allDay: event.startDate.isDate,
          location: event.location || null
        });
      }
    } else {
      const startDate = event.startDate.toJSDate();
      const endDate = event.endDate.toJSDate();
      if (startDate <= to && endDate >= from) {
        out.push({
          id: baseId,
          summary: event.summary || "(no title)",
          start: startDate,
          end: endDate,
          allDay: event.startDate.isDate,
          location: event.location || null
        });
      }
    }
  }

  out.sort((a, b) => a.start.getTime() - b.start.getTime());
  return out;
}

// Google Calendar's ICS endpoint does not return Access-Control-Allow-Origin,
// so plain `fetch` from the wallpaper origin is rejected by CORS even when
// the host is declared in `network:`. `proxiedFetch` issues the request from
// the Fluxlay host process where CORS does not apply.
export function useCalendarEvents(icsUrl: string, refreshMs: number): Loadable<CalendarEvent[]> {
  const [state, setState] = useState<Loadable<CalendarEvent[]>>({ status: "idle" });

  useEffect(() => {
    if (!icsUrl) {
      setState({ status: "idle" });
      return;
    }
    const controller = new AbortController();

    const fetchOnce = async () => {
      setState(prev => (prev.status === "ok" ? prev : { status: "loading" }));
      try {
        const res = await proxiedFetch(icsUrl, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`ICS ${res.status}`);
        }
        const text = await res.text();
        const from = new Date();
        from.setHours(0, 0, 0, 0);
        const to = new Date(from);
        to.setDate(to.getDate() + 2);
        const events = parseIcsEvents(text, from, to);
        setState({ status: "ok", data: events, fetchedAt: Date.now() });
      } catch (e) {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: String(e) });
      }
    };

    void fetchOnce();
    const id = setInterval(fetchOnce, refreshMs);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [icsUrl, refreshMs]);

  return state;
}

interface CalendarPanelProps {
  state: Loadable<CalendarEvent[]>;
  configured: boolean;
  now: Date;
}

export function CalendarPanel({ state, configured, now }: CalendarPanelProps) {
  return (
    <Panel
      header={
        <>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            <h2 className="text-[11px] uppercase tracking-widest text-violet-400">Today&apos;s Calendar</h2>
          </div>
          <span className="text-[10px] text-zinc-600">next 48h</span>
        </>
      }
    >
      {!configured ? (
        <Hint text="Google Calendar の ICS URL を設定してください" />
      ) : state.status === "idle" || state.status === "loading" ? (
        <Hint text="読み込み中..." />
      ) : state.status === "error" ? (
        <ErrorBlock message={state.message} />
      ) : (
        <CalendarList events={state.data} now={now} />
      )}
    </Panel>
  );
}

function CalendarList({ events, now }: { events: CalendarEvent[]; now: Date }) {
  if (events.length === 0) {
    return <Hint text="今日と明日の予定はありません" />;
  }

  const todayKey = formatDateKey(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = formatDateKey(tomorrow);

  const grouped = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const k = formatDateKey(ev.start);
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)?.push(ev);
  }

  return (
    <div className="flex flex-col gap-3 px-3 py-2">
      {Array.from(grouped.entries()).map(([k, evs]) => (
        <div key={k}>
          <div className="px-2 pb-1 text-[10px] uppercase tracking-widest text-zinc-500">
            {k === todayKey ? "Today" : k === tomorrowKey ? "Tomorrow" : k}
          </div>
          <ul className="flex flex-col gap-0.5">
            {evs.map(ev => (
              <CalendarItem key={ev.id} event={ev} now={now} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function CalendarItem({ event, now }: { event: CalendarEvent; now: Date }) {
  const isPast = event.end.getTime() < now.getTime();
  const isOngoing = event.start.getTime() <= now.getTime() && event.end.getTime() > now.getTime();
  const timeLabel = event.allDay ? "all day" : `${formatTime(event.start)}–${formatTime(event.end)}`;

  return (
    <li
      className={`flex items-baseline gap-3 rounded-md px-2 py-1.5 ${
        isOngoing ? "bg-violet-950/40" : ""
      } ${isPast ? "opacity-40" : ""}`}
    >
      <span className={`shrink-0 text-[10px] tabular-nums ${isOngoing ? "text-violet-300" : "text-zinc-500"}`}>
        {timeLabel}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs text-zinc-100">{event.summary}</span>
      {event.location && (
        <span className="shrink-0 truncate text-[10px] text-zinc-600 max-w-[40%]">{event.location}</span>
      )}
    </li>
  );
}
