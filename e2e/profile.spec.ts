import { expect, test } from "@playwright/test";
import { findLetter } from "../test/mailpit";
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

test("«Мои пожелания» in the profile lists the player's wishes", async ({
  page,
  baseURL,
}) => {
  const guest = await page.request.get("/api/me/wishes");
  expect(guest.status()).toBe(401);

  const player = newPlayer();
  await page.request.post("/api/auth/sign-up", {
    headers: { origin: baseURL! },
    data: player,
  });
  const letter = await findLetter(player.email);
  await page.request.get(
    letter.Text.match(/https?:\/\/\S+verify-email\?token=\S+/)![0],
  );

  await page.goto("/profile");
  await expect(page.getByText("Вы пока ничего не предлагали")).toBeVisible();

  const created = await page.request.post("/api/games/neon-garden/wishes", {
    headers: { origin: baseURL! },
    data: { type: "add", title: "Светлячки над прудом", body: "" },
  });
  expect(created.status()).toBe(201);
  const { wishes } = (await (
    await page.request.get("/api/me/wishes")
  ).json()) as { wishes: { title: string; game: { slug: string } }[] };
  expect(wishes).toMatchObject([
    { title: "Светлячки над прудом", game: { slug: "neon-garden" } },
  ]);

  await page.reload();
  const row = page.getByRole("listitem").filter({ hasText: "Светлячки" });
  await expect(row.getByText("Неоновый сад")).toBeVisible();
  await expect(row.getByText("1 голос")).toBeVisible();
  await row.getByRole("link", { name: "Светлячки над прудом" }).click();
  await expect(page).toHaveURL(/\/games\/neon-garden\/wishes\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Светлячки над прудом" }),
  ).toBeVisible();
});
