import { expect, test } from "@playwright/test";

test("GET /api/games lists the published games", async ({ request }) => {
  const response = await request.get("/api/games");

  expect(response.status()).toBe(200);
  const { games } = await response.json();
  expect(games.map((game: { slug: string }) => game.slug)).toEqual([
    "derevnya-slov",
    "neon-garden",
  ]);
  expect(games[0]).toMatchObject({
    title: "Деревня Слов",
    status: "in_development",
    wishesCount: 0,
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
