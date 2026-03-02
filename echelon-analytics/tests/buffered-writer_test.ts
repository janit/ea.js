import { assertEquals } from "@std/assert";
import { BufferedWriter } from "@/lib/buffered-writer.ts";
import { createTestDb } from "./_helpers.ts";

Deno.test("BufferedWriter — push increments size", () => {
  const writer = new BufferedWriter<string>(
    () => Promise.resolve(),
    1000,
    60_000,
    "Test",
  );
  assertEquals(writer.size, 0);
  writer.push("a");
  assertEquals(writer.size, 1);
  writer.push("b");
  assertEquals(writer.size, 2);
});

Deno.test("BufferedWriter — flush callback receives all items", async () => {
  const received: string[][] = [];
  const writer = new BufferedWriter<string>(
    (_db, batch) => {
      received.push([...batch]);
      return Promise.resolve();
    },
    1000,
    60_000,
    "Test",
  );
  const db = createTestDb();

  writer.push("x");
  writer.push("y");
  writer.push("z");

  // stop() triggers a final flush
  await writer.stop(db);

  assertEquals(received.length, 1);
  assertEquals(received[0], ["x", "y", "z"]);
  assertEquals(writer.size, 0);
  await db.close();
});

Deno.test("BufferedWriter — size resets after successful flush", async () => {
  const writer = new BufferedWriter<number>(
    () => Promise.resolve(),
    1000,
    60_000,
    "Test",
  );
  const db = createTestDb();

  writer.push(1);
  writer.push(2);
  assertEquals(writer.size, 2);

  await writer.stop(db);
  assertEquals(writer.size, 0);
  await db.close();
});

Deno.test("BufferedWriter — drops records when buffer full", () => {
  const writer = new BufferedWriter<string>(
    () => Promise.resolve(),
    3, // maxBuffer = 3
    60_000,
    "Test",
  );

  writer.push("a");
  writer.push("b");
  writer.push("c");
  assertEquals(writer.size, 3);

  // This should be dropped
  writer.push("d");
  assertEquals(writer.size, 3);
});

Deno.test("BufferedWriter — empty buffer flush is no-op", async () => {
  let flushCount = 0;
  const writer = new BufferedWriter<string>(
    () => {
      flushCount++;
      return Promise.resolve();
    },
    1000,
    60_000,
    "Test",
  );
  const db = createTestDb();

  await writer.stop(db);
  assertEquals(flushCount, 0);
  await db.close();
});

Deno.test("BufferedWriter — retries on failure", async () => {
  let attempts = 0;
  const writer = new BufferedWriter<string>(
    () => {
      attempts++;
      if (attempts < 3) throw new Error("transient failure");
      return Promise.resolve();
    },
    1000,
    60_000,
    "Test",
  );
  const db = createTestDb();

  writer.push("retry-me");
  await writer.stop(db);

  assertEquals(attempts, 3); // Failed 2x, succeeded on 3rd
  assertEquals(writer.size, 0);
  await db.close();
});

Deno.test("BufferedWriter — keeps records in buffer on total failure", async () => {
  const writer = new BufferedWriter<string>(
    () => {
      throw new Error("permanent failure");
    },
    1000,
    60_000,
    "Test",
  );
  const db = createTestDb();

  writer.push("will-fail");
  await writer.stop(db);

  // Records stay in buffer when all retries fail
  assertEquals(writer.size, 1);
  await db.close();
});
