import type { Metadata } from "next";
import { AdminPage, SectionSoon } from "@/components/admin/admin-page";
import { t } from "@/lib/i18n";
import { requireAdminPage } from "@/lib/server/session";

export const metadata: Metadata = { title: t("admin.sections.lists") };

// Filled in by step 4.6 of the plan.
export default async function AdminListsPage() {
  await requireAdminPage();
  return (
    <AdminPage title={t("admin.sections.lists")}>
      <SectionSoon text={t("admin.soon.lists")} />
    </AdminPage>
  );
}
