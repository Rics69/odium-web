import { expect, test, type Page } from "@playwright/test";
import { countLetters, findLetter } from "../test/mailpit";
import { newPlayer, randomIp } from "./visitors";

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
});

async function fillSignUp(
  page: Page,
  player: { email: string; nickname: string; password: string },
) {
  await page.getByLabel("Почта").fill(player.email);
  await page.getByLabel("Ник").fill(player.nickname);
  await page.getByLabel("Пароль", { exact: true }).fill(player.password);
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
}

test("a player signs up, confirms the email and comes back", async ({
  page,
}) => {
  const player = newPlayer();
  await page.goto("/register?next=/games/neon-garden");
  await fillSignUp(page, player);

  await expect(page).toHaveURL("/verify-email?next=%2Fgames%2Fneon-garden");
  await expect(
    page.getByRole("heading", { level: 1, name: "Почти готово!" }),
  ).toBeVisible();
  await expect(
    page.getByRole("banner").getByRole("link", { name: player.nickname }),
  ).toBeVisible();

  // Elsewhere a reminder stays under the header until the email is confirmed.
  await page.goto("/games");
  const reminder = page.getByText(
    `Подтвердите почту — письмо ушло на ${player.email}.`,
  );
  await expect(reminder).toBeVisible();

  const letter = await findLetter(player.email);
  const link = letter.Text.match(/https?:\/\/\S+verify-email\?token=\S+/)?.[0];
  expect(link).toBeTruthy();
  await page.goto(link!);

  await expect(
    page.getByRole("heading", { level: 1, name: "Почта подтверждена!" }),
  ).toBeVisible();
  await expect(page).toHaveURL("/games/neon-garden", { timeout: 10_000 });
  await expect(reminder).toHaveCount(0);
});

test("the form says what is wrong, field by field", async ({
  page,
  baseURL,
}) => {
  const taken = newPlayer();
  const response = await page.request.post("/api/auth/sign-up", {
    headers: { origin: baseURL!, "x-forwarded-for": randomIp() },
    data: taken,
  });
  expect(response.status()).toBe(201);
  await page.context().clearCookies();

  await page.goto("/register");
  await fillSignUp(page, {
    ...newPlayer(),
    nickname: "Admin",
    password: "short",
  });
  await expect(page.getByText("Этот ник зарезервирован.")).toBeVisible();
  await expect(page.getByText("Пароль — от 8 символов.")).toBeVisible();

  // Only the server knows this one: the same nickname in other letters.
  await fillSignUp(page, {
    ...newPlayer(),
    nickname: taken.nickname.toUpperCase(),
  });
  await expect(page.getByText("Этот ник уже занят.")).toBeVisible();
  await expect(page).toHaveURL("/register");
});

test("an expired link offers a new letter", async ({ page }) => {
  const player = newPlayer();
  await page.goto("/register");
  await fillSignUp(page, player);
  await expect(page).toHaveURL(/\/verify-email/);
  await expect.poll(() => countLetters(player.email)).toBe(1);
  await page.context().clearCookies();

  await page.goto("/verify-email?error=TOKEN_EXPIRED");
  await expect(
    page.getByRole("heading", { level: 1, name: "Ссылка не сработала" }),
  ).toBeVisible();
  await expect(page.getByText("Ссылка устарела")).toBeVisible();
  await page.getByLabel("Почта").fill(player.email);
  await page.getByRole("button", { name: "Отправить письмо ещё раз" }).click();

  await expect(
    page.getByText(`Отправили новое письмо на ${player.email}.`),
  ).toBeVisible();
  await expect.poll(() => countLetters(player.email)).toBe(2);
});
