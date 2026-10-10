import { expect, test } from "@playwright/test";
import { findLetter } from "../test/mailpit";
import { newPlayer, randomIp } from "./visitors";

test("a wish has its own page with the studio reply and a picture for links", async ({
  page,
}) => {
  await page.goto("/games/derevnya-slov/wishes");
  await page.getByRole("link", { name: "Режим на время" }).click();

  await expect(page).toHaveURL(
    /\/games\/derevnya-slov\/wishes\/[0-9a-f-]{36}$/,
  );
  await expect(page).toHaveTitle("Режим на время · Деревня Слов · Odium");
  await expect(
    page.getByRole("heading", { level: 1, name: "Режим на время" }),
  ).toBeVisible();
  await expect(
    page.getByText("Звучит отлично — берём в планы на осень!"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Поделиться" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Править" })).toHaveCount(0);

  // Messengers load the page directly: then there is exactly one picture.
  await page.reload();
  const meta = page.locator('meta[property="og:image"]');
  await expect(meta).toHaveCount(1);
  const image = await meta.getAttribute("content");
  const response = await page.request.get(image!);
  expect(response.headers()["content-type"]).toBe("image/png");
});

test("«Поделиться» copies the link even without the Clipboard API", async ({
  page,
}) => {
  // A phone on plain HTTP (the local network) has neither the share sheet
  // nor the clipboard.
  await page.addInitScript(() => {
    for (const name of ["share", "clipboard"]) {
      Object.defineProperty(navigator, name, { value: undefined });
    }
  });
  await page.goto("/games/derevnya-slov/wishes");
  await page.getByRole("link", { name: "Режим на время" }).click();

  await page.getByRole("button", { name: "Поделиться" }).click();
  await expect(page.getByText("Ссылка скопирована")).toBeVisible();
});

test("an unknown or misplaced wish is a 404", async ({ page }) => {
  const response = await page.goto(
    "/games/neon-garden/wishes/00000000-0000-4000-8000-000000000000",
  );
  expect(response?.status()).toBe(404);
});

test("the author edits a fresh wish and deletes it", async ({
  page,
  baseURL,
}) => {
  const player = newPlayer();
  // Desktop and mobile run at once: each edits a title of its own.
  const before = `Сад в облаках ${player.nickname}`;
  const after = `Сад на облаках ${player.nickname}`;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
  await page.request.post("/api/auth/sign-up", {
    headers: { origin: baseURL! },
    data: player,
  });
  const letter = await findLetter(player.email);
  await page.request.get(
    letter.Text.match(/https?:\/\/\S+verify-email\?token=\S+/)![0],
  );
  const created = await page.request.post("/api/games/neon-garden/wishes", {
    headers: { origin: baseURL! },
    data: { type: "add", title: before, body: "Летающие клумбы" },
  });
  const { wish } = await created.json();

  await page.goto(`/games/neon-garden/wishes/${wish.id}`);
  await expect(page.getByText(/Править можно ещё 1[45] минут/)).toBeVisible();
  await page.getByRole("button", { name: "Править" }).click();
  const dialog = page.getByRole("dialog", { name: "Править пожелание" });
  await expect(dialog.getByLabel("Заголовок")).toHaveValue(before);
  await dialog.getByLabel("Заголовок").fill(after);
  await dialog.getByRole("button", { name: "Сохранить" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: after }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Удалить" }).click();
  await page
    .getByRole("dialog", { name: "Удалить пожелание?" })
    .getByRole("button", { name: "Удалить" })
    .click();
  await expect(page).toHaveURL("/games/neon-garden/wishes");
  await expect(page.getByText(after)).toHaveCount(0);
  expect((await page.request.get(`/api/wishes/${wish.id}`)).status()).toBe(404);
});
