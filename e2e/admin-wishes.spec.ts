import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./admins";
import { confirmedPlayer } from "./players";
import { randomIp } from "./visitors";

test("an admin declines with a reply, hides with a reason and deletes", async ({
  page,
  playwright,
  baseURL,
}) => {
  // The author: a confirmed player with a wish of their own.
  const player = await confirmedPlayer(playwright, baseURL!);
  const author = player.request;
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

test("an admin merges a duplicate into its original", async ({
  page,
  playwright,
  baseURL,
}) => {
  const first = await confirmedPlayer(playwright, baseURL!);
  const second = await confirmedPlayer(playwright, baseURL!);
  const third = await confirmedPlayer(playwright, baseURL!);
  const tag = first.nickname;
  const post = async (
    player: typeof first,
    title: string,
  ): Promise<{ id: string }> =>
    (
      await (
        await player.request.post("/api/games/neon-garden/wishes", {
          data: { type: "add", title, body: "" },
        })
      ).json()
    ).wish;
  const original = await post(first, `Светлячки над прудом ${tag}`);
  const duplicate = await post(second, `Светлячки у пруда ${tag}`);
  // The second author votes for both: one vote of theirs stays.
  await second.request.put(`/api/wishes/${original.id}/vote`);
  await third.request.put(`/api/wishes/${duplicate.id}/vote`);

  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
  await signInAsAdmin(page.request, baseURL!);
  await page.goto(`/admin/wishes?q=${encodeURIComponent(tag)}`);
  const duplicateRow = page
    .getByRole("listitem")
    .filter({ hasText: `Светлячки у пруда ${tag}` });
  await duplicateRow
    .getByRole("button", { name: `Светлячки у пруда ${tag}` })
    .click();
  const editor = page.getByRole("dialog", { name: "Пожелание" });
  await editor.getByText("Объединить с оригиналом").click();
  const candidate = editor
    .getByRole("listitem")
    .filter({ hasText: `Светлячки над прудом ${tag}` });
  await candidate.getByRole("button", { name: "Объединить" }).click();
  await page
    .getByRole("dialog", { name: /Объединить с «Светлячки над прудом/ })
    .getByRole("button", { name: "Объединить" })
    .click();

  await expect(
    page.getByText("Объединено. Перенесено голосов: 1"),
  ).toBeVisible();
  await expect(duplicateRow.getByText("Скрыто: дубль")).toBeVisible();
  await expect(
    page
      .getByRole("listitem")
      .filter({ hasText: `Светлячки над прудом ${tag}` })
      .getByText("3 голоса"),
  ).toBeVisible();

  // The duplicate's address leads everyone else to the original; its
  // author sees where the votes went.
  const guest = await playwright.request.newContext({ baseURL });
  const redirected = await guest.get(
    `/games/neon-garden/wishes/${duplicate.id}`,
    { maxRedirects: 0 },
  );
  expect(redirected.status()).toBe(307);
  expect(redirected.headers().location).toBe(
    `/games/neon-garden/wishes/${original.id}`,
  );
  const seen = await (
    await second.request.get(`/api/wishes/${duplicate.id}`)
  ).json();
  expect(seen.wish).toMatchObject({
    hidden: true,
    hiddenReason: "duplicate",
    mergedInto: { id: original.id },
  });

  for (const player of [first, second, third]) await player.request.dispose();
  await guest.dispose();
});
