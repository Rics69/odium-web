import type { Metadata } from "next";
import { AdminPage, SectionSoon } from "@/components/admin/admin-page";
import { t } from "@/lib/i18n";
import { requireAdminPage } from "@/lib/server/session";

export const metadata: Metadata = { title: t("admin.sections.users") };

// Filled in by step 4.4 of the plan.
export default async function AdminUsersPage() {
  await requireAdminPage();
  return (
    <AdminPage title={t("admin.sections.users")}>
      <SectionSoon text={t("admin.soon.users")} />
    </AdminPage>
  );
}
