import { expect, test } from "@playwright/test";
import { newPlayer, randomIp } from "./visitors";

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
});

test("a player signs in where they were, and signs out", async ({
  page,
  baseURL,
}) => {
  const player = newPlayer();
  const signUp = await page.request.post("/api/auth/sign-up", {
    headers: { origin: baseURL!, "x-forwarded-for": randomIp() },
    data: player,
  });
  expect(signUp.status()).toBe(201);
  await page.context().clearCookies();

  await page.goto("/games");
  const header = page.getByRole("banner");
  await header.getByRole("link", { name: "Войти" }).click();
  await expect(page).toHaveURL("/login?next=%2Fgames");

  await page.getByLabel("Почта").fill(player.email);
  await page.getByLabel("Пароль", { exact: true }).fill("not-the-password");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Неверная почта или пароль.",
  );

  await page.getByLabel("Пароль", { exact: true }).fill(player.password);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL("/games");
  await header.getByRole("link", { name: player.nickname }).click();

  await expect(page).toHaveURL("/profile");
  await page.getByRole("button", { name: "Выйти" }).click();
  await expect(page).toHaveURL("/");
  await expect(header.getByRole("link", { name: "Войти" })).toBeVisible();
});
