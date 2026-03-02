import { assertEquals } from "@std/assert";
import { constantTimeEquals, validateSiteId } from "@/lib/config.ts";

// ── constantTimeEquals ──────────────────────────────────────────────────────

Deno.test("constantTimeEquals — equal strings → true", () => {
  assertEquals(constantTimeEquals("hello", "hello"), true);
  assertEquals(constantTimeEquals("test-secret-123", "test-secret-123"), true);
});

Deno.test("constantTimeEquals — different strings → false", () => {
  assertEquals(constantTimeEquals("hello", "world"), false);
  assertEquals(constantTimeEquals("abc", "abd"), false);
});

Deno.test("constantTimeEquals — different lengths → false", () => {
  assertEquals(constantTimeEquals("short", "much-longer-string"), false);
  assertEquals(constantTimeEquals("a", "ab"), false);
});

Deno.test("constantTimeEquals — empty strings → true", () => {
  assertEquals(constantTimeEquals("", ""), true);
});

Deno.test("constantTimeEquals — one empty → false", () => {
  assertEquals(constantTimeEquals("", "nonempty"), false);
  assertEquals(constantTimeEquals("nonempty", ""), false);
});

// ── validateSiteId ──────────────────────────────────────────────────────────

Deno.test("validateSiteId — valid IDs pass through", () => {
  assertEquals(validateSiteId("my-site"), "my-site");
  assertEquals(validateSiteId("site.example.com"), "site.example.com");
  assertEquals(validateSiteId("site_v2"), "site_v2");
  assertEquals(validateSiteId("ABC123"), "ABC123");
});

Deno.test("validateSiteId — invalid characters → 'default'", () => {
  assertEquals(validateSiteId("has spaces"), "default");
  assertEquals(validateSiteId("has/slash"), "default");
  assertEquals(validateSiteId("<script>"), "default");
  assertEquals(validateSiteId(""), "default");
});

Deno.test("validateSiteId — too long → 'default'", () => {
  assertEquals(validateSiteId("a".repeat(65)), "default");
  assertEquals(validateSiteId("a".repeat(64)), "a".repeat(64));
});
