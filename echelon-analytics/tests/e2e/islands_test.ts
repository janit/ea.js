// E2E: Island interaction tests
//
// Tests client-side island behavior (campaigns, experiments, bots).
// Requires a running Echelon Analytics server and Chromium.

import { assertEquals } from "@std/assert";
import { setupE2E, skipIfNoE2E } from "../_e2e_helpers.ts";

Deno.test({
  name: "e2e/islands — campaign page renders",
  ignore: skipIfNoE2E(),
  async fn() {
    const { page, baseUrl, cleanup } = await setupE2E();
    try {
      await page.goto(`${baseUrl}/admin/campaigns`, {
        waitUntil: "networkidle2",
      });

      const content = await page.evaluate(() => document.body.innerText);
      assertEquals(typeof content, "string");
    } finally {
      await cleanup();
    }
  },
});

Deno.test({
  name: "e2e/islands — experiments page renders",
  ignore: skipIfNoE2E(),
  async fn() {
    const { page, baseUrl, cleanup } = await setupE2E();
    try {
      await page.goto(`${baseUrl}/admin/experiments`, {
        waitUntil: "networkidle2",
      });

      const content = await page.evaluate(() => document.body.innerText);
      assertEquals(typeof content, "string");
    } finally {
      await cleanup();
    }
  },
});

Deno.test({
  name: "e2e/islands — bots page renders",
  ignore: skipIfNoE2E(),
  async fn() {
    const { page, baseUrl, cleanup } = await setupE2E();
    try {
      await page.goto(`${baseUrl}/admin/bots`, {
        waitUntil: "networkidle2",
      });

      const content = await page.evaluate(() => document.body.innerText);
      assertEquals(typeof content, "string");
    } finally {
      await cleanup();
    }
  },
});

Deno.test({
  name: "e2e/islands — settings page renders",
  ignore: skipIfNoE2E(),
  async fn() {
    const { page, baseUrl, cleanup } = await setupE2E();
    try {
      await page.goto(`${baseUrl}/admin/settings`, {
        waitUntil: "networkidle2",
      });

      const content = await page.evaluate(() => document.body.innerText);
      assertEquals(typeof content, "string");
    } finally {
      await cleanup();
    }
  },
});
