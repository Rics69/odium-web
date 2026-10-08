import { randomBytes } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";

// Sign-up arrives as a page in step 2.4; until then accounts are made
// through the Better Auth API, as the page will do.
async function signUp(request: APIRequestContext, baseURL: string) {
  const nickname = `Pixel_${randomBytes(4).toString("hex")}`;
  const response = await request.post("/api/auth/sign-up/email", {
    headers: { origin: baseURL },
    data: {
      name: nickname,
      email: `${nickname.toLowerCase()}@example.com`,
      password: randomBytes(12).toString("hex"),
    },
  });
  expect(response.status()).toBe(200);
  return nickname;
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
  await expect(page).toHaveURL("/login");
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
  const response = await request.post("/api/auth/sign-up/email", {
    headers: { origin: "https://evil.example" },
    data: {
      name: "Evil_Twin",
      email: "evil@example.com",
      password: "evil-password-123",
    },
  });

  expect(response.status()).toBe(403);
  expect((await response.json()).error.code).toBe("FORBIDDEN");
});
