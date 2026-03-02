// Echelon Analytics — Telemetry opt-in resolution
//
// Resolves effective telemetry state: env override > DB setting > undecided.
// Caches the DB lookup for 60 seconds to avoid per-request queries.

import type { DbAdapter } from "./db/adapter.ts";
import { TELEMETRY_OVERRIDE } from "./config.ts";

export type TelemetryState = "on" | "off" | "undecided";

let cached: { state: TelemetryState; ts: number } | null = null;
const CACHE_TTL_MS = 60_000;

/** Resolve the effective telemetry state (env > DB > undecided). */
export async function getTelemetryState(
  db: DbAdapter,
): Promise<TelemetryState> {
  // Env override always wins
  if (TELEMETRY_OVERRIDE !== null) return TELEMETRY_OVERRIDE;

  // Return cached value if fresh
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.state;

  const row = await db.queryOne<{ value: string }>(
    `SELECT value FROM instance_settings WHERE key = ?`,
    "telemetry_optin",
  );

  let state: TelemetryState = "undecided";
  if (row?.value === "true") state = "on";
  else if (row?.value === "false") state = "off";

  cached = { state, ts: Date.now() };
  return state;
}

/** Persist the admin's telemetry choice. */
export async function setTelemetryChoice(
  db: DbAdapter,
  optin: boolean,
): Promise<void> {
  await db.run(
    `INSERT INTO instance_settings (key, value, updated_at)
     VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    "telemetry_optin",
    optin ? "true" : "false",
  );
  markTelemetryStale();
}

/** Invalidate the cached state so the next request re-reads from DB. */
export function markTelemetryStale(): void {
  cached = null;
}
