import { TerminalThemes, useShell, useTerminal } from "@fluxlay/react";

export const SystemMonitor = () => {
  // 1. ターミナルを初期化
  const { terminalRef, instance } = useTerminal({
    fontSize: 12,
    theme: TerminalThemes.light.default,
  });

  // 2. シェル実行を管理（ターミナルインスタンスを渡す）
  const { error } = useShell("macchina", {
    terminal: instance,
    refreshInterval: 60000,
  });

  return (
    <section className="flex flex-col bg-white h-full rounded-xl border border-zinc-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-zinc-100">
        <div className="flex flex-col">
          <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Hardware Monitor</h2>
          <span className="text-xs font-bold text-zinc-800">macchina -v0.1.0</span>
        </div>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
        </div>
      </div>

      <div className="p-6 bg-[#fdfdfd]">
        {error && !instance ? (
          <div className="text-red-600 text-xs p-4 bg-red-50 border border-red-100 rounded-lg">{error}</div>
        ) : (
          <div ref={terminalRef} className="w-full" />
        )}
      </div>
    </section>
  );
};
