# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

Echelon Analytics (`ea.js`) — a privacy-first, self-hosted, cookieless web
analytics platform. Single SQLite database, single script tag embed, AGPL-3.0
licensed. The application code lives in `echelon-analytics/`.

## Commands

All commands run from `echelon-analytics/`:

```bash
cd echelon-analytics

# Development server (Vite HMR)
deno task dev

# Production build
deno task build

# Start production server (must build first)
deno task start

# Check formatting, lint, type-check, and run tests
deno task check

# Run server-side tests (unit + integration)
deno task test

# Run browser E2E tests (requires Chromium)
deno task test:e2e

# Individual checks
deno fmt --check .
deno lint .
deno check main.ts

# Update Fresh framework
deno task update
```

### Testing

Tests live in `tests/` with shared helpers in `tests/_helpers.ts`. E2E browser
tests (using `@astral/astral`) are in `tests/e2e/` and require Chromium.
`auth/`, `data/`, `tracker/`, `tracking/`). The `check` task includes
server-side tests, and `scripts/tag-release.sh` runs `deno task check` before
tagging — so tests gate every release.

## Architecture

### Runtime & Framework

Deno + Fresh 2.2.0 (file-system routing with Preact islands). Vite 7 for builds.
Tailwind CSS v4 configured via `@tailwindcss/vite` plugin (config lives in
`assets/styles.css`, not a tailwind config file). Dark terminal aesthetic:
Norway-inspired professional palette (navy/white/red), Inter sans-serif font.
Alternative themes available: Commodore 64 (`c64`), Bad Boys (`badboys`).

### Request Flow

Browser loads `/ea.js` which embeds a dynamically-generated WASM proof-of-work
challenge. After solving, the tracker sends pageviews to `/b.gif` (pixel beacon)
and behavioral events to `POST /e` (sendBeacon). Both endpoints score requests
for bot likelihood (0–100), then push records into in-memory `BufferedWriter`
instances that batch-flush to SQLite every 10–15 seconds.

### Key Directories (`echelon-analytics/`)

- **`routes/`** — File-system routing. Public tracking endpoints (`ea.js.ts`,
  `b.gif.ts`, `e.ts`) at root. Admin UI under `admin/`. REST API under `api/`.
- **`lib/`** — All backend logic: bot scoring (`bot-score.ts`), PoW challenge
  generation (`challenge.ts`, `challenge-wasm.ts`), buffered DB writes
  (`buffered-writer.ts`), auth (`auth.ts`, `session.ts`), stats queries
  (`stats.ts`), maintenance/rollups (`maintenance.ts`).
- **`lib/db/`** — SQLite layer: `database.ts` (singleton + migrations, error
  retry on init), `schema.ts` (DDL), `sqlite-adapter.ts` (concrete adapter
  using `node:sqlite`, serialized transactions via queue), `adapter.ts`
  (interface).
- **`islands/`** — Client-hydrated Preact components (charts, forms, realtime
  panel). Use `@preact/signals` for reactivity.
- **`components/`** — Server-only components (admin nav shell with live stats
  bar).

### Data Layer

Single SQLite database (WAL mode). No ORM — raw SQL queries throughout. Writes
are batched via `BufferedWriter` (generic class in `lib/buffered-writer.ts`).
Two writers: one for `visitor_views`, one for `semantic_events`. The `stop()`
method drains any remaining buffered records before shutdown. Daily rollup at
03:00 UTC aggregates raw views into `visitor_views_daily` (using INSERT OR
IGNORE to preserve existing rollup data) and purges old data (90-day default
retention).

### Authentication

Two modes (can coexist): Bearer token (`ECHELON_SECRET` env var) and
username/password (PBKDF2-SHA256, in-memory sessions with 24h TTL). Auth
middleware at `routes/admin/_middleware.ts` and `routes/api/_middleware.ts`.
CSRF protection on cookie-authenticated mutating requests (POST, PUT, PATCH,
DELETE) via Origin/Referer header validation against Host.

### Anti-Bot System

`lib/tracker.ts` generates the `/ea.js` script with an embedded WASM blob
(rotates every 6 hours) and per-minute PoW challenges. `lib/bot-score.ts` scores
every request using PoW result, timing, geo, headers, burst detection. Scores ≥
50 are excluded from rollups. Known bot UAs are dropped before scoring.

### API Validation

API endpoints use `validateSiteIdStrict()` which returns null for invalid site
IDs (tracking endpoints use the lenient `validateSiteId()` that falls back to
"default"). Experiments enforce a state machine: draft → active → paused/completed,
paused → active, completed → archived. Variant weights must be finite positive numbers. Error responses
follow `{ error: "code", message: "text" }` format.

### Single-Process Constraint

All state (sessions, rate limiter, burst maps, UTM cache, buffered writers) is
in-memory. Must run with a single Deno worker — do not use `--parallel` flag
with `deno serve`.

### Import Alias

`@/` maps to the `echelon-analytics/` root (configured in `deno.json`).

### MCP Server

A read-only MCP server (`mcp-server.ts`) exposes analytics data to AI agents via
stdio transport. It calls the Echelon REST API over HTTP — works with any
instance (local, remote, Docker, cloud). Requires `ECHELON_URL` env var; uses
`ECHELON_SECRET` as Bearer token for authenticated instances.

```bash
ECHELON_URL=https://ea.islets.app deno task mcp
```

Tools (9 total, all read-only): `analytics_overview`, `analytics_realtime`,
`analytics_campaigns`, `analytics_campaign_detail`, `analytics_experiments`,
`analytics_dashboard`, `analytics_campaign_events`, `list_campaigns`,
`list_experiments`. Auto-discovered by Claude Code via `.claude/settings.json`.
