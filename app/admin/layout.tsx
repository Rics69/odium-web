import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { t } from "@/lib/i18n";
import { requireAdminPage } from "@/lib/server/session";

export const metadata: Metadata = {
  title: {
    default: t("admin.title"),
    template: `%s · ${t("admin.title")} · Odium`,
  },
  // Not for search engines, even by mistake (spec, section 10).
  robots: { index: false, follow: false },
};

// The admin's frame, without the site's header and footer. The check here
// only keeps the frame from strangers; each page checks again.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdminPage();
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <AdminNav nickname={admin.nickname} />
      <main
        id="content"
        tabIndex={-1}
        className="min-w-0 flex-1 px-4 py-8 outline-none md:px-10 md:py-10"
      >
        {children}
      </main>
    </div>
  );
}
