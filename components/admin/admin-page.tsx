import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { t } from "@/lib/i18n";

/** A section of the admin: its title, then the work. */
export function AdminPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-h2">{title}</h1>
      {children}
    </div>
  );
}

/** A section whose step of the plan is still ahead. */
export function SectionSoon({ text }: { text: string }) {
  return <EmptyState title={t("admin.soonTitle")} text={text} />;
}
