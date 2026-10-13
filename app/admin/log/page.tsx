import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-page";
import { JournalFilters } from "@/components/admin/log/journal-filters";
import { JournalList } from "@/components/admin/log/journal-list";
import { t } from "@/lib/i18n/admin";
import { listJournal, listJournalAdmins } from "@/lib/server/admin-journal";
import { requireAdminPage } from "@/lib/server/session";
import { journalQuerySchema } from "@/lib/validation/admin-log";

export const metadata: Metadata = { title: t("admin.sections.log") };

// Every admin action (spec, section 6). Odd filters in the address fall
// back to the whole journal.
export default async function AdminLogPage({
  searchParams,
}: PageProps<"/admin/log">) {
  await requireAdminPage();
  const raw = Object.fromEntries(
    Object.entries(await searchParams).filter(
      ([key, value]) => key !== "cursor" && typeof value === "string",
    ),
  );
  const parsed = journalQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : journalQuerySchema.parse({});
  const [initial, admins] = await Promise.all([
    listJournal(query),
    listJournalAdmins(),
  ]);

  return (
    <AdminPage title={t("admin.sections.log")}>
      <JournalFilters query={query} admins={admins} />
      <JournalList
        key={JSON.stringify(query)}
        query={query}
        initial={initial}
      />
    </AdminPage>
  );
}
