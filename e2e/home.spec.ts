import { expect, test } from "@playwright/test";

test("the home page shows the studio, its games and team", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Odium");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(
    page.getByRole("heading", { level: 1, name: "ODIUM" }),
  ).toBeVisible();
  await expect(page.getByText("Копим на ту, что станет кино")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Odium — на главную" }),
  ).toBeVisible();

  const gallery = page.locator("#games");
  await expect(
    gallery.getByRole("heading", { name: "Деревня Слов" }),
  ).toBeVisible();
  await expect(
    gallery.getByRole("heading", { name: "Неоновый сад" }),
  ).toBeVisible();
  await expect(gallery.getByText("Секретный проект")).toHaveCount(0);

  for (const role of ["Основатель", "Разработчик", "Дизайнер"]) {
    await expect(page.getByText(role, { exact: true })).toBeVisible();
  }
  await expect(page.getByText("Каждая наша игра — шаг к мечте")).toBeVisible();
  await expect(page.getByRole("link", { name: "Telegram" })).toHaveAttribute(
    "href",
    "https://t.me/odium_games",
  );
});

test("the gallery leads to a game page", async ({ page }) => {
  await page.goto("/");
  await page
    .locator("#games")
    .getByRole("link", { name: /Деревня Слов/ })
    .click();

  await expect(page).toHaveURL("/games/derevnya-slov");
  await expect(page).toHaveTitle("Деревня Слов · Odium");
  await expect(
    page.getByRole("heading", { level: 1, name: "Деревня Слов" }),
  ).toBeVisible();
});

test("an unpublished game is a 404", async ({ page }) => {
  const response = await page.goto("/games/secret-project");
  expect(response?.status()).toBe(404);
});

test("the header leads to the games page", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Основное меню" });
  await nav.getByRole("link", { name: "Игры" }).click();

  await expect(page).toHaveURL("/games");
  await expect(page).toHaveTitle("Игры · Odium");
  await expect(nav.getByRole("link", { name: "Игры" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("the health check reaches the database", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});
