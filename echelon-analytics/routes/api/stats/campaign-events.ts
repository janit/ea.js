import { define } from "../../../utils.ts";
import { getCampaignEvents } from "../../../lib/stats.ts";
import { validateSiteIdStrict } from "../../../lib/config.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const db = ctx.state.db;
    const url = new URL(ctx.req.url);
    const rawSiteId = url.searchParams.get("site_id");
    const siteId = rawSiteId ? validateSiteIdStrict(rawSiteId) : null;
    if (!siteId) {
      return Response.json(
        { error: "missing_param", message: "site_id required" },
        { status: 400 },
      );
    }
    const days = Math.min(
      90,
      Math.max(1, parseInt(url.searchParams.get("days") ?? "30") || 30),
    );
    const eventType = url.searchParams.get("event_type") ?? undefined;

    const stats = await getCampaignEvents(db, siteId, days, eventType);
    return Response.json(stats);
  },
});
