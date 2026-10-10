import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./admins";
import { confirmedPlayer } from "./players";
import { randomIp } from "./visitors";

test("an admin bans a spammer with the wipe, unbans and makes an admin", async ({
  page,
  playwright,
  baseURL,
}) => {
  const spammer = await confirmedPlayer(playwright, baseURL!);
  const created = await spammer.request.post("/api/games/neon-garden/wishes", {
    data: {
      type: "add",
      title: `Дешёвые монеты ${spammer.nickname}`,
      body: "",
    },
  });
  const { wish } = await created.json();
  // An honest player's wish the spammer pushes up.
  const honest = await confirmedPlayer(playwright, baseURL!);
  const other = (
    await (
      await honest.request.post("/api/games/neon-garden/wishes", {
        data: { type: "add", title: `Честное ${honest.nickname}`, body: "" },
      })
    ).json()
  ).wish as { id: string };
  await spammer.request.put(`/api/wishes/${other.id}/vote`);

  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
  await signInAsAdmin(page.request, baseURL!);
  await page.goto(`/admin/users?q=${spammer.email}`);
  await page.getByRole("link", { name: new RegExp(spammer.nickname) }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: spammer.nickname }),
  ).toBeVisible();

  await page.getByLabel("Срок").selectOption("30d");
  await page.getByRole("button", { name: "Забанить" }).click();
  await expect(
    page.getByText("Укажите причину — её увидит игрок."),
  ).toBeVisible();
  await page.getByLabel("Причина").fill("Реклама монет");
  await page.getByLabel("Скрыть все пожелания и аннулировать голоса").check();
  await page.getByRole("button", { name: "Забанить" }).click();
  await page
    .getByRole("dialog", { name: `Забанить ${spammer.nickname}?` })
    .getByRole("button", { name: "Забанить" })
    .click();

  await expect(
    page.getByText(/Забанен до .*Причина: Реклама монет/).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Скрыто пожеланий: 1, снято голосов: 2."),
  ).toBeVisible();
  // Signed out at once, and told why at the door.
  expect((await (await spammer.request.get("/api/me")).json()).user).toBeNull();
  const signIn = await spammer.request.post("/api/auth/sign-in", {
    data: { email: spammer.email, password: spammer.password },
  });
  expect(signIn.status()).toBe(403);
  expect((await signIn.json()).error.message).toContain("Реклама монет");
  const guest = await playwright.request.newContext({ baseURL });
  expect((await guest.get(`/api/wishes/${wish.id}`)).status()).toBe(404);
  const after = await (await guest.get(`/api/wishes/${other.id}`)).json();
  expect(after.wish.votesCount).toBe(1);

  await page.getByRole("button", { name: "Разбанить" }).click();
  await page
    .getByRole("dialog", { name: "Разбанить" })
    .getByRole("button", { name: "Разбанить" })
    .click();
  await expect(page.getByText("Бан снят")).toBeVisible();

  await page.getByRole("button", { name: "Сделать админом" }).click();
  await page
    .getByRole("dialog", { name: `Сделать ${spammer.nickname} админом?` })
    .getByRole("button", { name: "Сделать админом" })
    .click();
  await expect(page.getByText("Админ: видит всю админку")).toBeVisible();
  // An admin cannot be banned; the role must go first.
  await expect(
    page.getByText("Админа забанить нельзя — сначала снимите роль."),
  ).toBeVisible();

  await spammer.request.post("/api/auth/sign-in", {
    data: { email: spammer.email, password: spammer.password },
  });
  expect((await spammer.request.get("/api/admin/users")).status()).toBe(200);

  await spammer.request.dispose();
  await honest.request.dispose();
  await guest.dispose();
});
