import { define } from "../utils.ts";
import { PUBLIC_MODE } from "../lib/config.ts";

export const handler = define.handlers({
  GET(ctx) {
    const origin = new URL(ctx.req.url).origin;
    const lines = ["User-agent: *"];

    if (PUBLIC_MODE) {
      lines.push("Allow: /");
      lines.push(`Sitemap: ${origin}/sitemap.xml`);
    } else {
      // Block everything — don't reveal specific paths
      lines.push("Disallow: /");
    }

    return new Response(lines.join("\n") + "\n", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
});
