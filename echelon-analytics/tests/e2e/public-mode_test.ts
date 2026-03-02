// E2E: PUBLIC_MODE browser tests
//
// Tests that mutation buttons/forms are hidden in public mode.
// Requires a running Echelon Analytics server with ECHELON_PUBLIC_MODE=true.

import { assertEquals } from "@std/assert";
import { setupE2E, skipIfNoE2E } from "../_e2e_helpers.ts";

const isPublicMode = Deno.env.get("ECHELON_PUBLIC_MODE") === "true";

Deno.test({
  name: "e2e/public-mode — admin page loads in public mode",
  ignore: skipIfNoE2E() || !isPublicMode,
  async fn() {
    const { page, baseUrl, cleanup } = await setupE2E();
    try {
      await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle2" });

      const content = await page.evaluate(() => document.body.innerText);
      assertEquals(typeof content, "string");
    } finally {
      await cleanup();
    }
  },
});

Deno.test({
  name: "e2e/public-mode — no delete buttons visible",
  ignore: skipIfNoE2E() || !isPublicMode,
  async fn() {
    const { page, baseUrl, cleanup } = await setupE2E();
    try {
      await page.goto(`${baseUrl}/admin/bots/excluded`, {
        waitUntil: "networkidle2",
      });

      const deleteButtons = await page.evaluate(() => {
        const buttons = document.querySelectorAll(
          'button[data-action="delete"], button.delete, [onclick*="delete"]',
        );
        return buttons.length;
      });
      assertEquals(deleteButtons, 0);
    } finally {
      await cleanup();
    }
  },
});

Deno.test({
  name: "e2e/public-mode — mutation forms absent",
  ignore: skipIfNoE2E() || !isPublicMode,
  async fn() {
    const { page, baseUrl, cleanup } = await setupE2E();
    try {
      await page.goto(`${baseUrl}/admin/campaigns`, {
        waitUntil: "networkidle2",
      });

      // In public mode, forms that create/edit campaigns should be hidden
      const formCount = await page.evaluate(() => {
        const forms = document.querySelectorAll(
          'form[method="POST"], form[method="post"]',
        );
        return forms.length;
      });
      assertEquals(
        formCount,
        0,
        "No POST forms should be visible in public mode",
      );
    } finally {
      await cleanup();
    }
  },
});

Deno.test({
  name: "e2e/public-mode — API write calls rejected from browser",
  ignore: skipIfNoE2E() || !isPublicMode,
  async fn() {
    const { page, baseUrl, cleanup } = await setupE2E();
    try {
      await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle2" });

      // Try a POST to the API from the browser
      const status = await page.evaluate(async () => {
        const resp = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "test" }),
        });
        return resp.status;
      });
      assertEquals(status, 403);
    } finally {
      await cleanup();
    }
  },
});
