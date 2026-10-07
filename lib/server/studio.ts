import "server-only";
import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { studioInfo } from "@/lib/db/schema";
import { cacheTags } from "./cache-tags";

export type StudioInfo = NonNullable<
  Awaited<ReturnType<typeof queryStudioInfo>>
>;

/** The single studio_info row, or null before the seed or the admin fills it. */
export async function queryStudioInfo() {
  const [row] = await db
    .select({
      tagline: studioInfo.tagline,
      aboutMd: studioInfo.aboutMd,
      mission: studioInfo.mission,
      team: studioInfo.team,
      socials: studioInfo.socials,
      contactEmail: studioInfo.contactEmail,
    })
    .from(studioInfo)
    .where(eq(studioInfo.id, 1))
    .limit(1);
  return row ?? null;
}

export const getStudioInfo = unstable_cache(queryStudioInfo, ["studio"], {
  tags: [cacheTags.studio],
});
