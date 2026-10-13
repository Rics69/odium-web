import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-page";
import { ListEditor } from "@/components/admin/studio/list-editor";
import { t } from "@/lib/i18n/admin";
import { getBlockedDomains, getStopWords } from "@/lib/server/admin-studio";
import { requireAdminPage } from "@/lib/server/session";

export const metadata: Metadata = { title: t("admin.sections.lists") };

// The two lists of the antispam (spec, section 7).
export default async function AdminListsPage() {
  await requireAdminPage();
  const [words, domains] = await Promise.all([
    getStopWords(),
    getBlockedDomains(),
  ]);
  return (
    <AdminPage title={t("admin.sections.lists")}>
      <div className="grid gap-6 xl:grid-cols-2">
        <ListEditor
          title={t("admin.lists.stopWords")}
          hint={t("admin.lists.stopWordsHint")}
          initial={words}
          endpoint="/api/admin/stop-words"
          field="words"
        />
        <ListEditor
          title={t("admin.lists.domains")}
          hint={t("admin.lists.domainsHint")}
          initial={domains}
          endpoint="/api/admin/blocked-domains"
          field="domains"
        />
      </div>
    </AdminPage>
  );
}
