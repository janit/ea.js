// Echelon Analytics — Async Bot Correlator
//
// Background process that detects coordinated bot activity by correlating
// ephemeral request signals across IPs. Runs periodically, keeps all
// state in memory (IP hashes, fingerprints, taint markers), and
// retroactively updates bot_score in the DB when clusters are found.
//
// Privacy: uses the same daily-rotating HMAC hashes as the rest of
// Echelon — no raw IPs stored. Ephemeral state is pruned every sweep.
//
// Detection strategy:
// 1. Each beacon request records a "request print" in memory: IP hash,
//    visitor_id, UA fingerprint (os, browser, version, screen, country),
//    and whether the IP is headless-tainted.
// 2. Every SWEEP_INTERVAL, the correlator groups prints by fingerprint
//    and site. Clusters with many distinct IP hashes sharing an identical
//    fingerprint are almost certainly bot farms (real users have varied
//    browser versions, OSes, screen sizes).
// 3. Confirmed clusters get their bot_score bumped in the DB, which
//    excludes them from rollups (score ≥ 50).

import type { DbAdapter } from "./db/adapter.ts";
import { recordConfirmedBotIp } from "./bot-score.ts";

// ── Configuration ───────────────────────────────────────────────────────────

const SWEEP_INTERVAL_MS = 2 * 60 * 1000; // Run every 2 minutes
const PRINT_TTL_MS = 20 * 60 * 1000; // Keep prints for 20 minutes
const MAX_PRINTS = 200_000; // Memory cap

// Cluster thresholds — distinct IP hashes sharing a fingerprint on one site.
// Set high enough to avoid false positives on common fingerprints
// (e.g. Chrome/Windows/1080p/US). Accept-Language in the fingerprint
// provides additional differentiation.
const CLUSTER_THRESHOLD = 6; // ≥ 6 distinct IPs = flag
const CLUSTER_THRESHOLD_TAINTED = 4; // ≥ 4 when any IP is confirmed bot
const LARGE_CLUSTER = 8; // ≥ 8 = high-confidence bot farm

// Score penalties applied retroactively
const PENALTY_NORMAL = 30; // Moderate cluster
const PENALTY_LARGE = 50; // Large cluster or headless-confirmed

// ── Ephemeral request print store ───────────────────────────────────────────

/** A fingerprint captures the browser/device identity — fields a bot farm can't easily vary. */
interface Fingerprint {
  osName: string; // e.g. "Linux", "Windows 10+"
  browserName: string; // e.g. "Chrome"
  browserVersion: string; // e.g. "139.0.0.0"
  screenWidth: number; // e.g. 1920
  screenHeight: number; // e.g. 1080
  countryCode: string; // e.g. "US"
  acceptLanguage: string; // e.g. "en-US,en;q=0.9" — differentiates real users
}

/** One recorded beacon request. */
interface RequestPrint {
  ipHash: string;
  visitorId: string;
  siteId: string;
  fingerprint: Fingerprint;
  headlessTainted: boolean; // IP was seen with HeadlessChrome or similar
  timestamp: number;
}

// All prints, keyed by a unique request ID (visitor_id + timestamp)
const prints: RequestPrint[] = [];

/** Compute a string key from a fingerprint for grouping. */
function fpKey(fp: Fingerprint): string {
  return `${fp.osName}|${fp.browserName}|${fp.browserVersion}|${fp.screenWidth}x${fp.screenHeight}|${fp.countryCode}|${fp.acceptLanguage}`;
}

/**
 * Record a beacon request for correlation.
 * Called from the beacon handler after computing bot score signals.
 */
export function recordPrint(print: RequestPrint): void {
  if (prints.length >= MAX_PRINTS) {
    // Emergency prune: drop oldest half
    prints.splice(0, prints.length >> 1);
  }
  prints.push(print);
}

// ── Sweep logic ─────────────────────────────────────────────────────────────

interface ClusterMatch {
  siteId: string;
  fpKeyStr: string;
  fingerprint: Fingerprint;
  ipHashes: Set<string>;
  visitorIds: Set<string>;
  hasTainted: boolean;
}

/** Run one correlation sweep. Finds clusters and updates the DB. */
async function sweep(db: DbAdapter): Promise<void> {
  const now = Date.now();

  // Prune expired prints
  let pruneIdx = 0;
  while (
    pruneIdx < prints.length && now - prints[pruneIdx].timestamp > PRINT_TTL_MS
  ) {
    pruneIdx++;
  }
  if (pruneIdx > 0) prints.splice(0, pruneIdx);

  if (prints.length === 0) return;

  // Group by (siteId, fingerprint)
  const groups = new Map<string, ClusterMatch>();

  for (const p of prints) {
    const fk = fpKey(p.fingerprint);
    const groupKey = `${p.siteId}||${fk}`;
    let group = groups.get(groupKey);
    if (!group) {
      group = {
        siteId: p.siteId,
        fpKeyStr: fk,
        fingerprint: p.fingerprint,
        ipHashes: new Set(),
        visitorIds: new Set(),
        hasTainted: false,
      };
      groups.set(groupKey, group);
    }
    group.ipHashes.add(p.ipHash);
    group.visitorIds.add(p.visitorId);
    if (p.headlessTainted) group.hasTainted = true;
  }

  // Find clusters that exceed the threshold
  const clusters: ClusterMatch[] = [];
  for (const group of groups.values()) {
    const threshold = group.hasTainted
      ? CLUSTER_THRESHOLD_TAINTED
      : CLUSTER_THRESHOLD;
    if (group.ipHashes.size >= threshold) {
      clusters.push(group);
    }
  }

  if (clusters.length === 0) return;

  // Feed confirmed bot IPs into the fast-path map so future requests
  // from the same IPs get penalised immediately (without waiting for
  // the next sweep cycle).
  for (const cluster of clusters) {
    for (const ipHash of cluster.ipHashes) {
      recordConfirmedBotIp(ipHash);
    }
  }

  // Apply penalties to the DB
  for (const cluster of clusters) {
    const penalty =
      (cluster.hasTainted || cluster.ipHashes.size >= LARGE_CLUSTER)
        ? PENALTY_LARGE
        : PENALTY_NORMAL;

    const visitorIds = [...cluster.visitorIds];
    const placeholders = visitorIds.map(() => "?").join(",");
    const detail = JSON.stringify({
      reason: "correlated",
      penalty,
      cluster_size: cluster.ipHashes.size,
      tainted: cluster.hasTainted,
      fingerprint: cluster.fpKeyStr,
    });

    // Update visitor_views: bump score, append correlated detail.
    // Only update records not already correlated (idempotent).
    const viewResult = await db.run(
      `UPDATE visitor_views
       SET bot_score = MIN(bot_score + ?, 100),
           bot_score_detail = CASE
             WHEN bot_score_detail IS NULL THEN ?
             ELSE json_set(bot_score_detail, '$.correlated', json(?))
           END
       WHERE visitor_id IN (${placeholders})
         AND bot_score BETWEEN 0 AND 49
         AND (bot_score_detail IS NULL OR bot_score_detail NOT LIKE '%"correlated"%')`,
      penalty,
      `{"correlated":${detail}}`,
      detail,
      ...visitorIds,
    );

    // Same for semantic_events
    const eventResult = await db.run(
      `UPDATE semantic_events
       SET bot_score = MIN(bot_score + ?, 100),
           bot_score_detail = CASE
             WHEN bot_score_detail IS NULL THEN ?
             ELSE json_set(bot_score_detail, '$.correlated', json(?))
           END
       WHERE visitor_id IN (${placeholders})
         AND bot_score BETWEEN 0 AND 49
         AND (bot_score_detail IS NULL OR bot_score_detail NOT LIKE '%"correlated"%')`,
      penalty,
      `{"correlated":${detail}}`,
      detail,
      ...visitorIds,
    );

    const totalUpdated = viewResult.changes + eventResult.changes;
    if (totalUpdated > 0) {
      console.log(
        `[echelon] bot-correlator: flagged cluster on ${cluster.siteId} ` +
          `(${cluster.ipHashes.size} IPs, ${cluster.visitorIds.size} visitors, ` +
          `fp=${cluster.fingerprint.osName}/${cluster.fingerprint.browserName} ` +
          `${cluster.fingerprint.browserVersion}/${cluster.fingerprint.screenWidth}x` +
          `${cluster.fingerprint.screenHeight}/${cluster.fingerprint.countryCode}, ` +
          `tainted=${cluster.hasTainted}, penalty=+${penalty}, ` +
          `updated=${totalUpdated} records)`,
      );
    }
  }
}

// ── Lifecycle ───────────────────────────────────────────────────────────────

let sweepTimer: ReturnType<typeof setInterval> | null = null;

/** Start the background correlator. */
export function startBotCorrelator(db: DbAdapter): void {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    sweep(db).catch((e) =>
      console.error("[echelon] bot-correlator: sweep error", e)
    );
  }, SWEEP_INTERVAL_MS);
  console.log(
    `[echelon] bot-correlator: started (sweep every ${
      SWEEP_INTERVAL_MS / 1000
    }s, ` +
      `window ${PRINT_TTL_MS / 1000}s, cluster threshold ${CLUSTER_THRESHOLD})`,
  );
}

/** Stop the correlator and clear ephemeral state. */
export function stopBotCorrelator(): void {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
  prints.length = 0;
}

// ── Exported for testing ────────────────────────────────────────────────────
export { sweep as _sweep };
export type { Fingerprint, RequestPrint };
