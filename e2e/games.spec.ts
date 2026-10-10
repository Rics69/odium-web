import { expect, test } from "@playwright/test";

test("the catalogue lists published games and leads to their pages", async ({
  page,
}) => {
  await page.goto("/games");

  await expect(page).toHaveTitle("Игры · Odium");
  await expect(
    page.getByRole("heading", { level: 1, name: "Игры" }),
  ).toBeVisible();

  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", { level: 2, name: "Деревня Слов" }),
  ).toBeVisible();
  await expect(
    main.getByRole("heading", { level: 2, name: "Неоновый сад" }),
  ).toBeVisible();
  await expect(main.getByText("Секретный проект")).toHaveCount(0);
  // Within each card: the admin tests publish games of their own for a moment.
  await expect(
    main.getByRole("link", { name: /Деревня Слов/ }).getByText("В разработке"),
  ).toBeVisible();
  await expect(
    main.getByRole("link", { name: /Неоновый сад/ }).getByText("Вышла"),
  ).toBeVisible();
  // Visible wishes of every status; the tests write to the other board.
  await expect(
    main.getByRole("link", { name: /Деревня Слов/ }).getByText("7 пожеланий"),
  ).toBeVisible();

  await main.getByRole("link", { name: /Неоновый сад/ }).click();
  await expect(page).toHaveURL("/games/neon-garden");
  await expect(
    page.getByRole("heading", { level: 1, name: "Неоновый сад" }),
  ).toBeVisible();
});
