import { expect, test } from "@playwright/test";

test("the component showcase is hidden in production", async ({ page }) => {
  const response = await page.goto("/dev/ui");
  expect(response?.status()).toBe(404);
});
