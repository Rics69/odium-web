import type { Metadata } from "next";
import { AdminPage, SectionSoon } from "@/components/admin/admin-page";
import { t } from "@/lib/i18n";
import { requireAdminPage } from "@/lib/server/session";

export const metadata: Metadata = { title: t("admin.sections.log") };

// Filled in by step 4.7 of the plan.
export default async function AdminLogPage() {
  await requireAdminPage();
  return (
    <AdminPage title={t("admin.sections.log")}>
      <SectionSoon text={t("admin.soon.log")} />
    </AdminPage>
  );
}
