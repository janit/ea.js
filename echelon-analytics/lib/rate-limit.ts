// Echelon Analytics — IP-based Rate Limiter
//
// In-memory sliding window per IP. Drops requests that exceed the limit.

import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from "./config.ts";
import { getClientIp } from "./ip.ts";

interface RateEntry {
  count: number;
  windowStart: number;
}

const MAX_MAP_SIZE = 200_000;
const rateMap = new Map<string, RateEntry>();
let lastPrune = Date.now();

/** Prune expired entries to prevent memory leak. */
function pruneRateMap(): void {
  const now = Date.now();
  lastPrune = now;
  for (const [key, entry] of rateMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateMap.delete(key);
    }
  }
}

/**
 * Check if a request should be rate-limited.
 * Returns true if the request should be DROPPED.
 */
export function isRateLimited(req: Request): boolean {
  if (RATE_LIMIT_MAX <= 0) return false;

  const ip = getClientIp(req);

  const now = Date.now();

  // Periodic cleanup: every 2 minutes or when map is too large
  if (rateMap.size > MAX_MAP_SIZE || now - lastPrune > 120_000) {
    pruneRateMap();
  }

  const entry = rateMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateMap.set(ip, { count: 1, windowStart: now });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}
