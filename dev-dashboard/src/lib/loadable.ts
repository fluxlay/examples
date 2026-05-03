// Async fetch state for panels backed by network calls.
export type Loadable<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: T; fetchedAt: number }
  | { status: "error"; message: string };
