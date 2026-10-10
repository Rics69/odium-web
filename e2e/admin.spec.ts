import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./admins";
import { newPlayer, randomIp } from "./visitors";

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
});

test("the admin is not there for guests and players", async ({
  page,
  baseURL,
}) => {
  for (const path of ["/admin", "/admin/log"]) {
    expect((await page.goto(path))!.status(), path).toBe(404);
  }
  expect((await page.request.get("/api/admin/wishes")).status()).toBe(401);

  await page.request.post("/api/auth/sign-up", {
    headers: { origin: baseURL! },
    data: newPlayer(),
  });
  for (const path of ["/admin", "/admin/wishes"]) {
    expect((await page.goto(path))!.status(), path).toBe(404);
  }
  await expect(page.getByText("Админка")).toHaveCount(0);
  // 403 for any admin address, real or not.
  expect((await page.request.get("/api/admin/wishes")).status()).toBe(403);
  const post = await page.request.post("/api/admin/wishes/bulk", {
    headers: { origin: baseURL! },
    data: {},
  });
  expect(post.status()).toBe(403);
  expect((await post.json()).error.code).toBe("FORBIDDEN");
});

test("an admin opens the admin from the header and goes through its sections", async ({
  page,
  baseURL,
}) => {
  const { nickname } = await signInAsAdmin(page.request, baseURL!);

  await page.goto("/games");
  await page.getByRole("banner").getByRole("link", { name: "Админка" }).click();
  await expect(page).toHaveURL("/admin");
  await expect(page).toHaveTitle("Обзор · Админка · Odium");
  await expect(
    page.getByRole("heading", { level: 1, name: "Обзор" }),
  ).toBeVisible();
  await expect(page.getByText("Ждут проверки")).toBeVisible();
  // In the menu column on a computer; a phone has no room for it.
  await expect(page.getByText(`Вы вошли как ${nickname}`)).toBeAttached();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );

  const menu = page.getByRole("navigation", { name: "Разделы админки" });
  await expect(menu.getByRole("link")).toHaveCount(7);
  await menu.getByRole("link", { name: "Журнал" }).click();
  await expect(page).toHaveURL("/admin/log");
  await expect(page).toHaveTitle("Журнал · Админка · Odium");
  await expect(menu.getByRole("link", { name: "Журнал" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  const response = await page.request.get("/admin/users");
  expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect((await page.request.get("/api/admin/nothing")).status()).toBe(404);
});
