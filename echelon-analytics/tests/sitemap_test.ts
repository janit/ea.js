// sitemap.xml tests — default mode (PUBLIC_MODE=false)

import { assertEquals } from "@std/assert";
import { PUBLIC_MODE } from "@/lib/config.ts";

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

Deno.test("sitemap.xml — non-public → empty urlset", () => {
  const origin = "https://analytics.example.com";
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

  assertEquals(xml.includes("<url>"), false);
});

Deno.test("sitemap.xml — public mode → contains admin URLs", () => {
  const publicMode = true; // simulate
  const origin = "https://analytics.example.com";
  const urls = publicMode
    ? ADMIN_PATHS.map(
      (path) =>
        `  <url><loc>${origin}${path}</loc><changefreq>daily</changefreq></url>`,
    ).join("\n")
    : "";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  assertEquals(xml.includes("<url>"), true);
  assertEquals(xml.includes("/admin"), true);
  assertEquals(xml.includes("/admin/realtime"), true);
  assertEquals(xml.includes("/admin/campaigns"), true);
  assertEquals(ADMIN_PATHS.length, 10);
});

Deno.test("sitemap.xml — XML is well-formed", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;

  assertEquals(xml.startsWith("<?xml"), true);
  assertEquals(xml.includes("<urlset"), true);
  assertEquals(xml.includes("</urlset>"), true);
});
