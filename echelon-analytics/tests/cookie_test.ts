import { assertEquals } from "@std/assert";
import { getCookie, getRequestCookie } from "@/lib/cookie.ts";

// ── getCookie ───────────────────────────────────────────────────────────────

Deno.test("getCookie — finds named cookie", () => {
  assertEquals(getCookie("foo=bar; baz=qux", "foo"), "bar");
  assertEquals(getCookie("foo=bar; baz=qux", "baz"), "qux");
});

Deno.test("getCookie — missing cookie → null", () => {
  assertEquals(getCookie("foo=bar", "missing"), null);
});

Deno.test("getCookie — null header → null", () => {
  assertEquals(getCookie(null, "anything"), null);
});

Deno.test("getCookie — empty string header → null", () => {
  assertEquals(getCookie("", "foo"), null);
});

Deno.test("getCookie — cookie with = in value", () => {
  assertEquals(getCookie("token=abc=def=ghi", "token"), "abc=def=ghi");
});

Deno.test("getCookie — whitespace around cookie name/value", () => {
  assertEquals(getCookie(" foo = bar ; baz = qux ", "foo"), "bar");
});

// ── getRequestCookie ────────────────────────────────────────────────────────

Deno.test("getRequestCookie — extracts from Request", () => {
  const req = new Request("https://example.com", {
    headers: { cookie: "session=abc123; theme=dark" },
  });
  assertEquals(getRequestCookie(req, "session"), "abc123");
  assertEquals(getRequestCookie(req, "theme"), "dark");
  assertEquals(getRequestCookie(req, "missing"), null);
});

Deno.test("getRequestCookie — no cookie header → null", () => {
  const req = new Request("https://example.com");
  assertEquals(getRequestCookie(req, "anything"), null);
});
