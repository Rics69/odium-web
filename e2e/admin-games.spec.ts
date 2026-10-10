import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { signInAsAdmin } from "./admins";
import { randomIp } from "./visitors";

test("an admin creates a game with a cover, publishes it and deletes it", async ({
  page,
  baseURL,
}) => {
  const tag = randomBytes(3).toString("hex");
  const slug = `igra-${tag}`;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
  await signInAsAdmin(page.request, baseURL!);

  await page.goto("/admin/games");
  await page.getByRole("link", { name: "Новая игра" }).click();
  await page.getByLabel("Название").fill(`Игра ${tag}`);
  // The address follows the title, in Latin letters.
  await expect(page.getByLabel("Адрес", { exact: true })).toHaveValue(slug);
  await page.getByLabel("Подзаголовок").fill("Проверка формы");
  await page.getByLabel("Описание").fill("**Жирно** и коротко.");
  await page.getByText("Предпросмотр").click();
  await expect(page.locator(".markdown strong")).toHaveText("Жирно");

  const cover = await sharp({
    create: { width: 320, height: 180, channels: 3, background: "#2d46e6" },
  })
    .png()
    .toBuffer();
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: cover });
  await expect(page.getByRole("img", { name: "Обложка" })).toBeVisible();

  await page.getByLabel("Трейлер").fill("https://vimeo.com/1");
  await page.getByRole("button", { name: "Добавить стор" }).click();
  await page.getByLabel("Ссылка на стор").fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(
    page.getByText("Нужна ссылка на видео YouTube или VK Video."),
  ).toBeVisible();
  await expect(
    page.getByText("Ссылка должна начинаться с https://"),
  ).toBeVisible();
  await page.getByLabel("Трейлер").fill("");
  await page
    .getByLabel("Ссылка на стор")
    .fill("https://play.google.com/store/apps/details?id=odium.test");
  await page.getByText("Опубликована", { exact: true }).click();
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText("Игра создана")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/games\/[0-9a-f-]{36}$/);

  // On the site at once: the catalogue, the page, the cover, the store.
  const catalogue = await (await page.request.get("/api/games")).json();
  expect(catalogue.games.map((game: { slug: string }) => game.slug)).toContain(
    slug,
  );
  const game = await page.context().newPage();
  await game.goto(`/games/${slug}`);
  await expect(
    game.getByRole("heading", { level: 1, name: `Игра ${tag}` }),
  ).toBeVisible();
  await expect(game.getByRole("link", { name: /Google Play/ })).toHaveAttribute(
    "href",
    "https://play.google.com/store/apps/details?id=odium.test",
  );
  await expect(
    game.getByRole("img", { name: `Обложка игры «Игра ${tag}»` }),
  ).toBeVisible();
  await game.close();

  await page.getByRole("button", { name: "Удалить игру" }).click();
  await page
    .getByRole("dialog", { name: `Удалить «Игра ${tag}»?` })
    .getByRole("button", { name: "Удалить игру" })
    .click();
  await expect(page).toHaveURL("/admin/games");
  expect((await page.request.get(`/games/${slug}`)).status()).toBe(404);
});

test("a game with wishes cannot be deleted, only taken off the site", async ({
  page,
  baseURL,
}) => {
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
  await signInAsAdmin(page.request, baseURL!);
  await page.goto("/admin/games");
  await page.getByRole("link", { name: /Неоновый сад/ }).click();

  await expect(
    page.getByText("У игры есть пожелания — удалить её нельзя."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Удалить игру" })).toHaveCount(
    0,
  );
  const games = (await (await page.request.get("/api/admin/games")).json())
    .games as { id: string; slug: string }[];
  const garden = games.find((game) => game.slug === "neon-garden")!;
  const refused = await page.request.delete(`/api/admin/games/${garden.id}`, {
    headers: { origin: baseURL! },
  });
  expect(refused.status()).toBe(409);
});
