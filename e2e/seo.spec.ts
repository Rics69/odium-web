import { expect, test } from "@playwright/test";

test("robots.txt closes the admin, the profile and the API", async ({
  request,
  baseURL,
}) => {
  const text = await (await request.get("/robots.txt")).text();
  expect(text).toContain("Allow: /");
  for (const path of ["/admin", "/profile", "/api/"]) {
    expect(text).toContain(`Disallow: ${path}`);
  }
  expect(text).toContain(`Sitemap: ${baseURL}/sitemap.xml`);
});

test("the sitemap lists published games, their boards and visible wishes", async ({
  request,
  baseURL,
}) => {
  const response = await request.get("/sitemap.xml");
  expect(response.headers()["content-type"]).toContain("xml");
  const xml = await response.text();
  for (const path of [
    "/",
    "/games",
    "/games/derevnya-slov",
    "/games/derevnya-slov/wishes",
    "/games/neon-garden",
  ]) {
    expect(xml, path).toContain(`<loc>${new URL(path, baseURL)}</loc>`);
  }
  expect(xml).not.toContain("secret-project");

  // Every wish of the board is there; hidden ones are not on the board.
  const board = await (
    await request.get("/api/games/derevnya-slov/wishes")
  ).json();
  for (const wish of board.wishes as { id: string }[]) {
    expect(xml).toContain(`/games/derevnya-slov/wishes/${wish.id}`);
  }
  const wishes = xml.match(/\/games\/derevnya-slov\/wishes\/[0-9a-f-]{36}/g);
  expect(wishes).toHaveLength(board.wishes.length);
});

test("pages have their own title, description and canonical address", async ({
  page,
  baseURL,
}) => {
  const canonical = () =>
    page.locator('link[rel="canonical"]').getAttribute("href");

  await page.goto("/");
  await expect(page).toHaveTitle("Odium — делаем игры, копим на игру мечты");
  expect(await canonical()).toBe(baseURL);

  await page.goto("/games/derevnya-slov/wishes?sort=new");
  await expect(page).toHaveTitle("Доска пожеланий · Деревня Слов · Odium");
  expect(await canonical()).toBe(`${baseURL}/games/derevnya-slov/wishes`);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /Пожелания игроков к «Деревня Слов»/,
  );
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
    "content",
    "Odium",
  );

  // Sign-in pages are not for search engines.
  for (const path of ["/login", "/register", "/forgot-password"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute(
      "content",
      "noindex, follow",
    );
  }
});
