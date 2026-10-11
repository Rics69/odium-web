import "server-only";
import { asc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { blockedEmailDomains, stopWords, studioInfo } from "@/lib/db/schema";
import type { StudioInput } from "@/lib/validation/admin-studio";
import { adminAction, changedFields } from "./admin-log";
import type { CurrentUser } from "./session";
import { queryStudioInfo } from "./studio";

const EMPTY: StudioInput = {
  tagline: "",
  aboutMd: "",
  mission: "",
  team: [],
  socials: [],
  contactEmail: null,
};

/** «О студии» as the admin edits it; empty fields before the first save. */
export async function getAdminStudio(): Promise<StudioInput> {
  const studio = await queryStudioInfo();
  if (!studio) return EMPTY;
  return {
    ...studio,
    team: studio.team.map((member) => ({ ...member, photoUrl: null })),
  };
}

/**
 * Saves «О студии» (the single row); the journal gets what changed.
 * Returns whether anything did.
 */
export async function saveStudio(
  admin: Pick<CurrentUser, "id">,
  input: StudioInput,
): Promise<boolean> {
  const { was, now } = changedFields(await getAdminStudio(), input);
  if (Object.keys(now).length === 0) return false;
  await adminAction(admin, async (tx, record) => {
    await tx
      .insert(studioInfo)
      .values({ id: 1, ...input })
      .onConflictDoUpdate({ target: studioInfo.id, set: input });
    await record({
      action: "studio.update",
      targetType: "studio",
      targetId: "studio",
      before: was,
      after: now,
    });
  });
  return true;
}

export async function getStopWords(): Promise<string[]> {
  const rows = await db
    .select({ word: stopWords.word })
    .from(stopWords)
    .orderBy(asc(stopWords.word));
  return rows.map((row) => row.word);
}

export async function getBlockedDomains(): Promise<string[]> {
  const rows = await db
    .select({ domain: blockedEmailDomains.domain })
    .from(blockedEmailDomains)
    .orderBy(asc(blockedEmailDomains.domain));
  return rows.map((row) => row.domain);
}

/** How many entries came and went, and the list as saved (sorted). */
export type ListChange = { added: number; removed: number; list: string[] };

/** What a new list adds to the old one and takes from it. */
function changes(before: string[], after: string[]) {
  const old = new Set(before);
  const fresh = new Set(after);
  return {
    added: after.filter((item) => !old.has(item)),
    removed: before.filter((item) => !fresh.has(item)),
  };
}

/**
 * Replaces the stop words (spec, section 7). They hide new and edited
 * wishes for review; wishes already on the boards stay as they are.
 */
export async function saveStopWords(
  admin: Pick<CurrentUser, "id">,
  words: string[],
): Promise<ListChange> {
  return adminAction(admin, async (tx, record) => {
    const before = (
      await tx.select({ word: stopWords.word }).from(stopWords)
    ).map((row) => row.word);
    const { added, removed } = changes(before, words);
    if (added.length === 0 && removed.length === 0) {
      return { added: 0, removed: 0, list: before.sort() };
    }
    if (removed.length > 0) {
      await tx.delete(stopWords).where(inArray(stopWords.word, removed));
    }
    if (added.length > 0) {
      await tx
        .insert(stopWords)
        .values(added.map((word) => ({ word })))
        .onConflictDoNothing();
    }
    await record({
      action: "stop_words.update",
      targetType: "stop_words",
      targetId: "stop_words",
      before: { removed },
      after: { added },
    });
    return { added: added.length, removed: removed.length, list: words };
  });
}

/**
 * Replaces the disposable email domains (spec, section 7): new sign-ups
 * and email changes to them are refused; accounts already made stay.
 */
export async function saveBlockedDomains(
  admin: Pick<CurrentUser, "id">,
  domains: string[],
): Promise<ListChange> {
  return adminAction(admin, async (tx, record) => {
    const before = (
      await tx
        .select({ domain: blockedEmailDomains.domain })
        .from(blockedEmailDomains)
    ).map((row) => row.domain);
    const { added, removed } = changes(before, domains);
    if (added.length === 0 && removed.length === 0) {
      return { added: 0, removed: 0, list: before.sort() };
    }
    if (removed.length > 0) {
      await tx
        .delete(blockedEmailDomains)
        .where(inArray(blockedEmailDomains.domain, removed));
    }
    for (let i = 0; i < added.length; i += 1000) {
      await tx
        .insert(blockedEmailDomains)
        .values(added.slice(i, i + 1000).map((domain) => ({ domain })))
        .onConflictDoNothing();
    }
    await record({
      action: "blocked_domains.update",
      targetType: "blocked_domains",
      targetId: "blocked_domains",
      before: { removed },
      after: { added },
    });
    return { added: added.length, removed: removed.length, list: domains };
  });
}
