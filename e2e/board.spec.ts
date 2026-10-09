import { expect, test, type Page } from "@playwright/test";

// The seeded board of «Деревня Слов» (scripts/seed-data.ts): five active
// wishes, a done and a declined one, two hidden.
const titles = (page: Page) =>
  page
    .getByRole("main")
    .getByRole("article")
    .getByRole("heading", { level: 3 });

test("the board shows active wishes, most popular first", async ({ page }) => {
  await page.goto("/games/derevnya-slov/wishes");

  await expect(titles(page)).toHaveText([
    "Режим на время",
    "Подсказка по первой букве",
    "Таймер на уровнях",
    "Таблица рекордов",
    "Тёмная тема",
  ]);
  const first = page.getByRole("article").first();
  await expect(first.getByText("Запланировано")).toBeVisible();
  await expect(first.getByText("Ответ Odium")).toBeVisible();
  await expect(
    first.getByRole("button", { name: /Голос за «Режим на время»: 5 голосов/ }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("Удалённый пользователь")).toBeVisible();
  await expect(page.getByText("Купить монеты")).toHaveCount(0);
});

test("choices live in the address and survive a reload", async ({ page }) => {
  await page.goto("/games/derevnya-slov/wishes");

  await page
    .getByRole("group", { name: "Сортировка" })
    .getByText("Новые")
    .click();
  await expect(page).toHaveURL(/sort=new/);
  await expect(titles(page).first()).toHaveText("Тёмная тема");

  await page.getByRole("group", { name: "Тип" }).getByText("Убрать").click();
  await expect(page).toHaveURL(/type=remove/);
  await expect(titles(page)).toHaveText(["Таймер на уровнях"]);

  await page.getByLabel("Статус").selectOption("all");
  await expect(page).toHaveURL(/status=all/);
  await expect(titles(page)).toHaveText([
    "Таймер на уровнях",
    "Реклама после каждого уровня",
  ]);

  await page.reload();
  await expect(titles(page)).toHaveCount(2);

  await page
    .getByRole("searchbox", { name: "Поиск по пожеланиям" })
    .fill("таймер");
  await expect(page).toHaveURL(/q=/);
  await expect(titles(page)).toHaveText(["Таймер на уровнях"]);

  await page
    .getByRole("searchbox", { name: "Поиск по пожеланиям" })
    .fill("нет такого");
  await expect(page.getByText("Ничего не нашлось")).toBeVisible();
  await page.getByRole("button", { name: "Сбросить фильтры" }).click();
  await expect(titles(page)).toHaveCount(5);
});

test("a guest who votes is sent to sign in and back", async ({ page }) => {
  await page.goto("/games/derevnya-slov/wishes?sort=new");

  await page.getByRole("button", { name: /Голос за «Тёмная тема»/ }).click();

  await expect(page).toHaveURL(
    "/login?next=%2Fgames%2Fderevnya-slov%2Fwishes%3Fsort%3Dnew",
  );
});

test("the board API pages through with a cursor", async ({ request }) => {
  const first = await (
    await request.get("/api/games/derevnya-slov/wishes?status=all")
  ).json();
  expect(first.wishes).toHaveLength(7);
  expect(first.nextCursor).toBeNull();

  const bad = await request.get(
    "/api/games/derevnya-slov/wishes?sort=sideways",
  );
  expect(bad.status()).toBe(400);
});
