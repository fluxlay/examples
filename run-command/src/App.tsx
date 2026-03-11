import { BatteryStatus } from "./components/BatteryStatus.tsx";
import { NetworkStatus } from "./components/NetworkStatus.tsx";
import { SystemMonitor } from "./components/SystemMonitor.tsx";

export const App = () => {
  return (
    <main className="relative flex flex-col p-8 md:p-12 h-full w-full bg-[#fafafa] text-zinc-900 font-mono overflow-auto">
      {/* Background decoration */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "20px 20px" }}
      />

      {/* Header section */}
      <header className="relative mb-12 flex flex-col items-start">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-zinc-900" />
          <h1 className="text-3xl font-black text-zinc-900 tracking-tighter uppercase">Fluxlay Command Center</h1>
        </div>
        <p className="text-[10px] text-zinc-400 mt-3 uppercase tracking-[0.2em] font-bold border-b border-zinc-200 pb-1">
          System Intelligence & Integration SDK • v0.1.0
        </p>
      </header>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <SystemMonitor />
        </div>
        <div className="flex flex-col gap-8">
          <BatteryStatus />
          <NetworkStatus />
        </div>
      </div>

      {/* Footer / Status bar info */}
      <footer className="mt-auto pt-10 text-[10px] text-zinc-400 flex gap-4 uppercase tracking-tighter">
        <span>Fluxlay SDK v0.1.0</span>
        <span>•</span>
        <span>Interactive Wallpaper Component</span>
      </footer>
    </main>
  );
};
