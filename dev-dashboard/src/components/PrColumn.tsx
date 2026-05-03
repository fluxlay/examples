import { useEffect, useState } from "react";

import { openUrl, proxiedFetch } from "@fluxlay/react";

import { formatRelative, repoNameFromUrl } from "../lib/format";
import type { Loadable } from "../lib/loadable";
import { ErrorBlock, Hint, Panel } from "./Panel";

type GitHubPr = {
  id: number;
  number: number;
  title: string;
  html_url: string;
  draft: boolean;
  created_at: string;
  updated_at: string;
  repository_url: string;
  user: { login: string; avatar_url: string };
};

type GitHubSearchResponse = {
  total_count: number;
  items: GitHubPr[];
};

// `proxiedFetch` is used because `api.github.com` does return CORS, but using
// the proxy uniformly keeps every external call going through the same path
// and gives us the auto User-Agent (GitHub rejects unauthenticated UA-less
// requests with 403). Plain `fetch` would also work here.
async function searchGithubPrs(token: string, query: string, signal: AbortSignal): Promise<GitHubPr[]> {
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=20&sort=updated&order=desc`;
  const res = await proxiedFetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    },
    signal
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as GitHubSearchResponse;
  return json.items;
}

export function useGithubPrs(
  token: string,
  username: string,
  kind: "author" | "review",
  refreshMs: number
): Loadable<GitHubPr[]> {
  const [state, setState] = useState<Loadable<GitHubPr[]>>({ status: "idle" });

  useEffect(() => {
    if (!token || !username) {
      setState({ status: "idle" });
      return;
    }
    const controller = new AbortController();
    const query =
      kind === "author"
        ? `is:open is:pr author:${username} archived:false`
        : `is:open is:pr review-requested:${username} archived:false -author:${username}`;

    const fetchOnce = async () => {
      setState(prev => (prev.status === "ok" ? prev : { status: "loading" }));
      try {
        const items = await searchGithubPrs(token, query, controller.signal);
        setState({ status: "ok", data: items, fetchedAt: Date.now() });
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
  }, [token, username, kind, refreshMs]);

  return state;
}

interface PrColumnProps {
  title: string;
  accent: string;
  accentBar: string;
  state: Loadable<GitHubPr[]>;
  emptyMessage: string;
  missingConfig: boolean;
  missingHint: string;
}

export function PrColumn({ title, accent, accentBar, state, emptyMessage, missingConfig, missingHint }: PrColumnProps) {
  return (
    <Panel
      header={
        <>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${accentBar}`} />
            <h2 className={`text-[11px] uppercase tracking-widest ${accent}`}>{title}</h2>
          </div>
          <Counter state={state} />
        </>
      }
    >
      {missingConfig ? (
        <Hint text={missingHint} />
      ) : state.status === "idle" || state.status === "loading" ? (
        <Hint text="読み込み中..." />
      ) : state.status === "error" ? (
        <ErrorBlock message={state.message} />
      ) : state.data.length === 0 ? (
        <Hint text={emptyMessage} />
      ) : (
        <ul className="flex flex-col gap-1 px-3 py-2">
          {state.data.map(pr => (
            <PrItem key={pr.id} pr={pr} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Counter({ state }: { state: Loadable<GitHubPr[]> }) {
  if (state.status !== "ok") return <span className="text-[10px] text-zinc-600">—</span>;
  return <span className="text-[10px] text-zinc-500 tabular-nums">{state.data.length} open</span>;
}

function PrItem({ pr }: { pr: GitHubPr }) {
  const repo = repoNameFromUrl(pr.repository_url);
  return (
    <li>
      <button
        type="button"
        onClick={() => {
          // Wallpaper webviews can't navigate the OS shell, so route to the
          // default browser via the host helper.
          void openUrl(pr.html_url);
        }}
        className="block w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-zinc-900/60 focus:bg-zinc-900/60 focus:outline-none"
      >
        <div className="flex items-start gap-3">
          <img
            src={pr.user.avatar_url}
            alt=""
            className="mt-0.5 h-6 w-6 shrink-0 rounded-full border border-zinc-800"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="truncate text-sm text-zinc-100">{pr.title}</span>
              {pr.draft && (
                <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-px text-[9px] uppercase tracking-wider text-zinc-400">
                  draft
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <span className="truncate">{repo}</span>
              <span className="text-zinc-700">·</span>
              <span>#{pr.number}</span>
              <span className="text-zinc-700">·</span>
              <span>{formatRelative(pr.updated_at)}</span>
            </div>
          </div>
        </div>
      </button>
    </li>
  );
}
