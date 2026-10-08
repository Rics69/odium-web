import { expect, test, type APIRequestContext } from "@playwright/test";
import { newPlayer, randomIp } from "./visitors";

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
});

async function signUp(request: APIRequestContext, baseURL: string) {
  const player = newPlayer();
  const response = await request.post("/api/auth/sign-up", {
    headers: { origin: baseURL, "x-forwarded-for": randomIp() },
    data: player,
  });
  expect(response.status()).toBe(201);
  return player.nickname;
}

test("a guest sees «Войти» and no profile", async ({ page }) => {
  await page.goto("/");

  const header = page.getByRole("banner");
  await header.getByRole("link", { name: "Войти" }).click();
  await expect(page).toHaveURL("/login");
  await expect(
    page.getByRole("heading", { level: 1, name: "Вход" }),
  ).toBeVisible();

  expect(await (await page.request.get("/api/me")).json()).toEqual({
    user: null,
  });

  await page.goto("/profile");
  await expect(page).toHaveURL("/login?next=%2Fprofile");
});

test("a signed-in player sees their nickname in the header", async ({
  page,
  baseURL,
}) => {
  const nickname = await signUp(page.request, baseURL!);

  const me = await (await page.request.get("/api/me")).json();
  expect(me.user).toMatchObject({
    nickname,
    emailVerified: false,
    role: "user",
  });

  await page.goto("/games");
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Войти" })).toHaveCount(0);
  await header.getByRole("link", { name: nickname }).click();

  await expect(page).toHaveURL("/profile");
  await expect(
    page.getByRole("heading", { level: 1, name: nickname }),
  ).toBeVisible();
});

test("auth routes refuse requests from other sites", async ({ request }) => {
  const response = await request.post("/api/auth/sign-up", {
    headers: { origin: "https://evil.example" },
    data: newPlayer(),
  });

  expect(response.status()).toBe(403);
  expect((await response.json()).error.code).toBe("FORBIDDEN");
});
