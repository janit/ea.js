import { define } from "../utils.ts";
import { PUBLIC_MODE } from "../lib/config.ts";

const ADMIN_PATHS = [
  "/admin",
  "/admin/realtime",
  "/admin/visitors",
  "/admin/events",
  "/admin/bots",
  "/admin/bots/excluded",
  "/admin/experiments",
  "/admin/campaigns",
  "/admin/perf",
  "/admin/settings",
];

export const handler = define.handlers({
  GET(ctx) {
    const origin = new URL(ctx.req.url).origin;

    const urls = PUBLIC_MODE
      ? ADMIN_PATHS.map(
        (path) =>
          `  <url><loc>${origin}${path}</loc><changefreq>daily</changefreq></url>`,
      ).join("\n")
      : "";

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    return new Response(xml, {
      headers: { "content-type": "application/xml; charset=utf-8" },
    });
  },
});
