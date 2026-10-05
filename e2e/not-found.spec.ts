import { expect, test } from "@playwright/test";

test("an unknown address answers 404 and leads home", async ({ page }) => {
  const response = await page.goto("/takoy-stranitsy-net");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Такой страницы нет" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "На главную", exact: true }).click();
  await expect(page).toHaveURL("/");
});
