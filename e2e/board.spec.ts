import { expect, test, type Page } from "@playwright/test";

// The seeded board of «Деревня Слов» (scripts/seed-data.ts): five active
// wishes, a done and a declined one, two hidden.
const popular = [
  "Режим на время",
  "Ежедневное задание",
  "Подсказка по первой букве",
  "Реклама после каждого уровня",
  "Таймер на уровнях",
  "Таблица рекордов",
  "Тёмная тема",
];
const titles = (page: Page) =>
  page
    .getByRole("main")
    .getByRole("article")
    .getByRole("heading", { level: 3 });

test("the board shows every visible wish, most popular first", async ({
  page,
}) => {
  await page.goto("/games/derevnya-slov/wishes");

  await expect(titles(page)).toHaveText(popular);
  const first = page.getByRole("article").first();
  await expect(first.getByText("Запланировано")).toBeVisible();
  await expect(first.getByText("Ответ Odium")).toBeVisible();
  await expect(
    first.getByRole("button", { name: /Голос за «Режим на время»: 5 голосов/ }),
  ).toHaveAttribute("aria-pressed", "false");
  // Done and declined stay on the board, their voting closed.
  await expect(
    page.getByRole("button", { name: /Голос за «Ежедневное задание»/ }),
  ).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByText("Удалённый пользователь")).toBeVisible();
  await expect(page.getByText("Купить монеты")).toHaveCount(0);
  // Only the sort: no filters and no search (the owner's choice).
  await expect(page.getByRole("searchbox")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Тип" })).toHaveCount(0);
});

test("the sort lives in the address and survives a reload", async ({
  page,
}) => {
  await page.goto("/games/derevnya-slov/wishes");
  const sorts = page.getByRole("group", { name: "Сортировка" });
  await expect(sorts.getByRole("radio")).toHaveCount(3);

  await sorts.getByText("Новые").click();
  await expect(page).toHaveURL(/sort=new/);
  await expect(titles(page).first()).toHaveText("Тёмная тема");

  await sorts.getByText("Старые").click();
  await expect(page).toHaveURL(/sort=old/);
  await page.reload();
  await expect(titles(page).first()).toHaveText("Ежедневное задание");
  await expect(titles(page)).toHaveCount(7);
});

test("a guest who votes is asked to sign in and comes back", async ({
  page,
}) => {
  await page.goto("/games/derevnya-slov/wishes?sort=new");

  await page.getByRole("button", { name: /Голос за «Тёмная тема»/ }).click();
  const dialog = page.getByRole("dialog", {
    name: "Войдите, чтобы голосовать и предлагать идеи",
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Зарегистрироваться" }),
  ).toHaveAttribute(
    "href",
    "/register?next=%2Fgames%2Fderevnya-slov%2Fwishes%3Fsort%3Dnew",
  );
  await dialog.getByRole("link", { name: "Войти" }).click();
  await expect(page).toHaveURL(
    "/login?next=%2Fgames%2Fderevnya-slov%2Fwishes%3Fsort%3Dnew",
  );
});

test("the board API pages through with a cursor", async ({ request }) => {
  const first = await (
    await request.get("/api/games/derevnya-slov/wishes")
  ).json();
  expect(first.wishes).toHaveLength(7);
  expect(first.nextCursor).toBeNull();

  const bad = await request.get(
    "/api/games/derevnya-slov/wishes?sort=sideways",
  );
  expect(bad.status()).toBe(400);
});
