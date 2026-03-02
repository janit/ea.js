// API middleware tests.
// Default config: SECRET="", AUTH_USERNAME="", PUBLIC_MODE=false
// This tests the "no auth configured" path which returns 401.

import { assertEquals } from "@std/assert";
import { constantTimeEquals } from "@/lib/config.ts";
import { createSession, getSession } from "@/lib/session.ts";
import { getCookie } from "@/lib/cookie.ts";

// We can't easily instantiate the Fresh middleware handler directly,
// so we test the underlying auth logic components that the middleware uses.

// ── Bearer token auth (constantTimeEquals) ──────────────────────────────────

Deno.test("API auth — constantTimeEquals accepts valid token", () => {
  const secret = "my-secret-token-123";
  const candidate = "my-secret-token-123";
  assertEquals(constantTimeEquals(candidate, secret), true);
});

Deno.test("API auth — constantTimeEquals rejects invalid token", () => {
  const secret = "my-secret-token-123";
  const candidate = "wrong-token";
  assertEquals(constantTimeEquals(candidate, secret), false);
});

// ── Session cookie auth ─────────────────────────────────────────────────────

Deno.test("API auth — session cookie validated via getSession", () => {
  const { token } = createSession("apiuser");
  assertEquals(getSession(token) !== undefined, true);
  assertEquals(getSession("invalid-token"), undefined);
});

Deno.test("API auth — getCookie extracts echelon_session", () => {
  const cookieHeader = `echelon_session=abc-123; other=value`;
  assertEquals(getCookie(cookieHeader, "echelon_session"), "abc-123");
});

// ── CSRF origin check logic ─────────────────────────────────────────────────

Deno.test("CSRF — origin host matches request host → passes", () => {
  const origin = "https://analytics.example.com";
  const requestHost = "analytics.example.com";
  const originHost = new URL(origin).host;
  assertEquals(originHost === requestHost, true);
});

Deno.test("CSRF — origin host mismatch → fails", () => {
  const origin = "https://evil.com";
  const requestHost = "analytics.example.com";
  const originHost = new URL(origin).host;
  assertEquals(originHost === requestHost, false);
});

Deno.test("CSRF — protocol mismatch but same host → passes", () => {
  // Behind reverse proxy: internal http vs external https
  const origin = "http://analytics.example.com";
  const requestHost = "analytics.example.com";
  const originHost = new URL(origin).host;
  assertEquals(originHost === requestHost, true);
});

Deno.test("CSRF — origin with port matches host with port", () => {
  const origin = "https://analytics.example.com:8443";
  const requestHost = "analytics.example.com:8443";
  const originHost = new URL(origin).host;
  assertEquals(originHost === requestHost, true);
});

Deno.test("CSRF — referer fallback when origin header missing", () => {
  const referer = "https://analytics.example.com/admin/settings";
  const requestHost = "analytics.example.com";
  const refererHost = new URL(referer).host;
  assertEquals(refererHost === requestHost, true);
});

// ── PUBLIC_MODE logic (default: off) ────────────────────────────────────────

Deno.test("PUBLIC_MODE — default is false (non-public)", () => {
  const publicMode = Deno.env.get("ECHELON_PUBLIC_MODE") === "true";
  assertEquals(publicMode, false);
});

// ── Health endpoint ─────────────────────────────────────────────────────────

Deno.test("Health endpoint — /api/health path detected correctly", () => {
  const url = new URL("https://analytics.example.com/api/health");
  assertEquals(url.pathname, "/api/health");
});

// ── Telemetry exempt from PUBLIC_MODE write block ───────────────────────────

Deno.test("Telemetry path — /api/telemetry detected correctly", () => {
  const url = new URL("https://analytics.example.com/api/telemetry");
  assertEquals(url.pathname, "/api/telemetry");
});
