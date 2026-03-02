import { define } from "../utils.ts";
import { PUBLIC_MODE } from "../lib/config.ts";

export const handler = define.handlers({
  GET(ctx) {
    if (!PUBLIC_MODE) {
      return new Response("Not Found", { status: 404 });
    }

    const origin = new URL(ctx.req.url).origin;

    const content = `# Echelon Analytics — Public Dashboard

> Live public instance of Echelon Analytics, a privacy-first, cookieless web analytics platform.

## What This Is

This is a public, read-only analytics dashboard powered by Echelon Analytics (ea.js).
All displayed data is anonymized — no PII, no cookies, no cross-site tracking.
Visitor IDs are daily-rotating HMAC hashes. Country data is fictional for anonymized sites.

## Pages

- ${origin}/admin — Dashboard overview: KPIs, daily trends, top pages, devices, countries, referrers
- ${origin}/admin/realtime — Live visitor activity (auto-refreshing)
- ${origin}/admin/visitors — Paginated visitor views with filtering and sorting
- ${origin}/admin/events — Semantic events (clicks, scrolls, form submissions, etc.)
- ${origin}/admin/bots — Bot detection: suspicious visitors scored 0–100
- ${origin}/admin/bots/excluded — Manually excluded visitors
- ${origin}/admin/experiments — A/B experiment management and conversion tracking
- ${origin}/admin/campaigns — UTM campaign tracking with source/medium/content breakdowns
- ${origin}/admin/perf — Performance metrics and CI/CD benchmark trends
- ${origin}/admin/settings — Site settings and telemetry configuration

## Data Policy

- No cookies by default (cookieless mode)
- Visitor identity = HMAC(IP + UA + site + date), rotated daily
- Anonymized sites use fictional country codes and hashed visitor IDs
- Bot traffic is filtered via PoW challenges, heuristic scoring, and UA blocklists
- Data retained for 90 days (configurable), then purged

## Links

- Documentation: https://ea.js.org/
- Source code: https://github.com/janit/ea
- Telemetry policy: https://ea.js.org/telemetry.html
- Installation guide: https://ea.js.org/installation.html
- LLM reference (full): https://ea.js.org/llms-full.txt
`;

    return new Response(content, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
});
