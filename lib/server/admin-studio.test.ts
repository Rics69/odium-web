import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { adminLog, user } from "@/lib/db/schema";
import {
  blockedDomainsSchema,
  stopWordsSchema,
  studioInputSchema,
} from "@/lib/validation/admin-studio";
import { findStopWord } from "@/lib/wishes";
import { isDisposableEmail } from "./accounts";
import {
  getAdminStudio,
  getBlockedDomains,
  getStopWords,
  saveBlockedDomains,
  saveStopWords,
  saveStudio,
} from "./admin-studio";
import { queryStudioInfo } from "./studio";

async function anAdmin() {
  const [admin] = await db
    .insert(user)
    .values({
      nickname: `Admin_${randomUUID().slice(0, 6)}`,
      email: `${randomUUID()}@example.com`,
      role: "admin",
    })
    .returning({ id: user.id });
  return admin!;
}

const studio = (values: Record<string, unknown> = {}) =>
  studioInputSchema.parse({
    tagline: "Делаем игры. Копим на игру мечты.",
    aboutMd: "Маленькая студия.",
    mission: "Игра как кино.",
    team: [{ name: "", role: "Основатель" }],
    socials: [{ label: "Telegram", url: "https://t.me/odium_games" }],
    contactEmail: "",
    ...values,
  });

describe("«О студии»", () => {
  it("saves the single row and records only what changed", async () => {
    const admin = await anAdmin();
    expect(await getAdminStudio()).toMatchObject({ tagline: "", team: [] });

    expect(await saveStudio(admin, studio())).toBe(true);
    expect(await queryStudioInfo()).toMatchObject({
      tagline: "Делаем игры. Копим на игру мечты.",
      team: [{ name: "", role: "Основатель", photoUrl: null }],
      contactEmail: null,
    });
    expect(await saveStudio(admin, studio())).toBe(false);
    await saveStudio(admin, studio({ mission: "Новая цель." }));

    const entries = await db
      .select()
      .from(adminLog)
      .orderBy(adminLog.createdAt);
    expect(entries).toHaveLength(2);
    expect(entries[1]).toMatchObject({
      action: "studio.update",
      before: { mission: "Игра как кино." },
      after: { mission: "Новая цель." },
    });
  });

  it("takes web links and a real address only", () => {
    const parse = (values: Record<string, unknown>) =>
      studioInputSchema.safeParse({ ...studio(), ...values }).success;
    expect(
      parse({ socials: [{ label: "x", url: "javascript:alert(1)" }] }),
    ).toBe(false);
    expect(parse({ team: [{ name: "", role: "  " }] })).toBe(false);
    expect(parse({ contactEmail: "hello@odium.ru" })).toBe(true);
    expect(parse({ contactEmail: "not an email" })).toBe(false);
  });
});

describe("the stop words", () => {
  it("lowercases, merges repeats and records what came and went", async () => {
    const admin = await anAdmin();
    const words = (list: string[]) =>
      stopWordsSchema.parse({ words: list }).words;

    await saveStopWords(
      admin,
      words(["Казино", "казино ", "", "быстрые деньги"]),
    );
    expect(await getStopWords()).toEqual(["быстрые деньги", "казино"]);

    const result = await saveStopWords(admin, words(["казино", "ставки"]));
    expect(result).toEqual({
      added: 1,
      removed: 1,
      list: ["казино", "ставки"],
    });
    expect(await getStopWords()).toEqual(["казино", "ставки"]);
    expect(findStopWord("Лучшие СТАВКИ тут", await getStopWords())).toBe(
      "ставки",
    );

    expect(await saveStopWords(admin, words(["ставки", "казино"]))).toEqual({
      added: 0,
      removed: 0,
      list: ["казино", "ставки"],
    });
    const [, second] = await db
      .select()
      .from(adminLog)
      .orderBy(adminLog.createdAt);
    expect(second).toMatchObject({
      action: "stop_words.update",
      before: { removed: ["быстрые деньги"] },
      after: { added: ["ставки"] },
    });
    expect(await db.$count(adminLog)).toBe(2);
    expect(() => stopWordsSchema.parse({ words: ["я"] })).toThrow();
  });
});

describe("the blocked domains", () => {
  it("are what the sign-up checks", async () => {
    const admin = await anAdmin();
    const domains = (list: string[]) =>
      blockedDomainsSchema.parse({ domains: list }).domains;

    await saveBlockedDomains(
      admin,
      domains(["Mailinator.com", "temp-mail.org"]),
    );

    expect(await getBlockedDomains()).toEqual([
      "mailinator.com",
      "temp-mail.org",
    ]);
    expect(await isDisposableEmail("x@inbox.mailinator.com")).toBe(true);
    await saveBlockedDomains(admin, domains(["temp-mail.org"]));
    expect(await isDisposableEmail("x@mailinator.com")).toBe(false);
    for (const wrong of ["mailinator", "http://x.com", "a..b.com", "-x.com"]) {
      expect(() => domains([wrong]), wrong).toThrow();
    }
  });
});
