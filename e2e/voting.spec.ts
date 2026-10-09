import { expect, test, type Page } from "@playwright/test";
import { findLetter } from "../test/mailpit";
import { newPlayer, randomIp } from "./visitors";

async function signUp(
  page: Page,
  baseURL: string,
  { confirm }: { confirm: boolean },
) {
  const player = newPlayer();
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
  const response = await page.request.post("/api/auth/sign-up", {
    headers: { origin: baseURL },
    data: player,
  });
  expect(response.status()).toBe(201);
  if (confirm) {
    const letter = await findLetter(player.email);
    await page.request.get(
      letter.Text.match(/https?:\/\/\S+verify-email\?token=\S+/)![0],
    );
  }
  return player;
}

// Desktop and phone run at once: each votes for its own seeded wish, so
// neither sees the other's vote.
const target = {
  desktop: {
    title: "Звук поливки",
    before: /: 1 голос$/,
    after: /: 2 голоса$/,
  },
  mobile: {
    title: "Сад на рабочем столе",
    before: /: 2 голоса$/,
    after: /: 3 голоса$/,
  },
};

test("a confirmed player votes at once, and the vote stays", async ({
  page,
  baseURL,
}, testInfo) => {
  const wish = target[testInfo.project.name as keyof typeof target];
  await signUp(page, baseURL!, { confirm: true });
  await page.goto("/games/neon-garden/wishes");

  const vote = page.getByRole("button", {
    name: new RegExp(`Голос за «${wish.title}»`),
  });
  await expect(vote).toHaveAttribute("aria-pressed", "false");
  await expect(vote).toHaveAccessibleName(wish.before);
  await vote.click();
  await expect(vote).toHaveAttribute("aria-pressed", "true");
  await expect(vote).toHaveAccessibleName(wish.after);

  await page.reload();
  await expect(vote).toHaveAttribute("aria-pressed", "true");
  await vote.click();
  await expect(vote).toHaveAccessibleName(wish.before);
});

test("an unconfirmed player reads why the buttons are closed", async ({
  page,
  baseURL,
}) => {
  await signUp(page, baseURL!, { confirm: false });
  await page.goto("/games/neon-garden/wishes");

  await expect(
    page.getByText("Подтвердите почту — тогда можно голосовать"),
  ).toBeVisible();
  const vote = page.getByRole("button", { name: /Голос за «Звук поливки»/ });
  await expect(vote).toHaveAttribute("aria-disabled", "true");
  await expect(vote).toHaveAttribute("title", "Сначала подтвердите почту");
});
