import { expect, test } from "@playwright/test";

test("the home page opens", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Odium");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(
    page.getByRole("heading", { level: 1, name: "ODIUM" }),
  ).toBeVisible();
});

test("the health check reaches the database", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});
