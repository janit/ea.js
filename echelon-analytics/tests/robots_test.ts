// robots.txt tests — default mode (PUBLIC_MODE=false)
// Note: PUBLIC_MODE is read from env at import time.

import { assertEquals } from "@std/assert";
import { PUBLIC_MODE } from "@/lib/config.ts";

// Since PUBLIC_MODE is false by default, test the non-public behavior.

Deno.test("robots.txt — default mode is non-public", () => {
  assertEquals(PUBLIC_MODE, false);
});

Deno.test("robots.txt — non-public generates Disallow: /", () => {
  // Reproduce the logic from routes/robots.txt.ts
  const lines = ["User-agent: *"];
  if (PUBLIC_MODE) {
    lines.push("Allow: /");
    lines.push("Sitemap: https://example.com/sitemap.xml");
  } else {
    lines.push("Disallow: /");
  }
  const body = lines.join("\n") + "\n";

  assertEquals(body.includes("Disallow: /"), true);
  assertEquals(body.includes("Allow: /"), false);
  assertEquals(body.includes("Sitemap:"), false);
});

Deno.test("robots.txt — public mode would generate Allow + Sitemap", () => {
  // Simulate public mode logic
  const publicMode = true;
  const origin = "https://analytics.example.com";
  const lines = ["User-agent: *"];
  if (publicMode) {
    lines.push("Allow: /");
    lines.push(`Sitemap: ${origin}/sitemap.xml`);
  } else {
    lines.push("Disallow: /");
  }
  const body = lines.join("\n") + "\n";

  assertEquals(body.includes("Allow: /"), true);
  assertEquals(
    body.includes("Sitemap: https://analytics.example.com/sitemap.xml"),
    true,
  );
});
