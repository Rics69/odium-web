import { expect, test } from "@playwright/test";
import { findLetter } from "../test/mailpit";
import { newPlayer, randomIp } from "./visitors";

test("a confirmed player posts a wish, and the same one again is a duplicate", async ({
  playwright,
  baseURL,
}) => {
  const api = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { origin: baseURL!, "x-forwarded-for": randomIp() },
  });
  const player = newPlayer();
  expect((await api.post("/api/auth/sign-up", { data: player })).status()).toBe(
    201,
  );
  const letter = await findLetter(player.email);
  const link = letter.Text.match(/https?:\/\/\S+verify-email\?token=\S+/)![0];
  await api.get(link);

  const wish = {
    type: "add",
    title: "Светящиеся грибы",
    body: "Чтобы ночной сад был ещё волшебнее.",
  };
  const created = await api.post("/api/games/neon-garden/wishes", {
    data: wish,
  });
  expect(created.status()).toBe(201);
  expect((await created.json()).wish).toMatchObject({
    title: "Светящиеся грибы",
    votesCount: 1,
    votedByMe: true,
    author: { nickname: player.nickname },
  });

  const again = await api.post("/api/games/neon-garden/wishes", {
    data: { ...wish, title: "СВЕТЯЩИЕСЯ  грибы" },
  });
  expect(again.status()).toBe(409);
  expect((await again.json()).error.code).toBe("DUPLICATE_WISH");
  await api.dispose();
});
