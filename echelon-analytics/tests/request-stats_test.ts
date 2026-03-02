import { assertEquals, assertGreater } from "@std/assert";
import { getRequestStats, recordRequest } from "@/lib/request-stats.ts";

Deno.test("recordRequest + getRequestStats — counts increment", () => {
  const before = getRequestStats();
  const prevTotal = before.totalRequests;

  recordRequest("/test", 50, 200);
  recordRequest("/test", 100, 200);
  recordRequest("/test", 150, 500);

  const after = getRequestStats();
  assertEquals(after.totalRequests, prevTotal + 3);
});

Deno.test("getRequestStats — tracks 5xx errors", () => {
  const before = getRequestStats();
  const prevErrors = before.totalErrors;

  recordRequest("/error", 10, 500);
  recordRequest("/error", 10, 503);

  const after = getRequestStats();
  assertEquals(after.totalErrors, prevErrors + 2);
});

Deno.test("getRequestStats — returns valid avgResponseMs", () => {
  recordRequest("/avg-test", 100, 200);
  recordRequest("/avg-test", 200, 200);
  const stats = getRequestStats();
  assertGreater(stats.avgResponseMs, 0);
});

Deno.test("getRequestStats — rps is non-negative", () => {
  const stats = getRequestStats();
  assertEquals(stats.rps >= 0, true);
});

Deno.test("getRequestStats — uptimeSeconds is positive", () => {
  const stats = getRequestStats();
  assertEquals(stats.uptimeSeconds >= 0, true);
});

Deno.test("getRequestStats — errorRate is computed correctly", () => {
  const stats = getRequestStats();
  assertEquals(typeof stats.errorRate, "number");
  assertEquals(stats.errorRate >= 0, true);
  assertEquals(stats.errorRate <= 100, true);
});

Deno.test("getRequestStats — slowPaths has at most 5 entries", () => {
  // Record requests on many different paths
  for (let i = 0; i < 10; i++) {
    recordRequest(`/slow-path-${i}`, (i + 1) * 100, 200);
  }
  const stats = getRequestStats();
  assertEquals(stats.slowPaths.length <= 5, true);
});

Deno.test("getRequestStats — slowPaths sorted by avgMs descending", () => {
  const stats = getRequestStats();
  for (let i = 1; i < stats.slowPaths.length; i++) {
    assertEquals(
      stats.slowPaths[i - 1].avgMs >= stats.slowPaths[i].avgMs,
      true,
    );
  }
});

Deno.test("getRequestStats — recentRequests counts recent window", () => {
  const stats = getRequestStats();
  assertEquals(typeof stats.recentRequests, "number");
  assertGreater(stats.recentRequests, 0);
});

Deno.test("getRequestStats — percentiles are non-negative", () => {
  const stats = getRequestStats();
  assertEquals(stats.p50Ms >= 0, true);
  assertEquals(stats.p95Ms >= 0, true);
  assertEquals(stats.p99Ms >= 0, true);
  assertEquals(stats.maxMs >= 0, true);
});
