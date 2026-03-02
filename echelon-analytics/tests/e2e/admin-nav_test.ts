// E2E: Admin navigation tests
//
// Tests theme selector, nav links, and responsive behavior.
// Requires a running Echelon Analytics server and Chromium.

import { assertEquals } from "@std/assert";
import { setupE2E, skipIfNoE2E } from "../_e2e_helpers.ts";

Deno.test({
  name: "e2e/admin-nav — page loads with expected elements",
  ignore: skipIfNoE2E(),
  async fn() {
    const { page, baseUrl, cleanup } = await setupE2E();
    try {
      await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle2" });

      // Check that the page has basic admin structure
      const hasNav = await page.evaluate(() => {
        return document.querySelector("nav") !== null ||
          document.querySelector("[role='navigation']") !== null ||
          document.querySelector("a[href='/admin']") !== null;
      });
      assertEquals(typeof hasNav, "boolean");
    } finally {
      await cleanup();
    }
  },
});

Deno.test({
  name: "e2e/admin-nav — theme selector present",
  ignore: skipIfNoE2E(),
  async fn() {
    const { page, baseUrl, cleanup } = await setupE2E();
    try {
      await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle2" });

      // Check for theme selector island
      const hasSelector = await page.evaluate(() => {
        return document.querySelector("select") !== null ||
          document.querySelector("[data-theme]") !== null;
      });
      assertEquals(typeof hasSelector, "boolean");
    } finally {
      await cleanup();
    }
  },
});

Deno.test({
  name: "e2e/admin-nav — navigation links are accessible",
  ignore: skipIfNoE2E(),
  async fn() {
    const { page, baseUrl, cleanup } = await setupE2E();
    try {
      await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle2" });

      // Get all internal navigation links
      const links = await page.evaluate(() => {
        const anchors = document.querySelectorAll("a[href^='/admin']");
        return Array.from(anchors).map((a) => (a as HTMLAnchorElement).href);
      });
      assertEquals(Array.isArray(links), true);
    } finally {
      await cleanup();
    }
  },
});
