import type { Metadata } from "next";
import { AdminPage, SectionSoon } from "@/components/admin/admin-page";
import { t } from "@/lib/i18n";
import { requireAdminPage } from "@/lib/server/session";

export const metadata: Metadata = { title: t("admin.sections.studio") };

// Filled in by step 4.6 of the plan.
export default async function AdminStudioPage() {
  await requireAdminPage();
  return (
    <AdminPage title={t("admin.sections.studio")}>
      <SectionSoon text={t("admin.soon.studio")} />
    </AdminPage>
  );
}
