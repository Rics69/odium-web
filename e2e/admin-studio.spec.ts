import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./admins";
import { confirmedPlayer } from "./players";
import { randomIp } from "./visitors";

test.beforeEach(async ({ page, baseURL }) => {
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
  await signInAsAdmin(page.request, baseURL!);
});

// «О студии» is shared by every test: here only what saves nothing.
test("«О студии» shows the saved texts and refuses a wrong link", async ({
  page,
}) => {
  await page.goto("/admin/studio");
  await expect(page.getByLabel("Слоган")).toHaveValue(
    "Делаем игры. Копим на игру мечты.",
  );
  await expect(page.getByLabel("Роль")).toHaveCount(3);

  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText("Изменений нет")).toBeVisible();

  await page.getByRole("button", { name: "Добавить ссылку" }).click();
  await page.getByLabel("Название").last().fill("VK");
  await page.getByLabel("Ссылка").last().fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(
    page.getByText("Ссылка должна начинаться с https://"),
  ).toBeVisible();
});

test("a stop word added in the admin hides a new wish for review", async ({
  page,
  playwright,
  baseURL,
}, testInfo) => {
  // The list is saved whole: desktop and phone at once would drop each
  // other's word. The form is the same on both.
  test.skip(testInfo.project.name === "mobile", "one shared list");
  const word = `стопслово${randomBytes(3).toString("hex")}`;
  await page.goto("/admin/lists");
  const words = page.getByRole("textbox", {
    name: "Стоп-слова",
    exact: true,
  });
  await words.fill(word.toUpperCase());
  await page.getByRole("button", { name: "Сохранить" }).first().click();
  await expect(
    page.getByText("Сохранено: добавлено 1, убрано 0"),
  ).toBeVisible();
  await expect(words).toHaveValue(word);

  const player = await confirmedPlayer(playwright, baseURL!);
  const created = await player.request.post("/api/games/neon-garden/wishes", {
    data: { type: "add", title: `Добавьте ${word} в игру`, body: "" },
  });
  expect((await created.json()).wish).toMatchObject({ hidden: true });

  await words.fill("");
  await page.getByRole("button", { name: "Сохранить" }).first().click();
  await expect(
    page.getByText("Сохранено: добавлено 0, убрано 1"),
  ).toBeVisible();
  await player.request.dispose();
});
