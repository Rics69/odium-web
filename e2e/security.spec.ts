import { expect, test, type Page } from "@playwright/test";

// Collects Content-Security-Policy violations the page reports.
async function watchViolations(page: Page) {
  const violations: string[] = [];
  await page.exposeFunction("reportViolation", (text: string) =>
    violations.push(text),
  );
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      (
        window as unknown as { reportViolation: (text: string) => void }
      ).reportViolation(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  return violations;
}

test("pages carry a nonce-based CSP and the other security headers", async ({
  page,
}) => {
  const response = await page.goto("/");
  const headers = response!.headers();

  const policy = headers["content-security-policy"] ?? "";
  const nonce = policy.match(/'nonce-([^']+)'/)?.[1];
  expect(nonce).toBeTruthy();
  expect(policy).toContain("'strict-dynamic'");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).not.toContain("unsafe-eval");

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-powered-by"]).toBeUndefined();

  // Every script Next.js wrote into the page carries this request's nonce.
  const nonces = await page
    .locator("script:not([type='application/ld+json'])")
    .evaluateAll((scripts) =>
      scripts.map((script) => (script as HTMLScriptElement).nonce),
    );
  expect(nonces.length).toBeGreaterThan(0);
  expect(new Set(nonces)).toEqual(new Set([nonce]));
});

test("the site runs without CSP violations, trailer included", async ({
  page,
}) => {
  const violations = await watchViolations(page);

  for (const path of [
    "/",
    "/games",
    "/games/derevnya-slov",
    "/takoy-stranitsy-net",
  ]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  await page.goto("/games/neon-garden");
  await page
    .getByRole("button", { name: "Смотреть трейлер «Неоновый сад»" })
    .click();
  await expect(page.locator("iframe")).toBeVisible();

  expect(violations).toEqual([]);
});
