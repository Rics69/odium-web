import { gzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { ruAdmin } from "../lib/i18n/ru-admin";

// What a guest's phone downloads before a page works (step 5.3): about
// 205 KB gzip now, React and Next.js are 120 of them. The budget leaves
// room for growth and catches a heavy library slipping in.
const BUDGET_BYTES = 230_000;

test.skip(({ isMobile }) => isMobile, "the same scripts for every screen");

for (const path of ["/", "/games/neon-garden", "/games/derevnya-slov/wishes"]) {
  test(`${path} keeps its scripts light`, async ({ request }) => {
    const html = await (await request.get(path)).text();
    // Polyfills are `nomodule`: modern browsers skip them.
    const sources = [...html.matchAll(/<script src="([^"]+)" async/g)].map(
      (match) => match[1]!,
    );
    expect(sources.length).toBeGreaterThan(0);

    let gzipped = 0;
    for (const source of sources) {
      const code = await (await request.get(source)).text();
      gzipped += gzipSync(code).length;
      // Admin texts are for the admin (lib/i18n/admin.ts).
      expect(code, source).not.toContain(ruAdmin.menu);
      // Zod comes with the forms, which load when opened.
      expect(code, source).not.toContain("ZodError");
    }
    expect(gzipped).toBeLessThan(BUDGET_BYTES);
  });
}
