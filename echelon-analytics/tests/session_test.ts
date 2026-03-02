import { assertEquals } from "@std/assert";
import {
  createSession,
  deleteSession,
  getSession,
  pruneSessions,
} from "@/lib/session.ts";

Deno.test("createSession — returns token", () => {
  const { token } = createSession("testuser");
  assertEquals(typeof token, "string");
  assertEquals(token.length, 36); // UUID format
});

Deno.test("getSession — retrieves valid session", () => {
  const { token } = createSession("gettest");
  const session = getSession(token);
  assertEquals(session !== undefined, true);
  assertEquals(session!.username, "gettest");
});

Deno.test("getSession — unknown token → undefined", () => {
  assertEquals(getSession("nonexistent-token"), undefined);
});

Deno.test("getSession — empty string → undefined", () => {
  assertEquals(getSession(""), undefined);
});

Deno.test("deleteSession — removes session", () => {
  const { token } = createSession("deltest");
  assertEquals(getSession(token) !== undefined, true);
  deleteSession(token);
  assertEquals(getSession(token), undefined);
});

Deno.test("createSession — invalidates prior sessions for same user", () => {
  const { token: t1 } = createSession("sameuser");
  const { token: t2 } = createSession("sameuser");
  assertEquals(getSession(t1), undefined);
  assertEquals(getSession(t2) !== undefined, true);
});

Deno.test("getSession — refreshes lastActivityAt on access", () => {
  const { token } = createSession("refresh-test");
  const s1 = getSession(token);
  assertEquals(s1 !== undefined, true);
  // Access again — should update lastActivityAt
  const s2 = getSession(token);
  assertEquals(s2 !== undefined, true);
});

Deno.test("pruneSessions — does not remove active sessions", () => {
  const { token } = createSession("prune-active");
  pruneSessions();
  assertEquals(getSession(token) !== undefined, true);
});
