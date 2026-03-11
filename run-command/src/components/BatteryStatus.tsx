import { runShell } from "@fluxlay/react";
import { useEffect, useState } from "react";

export const BatteryStatus = () => {
  const [battery, setBattery] = useState<string>("Loading...");
  const [error, setError] = useState<string | null>(null);

  const fetchBattery = async () => {
    try {
      const res = await runShell("pmset");
      setBattery(res.stdout.trim());
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    fetchBattery();
    const interval = setInterval(fetchBattery, 10000); // 1分ごとに更新
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="flex flex-col bg-white p-6 rounded-xl border border-zinc-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col">
          <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Environment</h2>
          <span className="text-xs font-bold text-zinc-800">Battery Status</span>
        </div>
        <div className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      <div className="flex items-end justify-between">
        <div className="text-xl font-black text-zinc-900 tracking-tighter">
          {error ? <span className="text-red-600 text-xs">{error}</span> : battery}
        </div>
        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </section>
  );
};
