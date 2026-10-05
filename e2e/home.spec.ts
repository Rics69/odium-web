import { expect, test } from "@playwright/test";

test("the home page opens with the header and footer", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Odium");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(
    page.getByRole("heading", { level: 1, name: "ODIUM" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Odium — на главную" }),
  ).toBeVisible();
  await expect(
    page.getByText("Мы делаем игры, чтобы накопить на мечту"),
  ).toBeVisible();
});

test("the header leads to the games page", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Основное меню" })
    .getByRole("link", { name: "Игры" })
    .click();

  await expect(page).toHaveURL("/games");
  await expect(page).toHaveTitle("Игры · Odium");
  await expect(
    page
      .getByRole("navigation", { name: "Основное меню" })
      .getByRole("link", { name: "Игры" }),
  ).toHaveAttribute("aria-current", "page");
});

test("the health check reaches the database", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});
