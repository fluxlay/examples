import { runShell } from "@fluxlay/react";
import { useEffect, useState } from "react";

export const NetworkStatus = () => {
  const [ip, setIp] = useState<string>("Loading...");
  const [error, setError] = useState<string | null>(null);

  const fetchIp = async () => {
    try {
      const res = await runShell("fetch-ip");
      setIp(res.stdout);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    fetchIp();
    const interval = setInterval(fetchIp, 300000); // 5分ごとに更新
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="flex flex-col bg-white p-6 rounded-xl border border-zinc-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col">
          <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Connectivity</h2>
          <span className="text-xs font-bold text-zinc-800">IP Gateway</span>
        </div>
        <div className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
      </div>

      <div className="flex flex-col">
        <div className="text-xl font-black text-zinc-900 tracking-tight break-all">
          {error ? <span className="text-red-600 text-xs">{error}</span> : ip}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded font-bold uppercase">HTTP/S</span>
          <span className="text-[10px] px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded font-bold uppercase">v4/v6</span>
        </div>
      </div>
    </section>
  );
};
