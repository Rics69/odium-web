import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signInAsAdmin } from "./admins";
import { confirmedPlayer } from "./players";
import { randomIp } from "./visitors";

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
});

/**
 * axe on the page as it settles: scrolled to the end and back, so content
 * that appears on scroll is there, then WCAG 2.2 A and AA and axe's best
 * practices (heading order, landmarks), as Lighthouse checks them.
 */
async function expectNoViolations(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) {
      scrollTo(0, y);
      await new Promise((done) => setTimeout(done, 60));
    }
    scrollTo(0, 0);
  });
  // Appearing content fades in for under a second.
  await page.waitForTimeout(1200);
  const { violations } = await new AxeBuilder({ page })
    .withTags([
      "wcag2a",
      "wcag2aa",
      "wcag21a",
      "wcag21aa",
      "wcag22aa",
      "best-practice",
    ])
    .analyze();
  expect(
    violations.map(
      (violation) =>
        `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`,
    ),
  ).toEqual([]);
}

const guestPages = [
  "/",
  "/games",
  "/games/derevnya-slov",
  "/games/neon-garden",
  "/games/derevnya-slov/wishes",
  "/login",
  "/register",
  "/forgot-password",
  "/no-such-page",
];

for (const path of guestPages) {
  test(`${path} has no accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await expectNoViolations(page);
  });
}

test("a wish page and the sign-in prompt have no violations", async ({
  page,
}) => {
  await page.goto("/games/derevnya-slov/wishes");
  await page.getByRole("link", { name: "Режим на время" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoViolations(page);

  await page.getByRole("button", { name: /Голос за/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoViolations(page);
});

test("a player's profile, board and new-wish form have no violations", async ({
  page,
  playwright,
  baseURL,
}) => {
  const player = await confirmedPlayer(playwright, baseURL!);
  await page
    .context()
    .addCookies((await player.request.storageState()).cookies);
  await player.request.dispose();

  await page.goto("/profile");
  await expectNoViolations(page);

  await page.goto("/games/derevnya-slov/wishes");
  await expectNoViolations(page);
  await page.getByRole("button", { name: "Новое пожелание" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoViolations(page);
});

test("the admin has no violations", async ({ page, baseURL }) => {
  await signInAsAdmin(page.request, baseURL!);
  for (const path of [
    "/admin",
    "/admin/wishes",
    "/admin/users",
    "/admin/games",
    "/admin/games/new",
    "/admin/studio",
    "/admin/log",
  ]) {
    await page.goto(path);
    await expectNoViolations(page);
  }
});

/** What has the focus, and whether it shows: an outline or a ring. */
const focused = (page: Page) =>
  page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    if (!active || active === document.body) return null;
    // A visually hidden radio shows its focus on its label.
    const element =
      active.getBoundingClientRect().width <= 1
        ? (active.closest("label") ?? active)
        : active;
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return {
      name: `${element.tagName.toLowerCase()} «${(element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 40)}»`,
      ring:
        (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) ||
        style.boxShadow !== "none",
      // Where things were, for a failure message.
      where: `box ${Math.round(box.top)}..${Math.round(box.bottom)}, scrolled ${Math.round(scrollY)}, header ${document.querySelector("header")?.style.transform || "in place"}`,
      onScreen:
        box.width > 0 &&
        box.height > 0 &&
        box.bottom > 0 &&
        box.top < innerHeight &&
        box.right > 0 &&
        box.left < innerWidth,
    };
  });

for (const path of [
  "/",
  "/games/derevnya-slov",
  "/games/derevnya-slov/wishes",
]) {
  test(`${path}: every stop of the keyboard shows the focus on screen`, async ({
    page,
  }) => {
    await page.goto(path);
    const seen: string[] = [];
    for (let stop = 0; stop < 40; stop++) {
      await page.keyboard.press("Tab");
      const now = await focused(page);
      if (!now) break;
      expect(now.ring, `${now.name} has no focus ring`).toBe(true);
      // The page scrolls to the focus smoothly.
      await expect(async () => {
        const later = await focused(page);
        expect(
          later?.onScreen,
          `${later?.name} is off screen: ${later?.where}`,
        ).toBe(true);
      }).toPass({ timeout: 5000 });
      seen.push(now.name);
    }
    expect(seen.length).toBeGreaterThan(5);
  });
}

test("the keyboard skips to the content, opens a dialog and comes back", async ({
  page,
}) => {
  await page.goto("/games/derevnya-slov/wishes?sort=new");

  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Перейти к содержимому" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();

  const vote = page.getByRole("button", { name: /Голос за «Тёмная тема»/ });
  await vote.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // The focus is trapped in the dialog.
  for (let stop = 0; stop < 6; stop++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(vote).toBeFocused();
});

test("a player votes and changes the sort from the keyboard", async ({
  page,
  playwright,
  baseURL,
}) => {
  const player = await confirmedPlayer(playwright, baseURL!);
  await page
    .context()
    .addCookies((await player.request.storageState()).cookies);
  await player.request.dispose();
  await page.goto("/games/derevnya-slov/wishes");

  const vote = page.getByRole("button", {
    name: /Голос за «Таблица рекордов»/,
  });
  await vote.focus();
  await page.keyboard.press("Space");
  await expect(vote).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Enter");
  await expect(vote).toHaveAttribute("aria-pressed", "false");

  const sorts = page.getByRole("group", { name: "Сортировка" });
  await sorts.getByRole("radio", { checked: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/sort=new/);
  await expect(sorts.getByRole("radio", { name: "Новые" })).toBeChecked();
  await expect(page.locator("[aria-busy='false']")).toBeVisible();
});

/** Where every element of the page is, rounded to a pixel. */
const positions = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("body *")].map((element) => {
      const box = element.getBoundingClientRect();
      return `${Math.round(box.x)},${Math.round(box.y)}`;
    }),
  );

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test(`the home page ${reducedMotion === "reduce" ? "stays still" : "moves"} with reduced motion ${reducedMotion}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const first = await positions(page);
    await page.waitForTimeout(2000);
    const later = await positions(page);
    const moved = first.filter((place, index) => place !== later[index]);
    if (reducedMotion === "reduce") {
      expect(moved).toEqual([]);
    } else {
      // Covers drop in, the marquee runs: the check above means something.
      expect(moved.length).toBeGreaterThan(0);
    }
  });
}
