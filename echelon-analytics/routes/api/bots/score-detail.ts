import { define } from "../../../utils.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const db = ctx.state.db;
    const viewId = ctx.url.searchParams.get("view_id");
    const eventId = ctx.url.searchParams.get("event_id");

    if (!viewId && !eventId) {
      return Response.json(
        { error: "view_id or event_id required" },
        { status: 400 },
      );
    }

    if (viewId) {
      const row = await db.queryOne<{
        bot_score: number;
        bot_score_detail: string | null;
      }>(
        `SELECT bot_score, bot_score_detail FROM visitor_views WHERE id = ?`,
        viewId,
      );
      if (!row) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }
      return Response.json({
        score: row.bot_score,
        detail: row.bot_score_detail ? JSON.parse(row.bot_score_detail) : null,
      });
    }

    const row = await db.queryOne<{
      bot_score: number;
      bot_score_detail: string | null;
    }>(
      `SELECT bot_score, bot_score_detail FROM semantic_events WHERE id = ?`,
      eventId!,
    );
    if (!row) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json({
      score: row.bot_score,
      detail: row.bot_score_detail ? JSON.parse(row.bot_score_detail) : null,
    });
  },
});
