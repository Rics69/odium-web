import { expect, test } from "@playwright/test";
import { findLetter } from "../test/mailpit";
import { signInAsAdmin } from "./admins";
import { newPlayer, randomIp } from "./visitors";

test("an admin declines with a reply, hides with a reason and deletes", async ({
  page,
  playwright,
  baseURL,
}) => {
  // The author: a confirmed player with a wish of their own.
  const author = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { origin: baseURL!, "x-forwarded-for": randomIp() },
  });
  const player = newPlayer();
  await author.post("/api/auth/sign-up", { data: player });
  const letter = await findLetter(player.email);
  await author.get(
    letter.Text.match(/https?:\/\/\S+verify-email\?token=\S+/)![0],
  );
  const title = `Модерация ${player.nickname}`;
  const created = await author.post("/api/games/neon-garden/wishes", {
    data: { type: "add", title, body: "Проверка админки" },
  });
  const { wish } = await created.json();

  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
  await signInAsAdmin(page.request, baseURL!);
  await page.goto(`/admin/wishes?q=${encodeURIComponent(player.nickname)}`);
  const row = page.getByRole("listitem").filter({ hasText: title });
  await expect(row).toBeVisible();

  // Declined needs the studio's reply.
  await row.getByRole("button", { name: title }).click();
  const editor = page.getByRole("dialog", { name: "Пожелание" });
  await editor.getByLabel("Статус").selectOption("declined");
  await editor.getByRole("button", { name: "Сохранить" }).click();
  await expect(editor.getByText(/Для «Отклонено» нужен ответ/)).toBeVisible();
  await editor.getByLabel("Ответ студии").fill("Не подходит к духу игры.");
  await editor.getByRole("button", { name: "Сохранить" }).click();
  await expect(editor).toBeHidden();
  await expect(row.getByText("Отклонено")).toBeVisible();
  await expect(row.getByText("Ответ Odium")).toBeVisible();

  // Hidden with a reason: gone for guests, the author sees why.
  await row.getByRole("button", { name: title }).click();
  await editor.getByLabel("Видимость").selectOption("hidden");
  await editor.getByLabel("Причина").selectOption("off_topic");
  await editor.getByRole("button", { name: "Сохранить" }).click();
  await expect(row.getByText("Скрыто: не по теме")).toBeVisible();
  const mine = await (await author.get("/api/me/wishes")).json();
  expect(mine.wishes[0]).toMatchObject({
    title,
    status: "declined",
    hidden: true,
    hiddenReason: "off_topic",
    studioReply: "Не подходит к духу игры.",
  });
  const guest = await playwright.request.newContext({ baseURL });
  expect((await guest.get(`/api/wishes/${wish.id}`)).status()).toBe(404);

  // Deleted in bulk, after a confirmation.
  await page.getByLabel("Выбрать все на странице").check();
  await page.getByLabel("Действие").selectOption("delete");
  await page.getByRole("button", { name: "Применить" }).click();
  await page
    .getByRole("dialog", { name: "Удалить выбранные пожелания?" })
    .getByRole("button", { name: "Удалить" })
    .click();
  await expect(page.getByText("Ничего не нашлось")).toBeVisible();
  expect((await (await author.get("/api/me/wishes")).json()).wishes).toEqual(
    [],
  );

  await author.dispose();
  await guest.dispose();
});
