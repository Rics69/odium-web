import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./admins";
import { confirmedPlayer } from "./players";
import { randomIp } from "./visitors";

test("every admin action is in the journal, with who, what and the change", async ({
  page,
  playwright,
  baseURL,
}) => {
  const player = await confirmedPlayer(playwright, baseURL!);
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
  const admin = await signInAsAdmin(page.request, baseURL!);
  const { users } = await (
    await page.request.get(`/api/admin/users?q=${player.email}`)
  ).json();
  const id = users[0].id as string;
  const ban = await page.request.post(`/api/admin/users/${id}/ban`, {
    headers: { origin: baseURL! },
    data: { duration: "7d", reason: "Флуд в пожеланиях" },
  });
  expect(ban.ok()).toBe(true);
  await page.request.patch(`/api/admin/users/${id}/role`, {
    headers: { origin: baseURL! },
    data: { role: "admin" },
  });

  // From the player's card to the journal of this player only.
  await page.goto(`/admin/users/${id}`);
  await page.getByRole("link", { name: "Весь журнал по игроку" }).click();
  await expect(page).toHaveURL(`/admin/log?type=user&target=${id}`);
  const entries = page.getByRole("main").getByRole("listitem");
  await expect(entries).toHaveCount(1);
  const entry = entries.first();
  await expect(entry.getByText("Бан", { exact: true })).toBeVisible();
  await expect(
    entry.getByRole("link", { name: player.nickname }),
  ).toBeVisible();
  await expect(entry.getByText(admin.nickname)).toBeVisible();
  await expect(entry.getByText("Причина: Флуд в пожеланиях")).toBeVisible();
  // The change, in words: banned before — no, after — yes, for 7 days.
  await expect(entry.getByRole("row", { name: /^забанен/ })).toHaveText(
    /забанен\s*нет\s*да/,
  );
  await expect(entry.getByRole("cell", { name: "7 дней" })).toBeVisible();

  // The refused role change left no trace: a banned player is not promoted.
  await page.goto(`/admin/log?type=user&target=${id}&action=user.role`);
  await expect(page.getByText("Записей нет")).toBeVisible();

  // A guest and a player have no journal.
  expect((await player.request.get("/api/admin/log")).status()).toBe(401);
  await player.request.dispose();
});
