import { expect, test } from "@playwright/test";
import { findLetter } from "../test/mailpit";
import { newPlayer, randomIp } from "./visitors";

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
});

test("a player who forgot the password sets a new one by the letter", async ({
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

  await page.goto("/login");
  await page.getByRole("link", { name: "Забыли пароль?" }).click();
  await expect(page).toHaveURL("/forgot-password");
  await page.getByLabel("Почта").fill(player.email);
  await page.getByRole("button", { name: "Прислать ссылку" }).click();
  await expect(
    page.getByText("Если такой адрес зарегистрирован, мы отправили"),
  ).toBeVisible();

  const letter = await findLetter(player.email, "Новый пароль для Odium");
  const link = letter.Text.match(/https?:\/\/\S+\/reset-password\/\S+/)?.[0];
  expect(link).toBeTruthy();
  await page.goto(link!);
  await expect(page).toHaveURL(/\/reset-password\?token=/);

  const newPassword = `${player.password}-new`;
  await page.getByLabel("Новый пароль", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Сохранить пароль" }).click();
  await expect(
    page.getByRole("heading", { name: "Пароль изменён" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Войти" }).last().click();
  await expect(page).toHaveURL("/login");
  await page.getByLabel("Почта").fill(player.email);
  await page.getByLabel("Пароль", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("banner").getByRole("link", { name: player.nickname }),
  ).toBeVisible();
});

test("a used or broken link leads to a new one", async ({ page }) => {
  await page.goto("/reset-password?error=INVALID_TOKEN");

  await expect(
    page.getByRole("heading", { level: 1, name: "Ссылка не сработала" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Запросить новую ссылку" }).click();
  await expect(page).toHaveURL("/forgot-password");
});
