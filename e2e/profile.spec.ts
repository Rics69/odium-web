import { expect, test } from "@playwright/test";
import { newPlayer, randomIp } from "./visitors";

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
});

test("a player renames themselves, mistypes a password and deletes the account", async ({
  page,
  baseURL,
}) => {
  const player = newPlayer();
  const signUp = await page.request.post("/api/auth/sign-up", {
    headers: { origin: baseURL!, "x-forwarded-for": randomIp() },
    data: player,
  });
  expect(signUp.status()).toBe(201);

  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { level: 1, name: player.nickname }),
  ).toBeVisible();

  const renamed = `${player.nickname}_2`;
  await page.getByLabel("Ник").fill(renamed);
  await page.getByRole("button", { name: "Сохранить ник" }).click();
  await expect(page.getByText("Ник сохранён")).toBeVisible();
  await expect(
    page.getByRole("banner").getByRole("link", { name: renamed }),
  ).toBeVisible();

  await page.getByLabel("Текущий пароль").last().fill("not-my-password");
  await page.getByLabel("Новый пароль", { exact: true }).fill("a new password");
  await page.getByRole("button", { name: "Сменить пароль" }).click();
  await expect(page.getByText("Неверный пароль.")).toBeVisible();

  await page.getByRole("button", { name: "Удалить аккаунт" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Пароль", { exact: true }).fill(player.password);
  await dialog.getByRole("button", { name: "Удалить навсегда" }).click();

  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Войти" }),
  ).toBeVisible();
  const signIn = await page.request.post("/api/auth/sign-in", {
    headers: { origin: baseURL!, "x-forwarded-for": randomIp() },
    data: { email: player.email, password: player.password },
  });
  expect(signIn.status()).toBe(401);
});
