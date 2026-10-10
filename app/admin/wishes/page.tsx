import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminWishes } from "@/components/admin/wishes/admin-wishes";
import { WishFilters } from "@/components/admin/wishes/wish-filters";
import { t } from "@/lib/i18n";
import { listAdminWishes, listGameChoices } from "@/lib/server/admin-wishes";
import { requireAdminPage } from "@/lib/server/session";
import { adminWishesQuerySchema } from "@/lib/validation/admin-wishes";

export const metadata: Metadata = { title: t("admin.sections.wishes") };

// Moderation of every game's wishes (spec, section 6). Odd choices in the
// address fall back to the defaults.
export default async function AdminWishesPage({
  searchParams,
}: PageProps<"/admin/wishes">) {
  await requireAdminPage();
  const raw = Object.fromEntries(
    Object.entries(await searchParams).filter(
      ([key, value]) => key !== "cursor" && typeof value === "string",
    ),
  );
  const parsed = adminWishesQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : adminWishesQuerySchema.parse({});
  const [initial, gameList] = await Promise.all([
    listAdminWishes(query),
    listGameChoices(),
  ]);

  return (
    <AdminPage title={t("admin.sections.wishes")}>
      <WishFilters query={query} games={gameList} />
      <AdminWishes
        key={JSON.stringify(query)}
        query={query}
        initial={initial}
      />
    </AdminPage>
  );
}
