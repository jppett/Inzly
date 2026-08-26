/**
 * Where the browser sends API requests.
 *
 * Resolution order:
 *   1. `VITE_API_BASE_URL` — an explicit URL, wins over everything.
 *   2. `VITE_API_TARGET`   — one of the named targets below.
 *   3. the default target.
 *
 * Note that `local` and `platform` are the same URL from the browser's point of
 * view: both go to this app's own Express server. Which one *it* reads from is
 * a server-side decision made by `INZLY_DATA_SOURCE` (see server/storage.ts).
 * The distinction is kept here so the intent is greppable from either side.
 */
export const API_TARGETS = {
  /** This app's Express server, backed by its own Postgres tables. */
  local: "/api",
  /** This app's Express server, proxying the event-driven platform. */
  platform: "/api",
  /** Standalone mock backend — no local database or services required. */
  mock: "https://bones-report-mock-backend.norsebru-e7d.workers.dev/api",
} as const;

export type ApiTarget = keyof typeof API_TARGETS;

const DEFAULT_TARGET: ApiTarget = "mock";

function resolveTarget(): ApiTarget {
  const configured = import.meta.env.VITE_API_TARGET;
  if (configured && configured in API_TARGETS) {
    return configured as ApiTarget;
  }
  return DEFAULT_TARGET;
}

export const API_TARGET: ApiTarget = resolveTarget();

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || API_TARGETS[API_TARGET];
