import { expect, test } from "@playwright/test";

test("the site has its icon and a link picture on every page", async ({
  page,
  request,
}) => {
  for (const [path, type] of [
    ["/favicon.ico", "image/x-icon"],
    ["/icon.svg", "image/svg+xml"],
    ["/apple-icon.png", "image/png"],
  ]) {
    const response = await request.get(path!);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"], path).toBe(type);
  }

  await page.goto("/login");
  await expect(page.locator('link[rel="icon"]')).toHaveCount(2);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  // A page without a picture of its own gets the studio's one.
  const image = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(new URL(image!).pathname).toBe("/opengraph-image");
  const picture = await request.get(image!);
  expect(picture.headers()["content-type"]).toBe("image/png");
  expect((await picture.body()).length).toBeGreaterThan(10_000);
});
