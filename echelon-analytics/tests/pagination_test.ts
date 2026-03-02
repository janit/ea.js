import { assertEquals } from "@std/assert";
import { paginate } from "@/lib/pagination.ts";
import { createTestDb, insertView } from "./_helpers.ts";

Deno.test("paginate — page 1 defaults", async () => {
  const db = createTestDb();
  for (let i = 0; i < 30; i++) {
    await insertView(db, { visitor_id: `visitor-${i}` });
  }
  const result = await paginate(db, {
    sql: "SELECT * FROM visitor_views ORDER BY id",
    countSql: "SELECT COUNT(*) AS total FROM visitor_views",
    params: [],
    page: 1,
  });
  assertEquals(result.page, 1);
  assertEquals(result.perPage, 25);
  assertEquals(result.total, 30);
  assertEquals(result.totalPages, 2);
  assertEquals(result.rows.length, 25);
  await db.close();
});

Deno.test("paginate — page 2 returns remaining rows", async () => {
  const db = createTestDb();
  for (let i = 0; i < 30; i++) {
    await insertView(db, { visitor_id: `visitor-${i}` });
  }
  const result = await paginate(db, {
    sql: "SELECT * FROM visitor_views ORDER BY id",
    countSql: "SELECT COUNT(*) AS total FROM visitor_views",
    params: [],
    page: 2,
  });
  assertEquals(result.page, 2);
  assertEquals(result.rows.length, 5);
  await db.close();
});

Deno.test("paginate — out-of-range page clamped to last page", async () => {
  const db = createTestDb();
  for (let i = 0; i < 10; i++) {
    await insertView(db, { visitor_id: `visitor-${i}` });
  }
  const result = await paginate(db, {
    sql: "SELECT * FROM visitor_views ORDER BY id",
    countSql: "SELECT COUNT(*) AS total FROM visitor_views",
    params: [],
    page: 999,
  });
  assertEquals(result.page, 1); // only 1 page, 10 rows with default 25 per page
  assertEquals(result.totalPages, 1);
  await db.close();
});

Deno.test("paginate — custom perPage", async () => {
  const db = createTestDb();
  for (let i = 0; i < 10; i++) {
    await insertView(db, { visitor_id: `visitor-${i}` });
  }
  const result = await paginate(db, {
    sql: "SELECT * FROM visitor_views ORDER BY id",
    countSql: "SELECT COUNT(*) AS total FROM visitor_views",
    params: [],
    page: 1,
    perPage: 3,
  });
  assertEquals(result.perPage, 3);
  assertEquals(result.totalPages, 4); // ceil(10/3)
  assertEquals(result.rows.length, 3);
  await db.close();
});

Deno.test("paginate — 0 items", async () => {
  const db = createTestDb();
  const result = await paginate(db, {
    sql: "SELECT * FROM visitor_views ORDER BY id",
    countSql: "SELECT COUNT(*) AS total FROM visitor_views",
    params: [],
    page: 1,
  });
  assertEquals(result.total, 0);
  assertEquals(result.totalPages, 1);
  assertEquals(result.rows.length, 0);
  await db.close();
});

Deno.test("paginate — negative page clamped to 1", async () => {
  const db = createTestDb();
  await insertView(db);
  const result = await paginate(db, {
    sql: "SELECT * FROM visitor_views ORDER BY id",
    countSql: "SELECT COUNT(*) AS total FROM visitor_views",
    params: [],
    page: -5,
  });
  assertEquals(result.page, 1);
  await db.close();
});
