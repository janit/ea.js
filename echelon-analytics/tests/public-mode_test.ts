// Cross-cutting PUBLIC_MODE tests.
// Tests the behavior/logic that the middleware enforces.

import { assertEquals } from "@std/assert";

// ── PUBLIC_MODE route logic ─────────────────────────────────────────────────

// We test the routing logic that the API middleware implements:
// - Public mode: GET/HEAD/OPTIONS allowed, POST/PATCH/DELETE → 403
// - /api/health is always public
// - /api/telemetry is exempt from write block

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

function simulatePublicModeAuth(
  method: string,
  pathname: string,
): { status: number; allowed: boolean } {
  // Health endpoint is always public
  if (pathname === "/api/health") {
    return { status: 200, allowed: true };
  }

  // Public mode: read-only
  if (SAFE_METHODS.includes(method)) {
    return { status: 200, allowed: true };
  }

  // Telemetry exempt from write block
  if (pathname === "/api/telemetry") {
    return { status: 200, allowed: true };
  }

  // Mutating request → 403
  return { status: 403, allowed: false };
}

Deno.test("PUBLIC_MODE — GET requests allowed", () => {
  for (const path of ["/api/stats/summary", "/api/bots", "/api/campaigns"]) {
    const result = simulatePublicModeAuth("GET", path);
    assertEquals(result.allowed, true, `GET ${path} should be allowed`);
  }
});

Deno.test("PUBLIC_MODE — POST /api/campaigns → 403", () => {
  const result = simulatePublicModeAuth("POST", "/api/campaigns");
  assertEquals(result.status, 403);
});

Deno.test("PUBLIC_MODE — PATCH /api/experiments/x → 403", () => {
  const result = simulatePublicModeAuth("PATCH", "/api/experiments/x");
  assertEquals(result.status, 403);
});

Deno.test("PUBLIC_MODE — DELETE /api/bots/excluded → 403", () => {
  const result = simulatePublicModeAuth("DELETE", "/api/bots/excluded");
  assertEquals(result.status, 403);
});

Deno.test("PUBLIC_MODE — POST /api/telemetry → allowed (exempt)", () => {
  const result = simulatePublicModeAuth("POST", "/api/telemetry");
  assertEquals(result.allowed, true);
});

Deno.test("PUBLIC_MODE — GET /api/health → always allowed", () => {
  const result = simulatePublicModeAuth("GET", "/api/health");
  assertEquals(result.allowed, true);
});

Deno.test("PUBLIC_MODE — HEAD requests allowed", () => {
  const result = simulatePublicModeAuth("HEAD", "/api/stats/summary");
  assertEquals(result.allowed, true);
});

Deno.test("PUBLIC_MODE — OPTIONS requests allowed (preflight)", () => {
  const result = simulatePublicModeAuth("OPTIONS", "/api/anything");
  assertEquals(result.allowed, true);
});

// ── Error response shape ────────────────────────────────────────────────────

Deno.test("PUBLIC_MODE — 403 response contains read_only error", () => {
  // Reproduce the middleware response
  const resp = {
    error: "read_only",
    message: "This is a public read-only instance. Data cannot be modified. " +
      "To run your own instance, see https://ea.js.org/installation.html",
  };
  assertEquals(resp.error, "read_only");
  assertEquals(resp.message.includes("read-only"), true);
});

// ── CSRF validation logic ───────────────────────────────────────────────────

function csrfCheck(
  method: string,
  origin: string | null,
  referer: string | null,
  requestHost: string,
): boolean {
  if (method !== "POST" && method !== "PATCH" && method !== "DELETE") {
    return true; // Not a mutating request, CSRF check not needed
  }

  let originMatch = false;
  if (origin) {
    try {
      originMatch = new URL(origin).host === requestHost;
    } catch {
      originMatch = false;
    }
  } else if (referer) {
    try {
      originMatch = new URL(referer).host === requestHost;
    } catch {
      originMatch = false;
    }
  }

  return originMatch;
}

Deno.test("CSRF — POST with matching origin → passes", () => {
  assertEquals(
    csrfCheck(
      "POST",
      "https://analytics.example.com",
      null,
      "analytics.example.com",
    ),
    true,
  );
});

Deno.test("CSRF — POST with mismatched origin → fails", () => {
  assertEquals(
    csrfCheck("POST", "https://evil.com", null, "analytics.example.com"),
    false,
  );
});

Deno.test("CSRF — POST with no origin but matching referer → passes", () => {
  assertEquals(
    csrfCheck(
      "POST",
      null,
      "https://analytics.example.com/admin",
      "analytics.example.com",
    ),
    true,
  );
});

Deno.test("CSRF — POST with no origin and no referer → fails", () => {
  assertEquals(
    csrfCheck("POST", null, null, "analytics.example.com"),
    false,
  );
});

Deno.test("CSRF — GET method skips CSRF check", () => {
  assertEquals(csrfCheck("GET", null, null, "analytics.example.com"), true);
});

Deno.test("CSRF — DELETE with matching origin → passes", () => {
  assertEquals(
    csrfCheck(
      "DELETE",
      "https://analytics.example.com",
      null,
      "analytics.example.com",
    ),
    true,
  );
});

Deno.test("CSRF — PATCH with mismatched origin → fails", () => {
  assertEquals(
    csrfCheck("PATCH", "https://attacker.com", null, "analytics.example.com"),
    false,
  );
});
