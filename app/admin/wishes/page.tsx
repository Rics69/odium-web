import type { Metadata } from "next";
import { AdminPage, SectionSoon } from "@/components/admin/admin-page";
import { t } from "@/lib/i18n";
import { requireAdminPage } from "@/lib/server/session";

export const metadata: Metadata = { title: t("admin.sections.wishes") };

// Filled in by step 4.2 of the plan.
export default async function AdminWishesPage() {
  await requireAdminPage();
  return (
    <AdminPage title={t("admin.sections.wishes")}>
      <SectionSoon text={t("admin.soon.wishes")} />
    </AdminPage>
  );
}
