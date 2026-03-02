import { define } from "../../../utils.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const rows = await ctx.state.db.query(
      `SELECT ev.*,
        COALESCE(stats.pageviews, 0) AS pageviews,
        stats.max_bot_score
       FROM excluded_visitors ev
       LEFT JOIN (
         SELECT visitor_id, COUNT(*) AS pageviews, MAX(bot_score) AS max_bot_score
         FROM visitor_views
         WHERE visitor_id IN (SELECT visitor_id FROM excluded_visitors)
         GROUP BY visitor_id
       ) stats ON stats.visitor_id = ev.visitor_id
       ORDER BY ev.created_at DESC
       LIMIT 500`,
    );
    return Response.json(rows);
  },
});
