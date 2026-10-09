import { expect, test } from "@playwright/test";
import { findLetter } from "../test/mailpit";
import { newPlayer, randomIp } from "./visitors";

test("a confirmed player sees similar wishes, fixes a mistake and posts a wish", async ({
  page,
  baseURL,
}) => {
  const player = newPlayer();
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
  await page.request.post("/api/auth/sign-up", {
    headers: { origin: baseURL! },
    data: player,
  });
  const letter = await findLetter(player.email);
  await page.request.get(
    letter.Text.match(/https?:\/\/\S+verify-email\?token=\S+/)![0],
  );

  // «Неоновый сад»: the board tests count «Деревня Слов» exactly.
  await page.goto("/games/neon-garden/wishes?sort=new");
  await page.getByRole("button", { name: "Новое пожелание" }).click();
  const dialog = page.getByRole("dialog", { name: "Новое пожелание" });

  await dialog.getByLabel("Заголовок").fill("Больше видов светящихся цветов");
  await expect(
    dialog.getByText("Может, проголосуете за уже существующее?"),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: /Голос за «Больше видов цветов»/ }),
  ).toBeVisible();

  await dialog.getByLabel("Заголовок").fill("Да");
  await dialog.getByRole("button", { name: "Опубликовать" }).click();
  await expect(dialog.getByText("Заголовок — от 5 символов.")).toBeVisible();

  await dialog.getByLabel("Заголовок").fill("Ночной полив под луной");
  await dialog
    .getByLabel("Описание")
    .fill("Чтобы добавлять слова\nиз любимых книг.");
  await dialog.getByRole("button", { name: "Опубликовать" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText("Пожелание опубликовано")).toBeVisible();
  const first = page.getByRole("main").getByRole("article").first();
  await expect(first.getByRole("heading")).toHaveText("Ночной полив под луной");
  await expect(
    first.getByRole("button", { name: /Голос за «Ночной полив под луной»/ }),
  ).toHaveAttribute("aria-pressed", "true");

  // The same wish again is refused at the title.
  await page.getByRole("button", { name: "Новое пожелание" }).click();
  await dialog.getByLabel("Заголовок").fill("НОЧНОЙ ПОЛИВ под луной");
  await dialog.getByRole("button", { name: "Опубликовать" }).click();
  await expect(
    dialog.getByText("У вас уже есть такое пожелание к этой игре."),
  ).toBeVisible();
});
