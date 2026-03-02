import { assertEquals, assertNotEquals } from "@std/assert";
import {
  anonymizeEvent,
  anonymizeView,
  shouldAnonymize,
} from "@/lib/anonymize.ts";
import type { SemanticEvent, ViewRecord } from "@/types.ts";

function baseView(overrides: Partial<ViewRecord> = {}): ViewRecord {
  return {
    visitor_id: "abc123def456abc0",
    path: "/test",
    site_id: "test-site",
    session_id: "550e8400-e29b-41d4-a716-446655440000",
    interaction_ms: 2000,
    screen_width: 1920,
    screen_height: 1080,
    device_type: "desktop",
    os_name: "Linux",
    country_code: "NO",
    is_returning: 0,
    referrer: "https://google.com",
    referrer_type: "search",
    bot_score: 0,
    is_pwa: 0,
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "spring-sale",
    utm_content: "banner-1",
    utm_term: "analytics",
    ...overrides,
  };
}

function baseEvent(overrides: Partial<SemanticEvent> = {}): SemanticEvent {
  return {
    event_type: "click",
    site_id: "test-site",
    session_id: "550e8400-e29b-41d4-a716-446655440000",
    visitor_id: "abc123def456abc0",
    data: '{"target":"button"}',
    experiment_id: "exp-001",
    variant_id: "variant-a",
    utm_campaign: "spring-sale",
    device_type: "desktop",
    referrer: "https://google.com",
    hour: 14,
    month: 3,
    day_of_week: 2,
    is_returning: 0,
    bot_score: 0,
    ...overrides,
  };
}

// ── shouldAnonymize ─────────────────────────────────────────────────────────

Deno.test("shouldAnonymize — false when ANONYMIZE_SITES is empty", () => {
  // Default config has no anonymize sites
  assertEquals(shouldAnonymize("test-site"), false);
  assertEquals(shouldAnonymize("anything"), false);
});

// ── anonymizeView ───────────────────────────────────────────────────────────

Deno.test("anonymizeView — replaces visitor_id with HMAC hash", async () => {
  const original = baseView();
  const anon = await anonymizeView(original);
  assertNotEquals(anon.visitor_id, original.visitor_id);
  assertEquals(anon.visitor_id.length, 16);
  assertEquals(/^[0-9a-f]{16}$/.test(anon.visitor_id), true);
});

Deno.test("anonymizeView — replaces country with planet name", async () => {
  const anon = await anonymizeView(baseView());
  assertNotEquals(anon.country_code, "NO");
  assertEquals(typeof anon.country_code, "string");
});

Deno.test("anonymizeView — replaces referrer with NSA codename URL", async () => {
  const anon = await anonymizeView(baseView());
  assertEquals(
    anon.referrer!.startsWith("https://nsa-intranet.gov/ops/"),
    true,
  );
});

Deno.test("anonymizeView — replaces session_id with fisherman name", async () => {
  const anon = await anonymizeView(baseView());
  assertNotEquals(anon.session_id, baseView().session_id);
  assertEquals(typeof anon.session_id, "string");
});

Deno.test("anonymizeView — replaces UTM fields with operation codenames", async () => {
  const original = baseView();
  const anon = await anonymizeView(original);
  assertNotEquals(anon.utm_source, original.utm_source);
  assertNotEquals(anon.utm_medium, original.utm_medium);
  assertNotEquals(anon.utm_campaign, original.utm_campaign);
  assertNotEquals(anon.utm_content, original.utm_content);
  assertNotEquals(anon.utm_term, original.utm_term);
  assertEquals(anon.utm_source!.startsWith("operation-"), true);
});

Deno.test("anonymizeView — null fields stay null", async () => {
  const anon = await anonymizeView(
    baseView({
      session_id: null,
      country_code: null,
      referrer: null,
      utm_source: null,
    }),
  );
  assertEquals(anon.session_id, null);
  assertEquals(anon.country_code, null);
  assertEquals(anon.referrer, null);
  assertEquals(anon.utm_source, null);
});

Deno.test("anonymizeView — deterministic (same input → same output)", async () => {
  const original = baseView();
  const a = await anonymizeView(original);
  const b = await anonymizeView(original);
  assertEquals(a.visitor_id, b.visitor_id);
  assertEquals(a.session_id, b.session_id);
  assertEquals(a.country_code, b.country_code);
  assertEquals(a.referrer, b.referrer);
});

Deno.test("anonymizeView — preserves non-anonymized fields", async () => {
  const original = baseView();
  const anon = await anonymizeView(original);
  assertEquals(anon.path, original.path);
  assertEquals(anon.site_id, original.site_id);
  assertEquals(anon.interaction_ms, original.interaction_ms);
  assertEquals(anon.screen_width, original.screen_width);
  assertEquals(anon.device_type, original.device_type);
  assertEquals(anon.bot_score, original.bot_score);
  assertEquals(anon.is_pwa, original.is_pwa);
});

// ── anonymizeEvent ──────────────────────────────────────────────────────────

Deno.test("anonymizeEvent — replaces visitor_id with HMAC hash", async () => {
  const original = baseEvent();
  const anon = await anonymizeEvent(original);
  assertNotEquals(anon.visitor_id, original.visitor_id);
  assertEquals(anon.visitor_id!.length, 16);
});

Deno.test("anonymizeEvent — replaces session_id with fisherman name", async () => {
  const original = baseEvent();
  const anon = await anonymizeEvent(original);
  assertNotEquals(anon.session_id, original.session_id);
});

Deno.test("anonymizeEvent — replaces referrer with NSA codename URL", async () => {
  const anon = await anonymizeEvent(baseEvent());
  assertEquals(
    anon.referrer!.startsWith("https://nsa-intranet.gov/ops/"),
    true,
  );
});

Deno.test("anonymizeEvent — wipes data field to empty JSON", async () => {
  const anon = await anonymizeEvent(baseEvent());
  assertEquals(anon.data, "{}");
});

Deno.test("anonymizeEvent — anonymizes experiment and variant IDs", async () => {
  const original = baseEvent();
  const anon = await anonymizeEvent(original);
  assertEquals(anon.experiment_id!.startsWith("experiment-"), true);
  assertEquals(anon.variant_id!.startsWith("variant-"), true);
});

Deno.test("anonymizeEvent — null fields stay null", async () => {
  const anon = await anonymizeEvent(
    baseEvent({
      visitor_id: null,
      session_id: null,
      referrer: null,
      experiment_id: null,
      variant_id: null,
    }),
  );
  assertEquals(anon.visitor_id, null);
  assertEquals(anon.session_id, null);
  assertEquals(anon.referrer, null);
  assertEquals(anon.experiment_id, null);
  assertEquals(anon.variant_id, null);
});
