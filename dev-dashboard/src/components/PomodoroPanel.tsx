import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { notify } from "@fluxlay/react";

import { formatMmSs } from "../lib/format";
import { Panel } from "./Panel";

type PomodoroPhase = "work" | "break";

interface PomodoroPanelProps {
  workMinutes: number;
  breakMinutes: number;
}

export function PomodoroPanel({ workMinutes, breakMinutes }: PomodoroPanelProps) {
  const [phase, setPhase] = useState<PomodoroPhase>("work");
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(workMinutes * 60);
  const [completed, setCompleted] = useState(0);

  // Reset countdown if user changes durations from properties while paused.
  const targetSeconds = phase === "work" ? workMinutes * 60 : breakMinutes * 60;
  const lastTargetRef = useRef(targetSeconds);
  useEffect(() => {
    if (lastTargetRef.current !== targetSeconds && !running) {
      setSecondsLeft(targetSeconds);
    }
    lastTargetRef.current = targetSeconds;
  }, [targetSeconds, running]);

  const advancePhase = useCallback(() => {
    setPhase(prev => {
      const next: PomodoroPhase = prev === "work" ? "break" : "work";
      setSecondsLeft(next === "work" ? workMinutes * 60 : breakMinutes * 60);
      if (prev === "work") setCompleted(c => c + 1);
      void notify(
        prev === "work"
          ? { title: "作業セッション完了", body: `${breakMinutes} 分の休憩をどうぞ` }
          : { title: "休憩終了", body: `次の ${workMinutes} 分の作業を始めましょう` }
      );
      return next;
    });
  }, [workMinutes, breakMinutes]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          // Defer phase change to next tick to avoid setState-in-setState.
          queueMicrotask(advancePhase);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, advancePhase]);

  const reset = useCallback(() => {
    setRunning(false);
    setPhase("work");
    setSecondsLeft(workMinutes * 60);
    setCompleted(0);
  }, [workMinutes]);

  const total = phase === "work" ? workMinutes * 60 : breakMinutes * 60;
  const progress = total > 0 ? 1 - secondsLeft / total : 0;
  const accent = phase === "work" ? "text-rose-400" : "text-emerald-400";
  const ring = phase === "work" ? "stroke-rose-400" : "stroke-emerald-400";
  const dot = phase === "work" ? "bg-rose-400" : "bg-emerald-400";

  return (
    <Panel
      header={
        <>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${dot}`} />
            <h2 className={`text-[11px] uppercase tracking-widest ${accent}`}>
              Pomodoro · {phase === "work" ? "Work" : "Break"}
            </h2>
          </div>
          <span className="text-[10px] text-zinc-500 tabular-nums">{completed} done</span>
        </>
      }
    >
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-4">
        <ProgressRing progress={progress} ringClass={ring}>
          <div className={`text-4xl font-bold tabular-nums ${accent}`}>{formatMmSs(secondsLeft)}</div>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-zinc-500">
            {phase === "work" ? `${workMinutes}m focus` : `${breakMinutes}m break`}
          </div>
        </ProgressRing>

        <div className="flex items-center gap-2">
          <TimerButton onClick={() => setRunning(r => !r)} label={running ? "Pause" : "Start"} primary />
          <TimerButton onClick={advancePhase} label="Skip" />
          <TimerButton onClick={reset} label="Reset" />
        </div>
      </div>
    </Panel>
  );
}

function ProgressRing({
  progress,
  ringClass,
  children
}: {
  progress: number;
  ringClass: string;
  children: ReactNode;
}) {
  const size = 160;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-zinc-800" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${ringClass} transition-[stroke-dashoffset] duration-500`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

function TimerButton({ onClick, label, primary }: { onClick: () => void; label: string; primary?: boolean }) {
  const base = "rounded-md px-3 py-1 text-xs font-medium transition-colors";
  const cls = primary
    ? `${base} bg-zinc-100 text-zinc-900 hover:bg-white`
    : `${base} border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200`;
  return (
    <button type="button" onClick={onClick} className={cls}>
      {label}
    </button>
  );
}
