/**
 * Echelon Analytics — MCP Server (API-backed, read-only)
 *
 * Exposes read-only analytics query tools via Model Context Protocol (stdio).
 * Queries the Echelon Analytics REST API — works with any instance.
 *
 * READ-ONLY: This server only calls GET endpoints. It never sends POST, PATCH,
 * or DELETE requests — it cannot create, modify, or delete any data, even if
 * the token has write access.
 *
 * Required env:
 *   ECHELON_URL    — Base URL of the Echelon instance (e.g. https://ea.islets.app)
 *
 * Optional env:
 *   ECHELON_SECRET — Bearer token for read-only API access
 *
 * Usage:
 *   ECHELON_URL=https://ea.islets.app deno task mcp
 *   ECHELON_URL=http://localhost:1947 ECHELON_SECRET=my-token deno task mcp
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// All logging goes to stderr — stdout is reserved for MCP JSON-RPC
const log = (...args: unknown[]) => console.error("[echelon-mcp]", ...args);

// --- Configuration ----------------------------------------------------------

const baseUrl: string = Deno.env.get("ECHELON_URL") ?? "";
if (!baseUrl) {
  log("ECHELON_URL is required. Example: ECHELON_URL=https://ea.islets.app");
  Deno.exit(1);
}

const secret = Deno.env.get("ECHELON_SECRET");

log(`API endpoint: ${baseUrl}`);
if (secret) log("Using bearer token for read-only access");

// --- API client (GET only) --------------------------------------------------

async function api(path: string): Promise<unknown> {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  if (secret) {
    headers["Authorization"] = `Bearer ${secret}`;
  }

  const resp = await fetch(url, { headers });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`API ${resp.status}: ${body}`);
  }

  return resp.json();
}

// --- MCP Server -------------------------------------------------------------

const server = new McpServer({
  name: "echelon-analytics",
  version: "1.0.0",
});

// 1. analytics_overview — site overview stats
server.tool(
  "analytics_overview",
  "Overview stats for a site: visits, unique visitors, top paths, devices, OS breakdown, countries, referrers, screen resolutions, and daily trend.",
  {
    site_id: z.string().describe("Site identifier (e.g. 'my-site')"),
    days: z.number().int().min(1).max(730).default(30).describe(
      "Lookback period in days (default: 30)",
    ),
  },
  async ({ site_id, days }) => {
    const result = await api(
      `/api/stats/overview?site_id=${encodeURIComponent(site_id)}&days=${days}`,
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// 2. analytics_realtime — active visitors in last 5 minutes
server.tool(
  "analytics_realtime",
  "Realtime stats: active visitors and top pages in the last 5 minutes.",
  {
    site_id: z.string().describe("Site identifier"),
  },
  async ({ site_id }) => {
    const result = await api(
      `/api/stats/realtime?site_id=${encodeURIComponent(site_id)}`,
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// 3. analytics_campaigns — campaign list with view/visitor counts
server.tool(
  "analytics_campaigns",
  "UTM campaign stats: views and visitors grouped by campaign.",
  {
    days: z.number().int().min(1).max(90).default(30).describe(
      "Lookback period in days (default: 30, max: 90)",
    ),
    campaign_id: z.string().optional().describe(
      "Filter to a single campaign by ID",
    ),
  },
  async ({ days, campaign_id }) => {
    let path = `/api/stats/campaigns?days=${days}`;
    if (campaign_id) path += `&id=${encodeURIComponent(campaign_id)}`;
    const result = await api(path);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// 4. analytics_campaign_detail — breakdown by source, medium, content, term
server.tool(
  "analytics_campaign_detail",
  "Detailed campaign breakdown: sources, mediums, content, terms, daily trend, and top landing pages.",
  {
    campaign_id: z.string().describe("Campaign ID"),
    days: z.number().int().min(1).max(90).default(30).describe(
      "Lookback period in days (default: 30, max: 90)",
    ),
  },
  async ({ campaign_id, days }) => {
    const result = await api(
      `/api/stats/campaigns?id=${encodeURIComponent(campaign_id)}&days=${days}`,
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// 5. analytics_experiments — A/B experiment results
server.tool(
  "analytics_experiments",
  "A/B experiment results with conversion rates and statistical significance.",
  {
    experiment_id: z.string().optional().describe(
      "Filter to a single experiment by ID",
    ),
  },
  async ({ experiment_id }) => {
    let path = `/api/stats/experiments`;
    if (experiment_id) {
      path += `?experiment_id=${encodeURIComponent(experiment_id)}`;
    }
    const result = await api(path);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// 6. analytics_dashboard — live dashboard snapshot
server.tool(
  "analytics_dashboard",
  "Live dashboard: active visitors, hourly/daily trends, recent visitors, and recent events.",
  {
    site_id: z.string().describe("Site identifier"),
  },
  async ({ site_id }) => {
    const result = await api(
      `/api/stats/dashboard?site_id=${encodeURIComponent(site_id)}`,
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// 7. analytics_campaign_events — campaign-to-event correlation
server.tool(
  "analytics_campaign_events",
  "Campaign-to-event correlation: for each campaign (and organic traffic), shows visitors, event-triggering visitors, event counts, event rate, and events per visitor. Use to measure whether campaign visitors adopt features or convert. Rows with utm_campaign=null represent organic (non-campaign) traffic as a baseline.",
  {
    site_id: z.string().describe("Site identifier (e.g. 'my-site')"),
    days: z.number().int().min(1).max(90).default(30).describe(
      "Lookback period in days (default: 30, max: 90)",
    ),
    event_type: z.string().optional().describe(
      "Filter to a specific event type (e.g. 'purchase', 'feature_used', 'signup')",
    ),
  },
  async ({ site_id, days, event_type }) => {
    let path = `/api/stats/campaign-events?site_id=${
      encodeURIComponent(site_id)
    }&days=${days}`;
    if (event_type) path += `&event_type=${encodeURIComponent(event_type)}`;
    const result = await api(path);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// 8. list_campaigns — campaign metadata
server.tool(
  "list_campaigns",
  "List all registered UTM campaigns with their IDs, names, utm_campaign values, site IDs, and statuses.",
  {},
  async () => {
    const result = await api(`/api/campaigns`);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// 9. list_experiments — experiment metadata
server.tool(
  "list_experiments",
  "List all A/B experiments with their IDs, names, statuses, metric event types, and variant definitions.",
  {},
  async () => {
    const result = await api(`/api/experiments`);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// --- Start ------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
log("MCP server running on stdio");
