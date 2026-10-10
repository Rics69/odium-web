import type { Metadata } from "next";
import { AdminPage, SectionSoon } from "@/components/admin/admin-page";
import { t } from "@/lib/i18n";
import { requireAdminPage } from "@/lib/server/session";

export const metadata: Metadata = { title: t("admin.sections.games") };

// Filled in by step 4.5 of the plan.
export default async function AdminGamesPage() {
  await requireAdminPage();
  return (
    <AdminPage title={t("admin.sections.games")}>
      <SectionSoon text={t("admin.soon.games")} />
    </AdminPage>
  );
}
