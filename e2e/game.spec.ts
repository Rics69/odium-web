import { expect, test } from "@playwright/test";

test("a game page shows the game, its facts and metadata", async ({
  page,
  request,
}) => {
  await page.goto("/games/neon-garden");

  await expect(page).toHaveTitle("Неоновый сад · Odium");
  await expect(
    page.getByRole("heading", { level: 1, name: "Неоновый сад" }),
  ).toBeVisible();
  await expect(page.getByText("15 июня 2026 г.")).toBeVisible();
  await expect(page.getByText("Скоро в Google Play")).toBeVisible();
  await expect(page.getByText("Скоро в RuStore")).toBeVisible();

  const jsonLd = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      "{}",
  );
  expect(jsonLd).toMatchObject({ "@type": "VideoGame", name: "Неоновый сад" });

  const ogImage = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  const image = await request.get(ogImage!);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");
});

test("screenshots open full screen and change with the arrow keys", async ({
  page,
}) => {
  await page.goto("/games/derevnya-slov");
  await page.getByRole("button", { name: "Открыть скриншот 1 из 3" }).click();

  const viewer = page.getByRole("dialog", { name: "Скриншоты «Деревня Слов»" });
  await expect(viewer).toBeVisible();
  await expect(viewer.getByText("1 из 3")).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(viewer.getByText("2 из 3")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(viewer.getByText("3 из 3")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
});

test("the trailer player loads only after the press", async ({ page }) => {
  await page.goto("/games/neon-garden");
  await expect(page.locator("iframe")).toHaveCount(0);

  await page
    .getByRole("button", { name: "Смотреть трейлер «Неоновый сад»" })
    .click();

  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1&rel=0",
  );
});

test("«Оставить пожелание» leads to the game's wish board", async ({
  page,
}) => {
  await page.goto("/games/derevnya-slov");
  await page.getByRole("link", { name: "Оставить пожелание" }).first().click();

  await expect(page).toHaveURL("/games/derevnya-slov/wishes");
  await expect(
    page.getByRole("heading", { level: 1, name: "Доска пожеланий" }),
  ).toBeVisible();
});
