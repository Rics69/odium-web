import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-page";
import { StudioForm } from "@/components/admin/studio/studio-form";
import { t } from "@/lib/i18n/admin";
import { getAdminStudio } from "@/lib/server/admin-studio";
import { requireAdminPage } from "@/lib/server/session";

export const metadata: Metadata = { title: t("admin.sections.studio") };

// «О студии» (spec, section 6): the home page and the footer.
export default async function AdminStudioPage() {
  await requireAdminPage();
  const studio = await getAdminStudio();
  return (
    <AdminPage title={t("admin.sections.studio")}>
      <StudioForm initial={studio} />
    </AdminPage>
  );
}
