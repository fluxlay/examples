import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import { MimoProvider } from "@fluxlay/react/mimo";

import "./index.css";

interface Task {
  id: string;
  title: string;
  done: boolean;
}

const STORAGE_KEY = "fluxlay.task-list.v1";

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is Task =>
        typeof t === "object" &&
        t !== null &&
        typeof t.id === "string" &&
        typeof t.title === "string" &&
        typeof t.done === "boolean"
    );
  } catch {
    return [];
  }
}

function TaskList() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [input, setInput] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const addTask = () => {
    const title = input.trim();
    if (!title) return;
    setTasks(prev => [...prev, { id: crypto.randomUUID(), title, done: false }]);
    setInput("");
  };

  const toggle = (id: string) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const remove = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const clearCompleted = () => {
    setTasks(prev => prev.filter(t => !t.done));
  };

  const remaining = tasks.filter(t => !t.done).length;

  return (
    <main className="w-full h-full flex items-start justify-end p-8 font-sans">
      <section className="w-[360px] max-h-full flex flex-col bg-zinc-900/85 border border-white/10 rounded-2xl shadow-2xl shadow-black/40 text-white overflow-hidden">
        <header className="px-5 py-4 border-b border-white/10">
          <h1 className="text-sm tracking-[0.3em] uppercase opacity-80">Tasks</h1>
          <p className="text-xs opacity-50 mt-0.5">
            {remaining} / {tasks.length} 残り
          </p>
        </header>

        <div className="px-5 py-3 border-b border-white/10 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTask();
              }
            }}
            placeholder="新しいタスク…"
            className="flex-1 bg-white/10 placeholder-white/40 text-sm rounded-md px-3 py-2 outline-none focus:bg-white/15 focus:ring-1 focus:ring-cyan-300/40 transition-colors duration-300"
          />
          <button
            type="button"
            onClick={addTask}
            className="text-xs px-3 py-2 rounded-md bg-cyan-300/20 hover:bg-cyan-300/30 active:bg-cyan-300/40 transition-colors"
          >
            追加
          </button>
        </div>

        <ul className="flex-1 overflow-auto px-2 py-2">
          {tasks.length === 0 && <li className="text-xs opacity-40 px-3 py-6 text-center">タスクはまだありません</li>}
          {tasks.map(task => (
            <li
              key={task.id}
              className="group flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/5 transition-colors duration-300"
            >
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggle(task.id)}
                className="size-4 accent-cyan-300 cursor-pointer"
              />
              <span
                className={`flex-1 text-sm break-all transition-opacity duration-300 ${task.done ? "line-through opacity-40" : "opacity-100"}`}
              >
                {task.title}
              </span>
              <button
                type="button"
                onClick={() => remove(task.id)}
                aria-label="削除"
                className="text-xs opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity duration-300"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        {tasks.some(t => t.done) && (
          <footer className="px-5 py-2 border-t border-white/10 flex justify-end">
            <button
              type="button"
              onClick={clearCompleted}
              className="text-[11px] opacity-60 hover:opacity-100 transition-opacity duration-300"
            >
              完了済みを削除
            </button>
          </footer>
        )}
      </section>
    </main>
  );
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root not found");

createRoot(rootEl).render(
  <StrictMode>
    <MimoProvider>
      <TaskList />
    </MimoProvider>
  </StrictMode>
);
