import { expect, test } from "@playwright/test";

test("GET /api/games lists the published games", async ({ request }) => {
  const response = await request.get("/api/games");

  expect(response.status()).toBe(200);
  const { games } = await response.json();
  // The admin tests publish games of their own for a moment.
  const slugs = games.map((game: { slug: string }) => game.slug);
  expect(slugs).toEqual(
    expect.arrayContaining(["derevnya-slov", "neon-garden"]),
  );
  expect(slugs).not.toContain("secret-project");
  expect(slugs.indexOf("derevnya-slov")).toBeLessThan(
    slugs.indexOf("neon-garden"),
  );
  expect(
    games.find((game: { slug: string }) => game.slug === "derevnya-slov"),
  ).toMatchObject({
    title: "Деревня Слов",
    status: "in_development",
    wishesCount: 7,
  });
});

test("GET /api/games/:slug gives one game", async ({ request }) => {
  const response = await request.get("/api/games/neon-garden");

  expect(response.status()).toBe(200);
  expect((await response.json()).game).toMatchObject({
    slug: "neon-garden",
    title: "Неоновый сад",
    status: "released",
  });
});

for (const slug of ["secret-project", "missing", "Not_A_Slug"]) {
  test(`GET /api/games/${slug} answers 404 in the common error format`, async ({
    request,
  }) => {
    const response = await request.get(`/api/games/${slug}`);

    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Ничего не нашлось." },
    });
  });
}
