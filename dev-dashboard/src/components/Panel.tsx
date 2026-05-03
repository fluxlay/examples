import type { ReactNode } from "react";

// Common chrome shared by every panel: bordered card with a header bar and a
// scrollable body. The grid in `App.tsx` is 2x2, so the last-child border
// rules drop redundant outer edges.
export function Panel({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <section className="flex h-full flex-col border-r border-b border-zinc-800 last:border-r-0 [&:nth-last-child(-n+2)]:border-b-0 odd:[&:nth-last-child(-n+2)]:border-b-0">
      <div className="flex items-center justify-between border-b border-zinc-800/60 px-6 py-3">
        {header}
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}

export function Hint({ text }: { text: string }) {
  return <div className="px-3 py-6 text-center text-xs text-zinc-600">{text}</div>;
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="m-3 rounded-md border border-rose-900/60 bg-rose-950/40 px-3 py-2 text-[11px] text-rose-300">
      <div className="font-bold">取得に失敗しました</div>
      <div className="mt-1 break-words text-rose-400/80">{message}</div>
    </div>
  );
}
