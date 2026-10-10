import type { Metadata, Route } from "next";
import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { adminOverview } from "@/lib/server/admin-overview";
import { requireAdminPage } from "@/lib/server/session";

// The layout's title template covers the pages below it, not this one.
export const metadata: Metadata = {
  title: `${t("admin.sections.overview")} · ${t("admin.title")}`,
};

export default async function AdminOverviewPage() {
  await requireAdminPage();
  const numbers = await adminOverview();

  return (
    <AdminPage title={t("admin.sections.overview")}>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Figure
          href="/admin/wishes"
          label={t("admin.overview.flagged")}
          value={numbers.flagged}
          hint={t("admin.overview.flaggedHint")}
          alert={numbers.flagged > 0}
        />
        <Figure
          href="/admin/wishes"
          label={t("admin.overview.fresh")}
          value={numbers.fresh}
          hint={t("admin.overview.freshHint")}
        />
        <Figure
          href="/admin/users"
          label={t("admin.overview.players")}
          value={numbers.players}
          hint={t("admin.overview.playersHint", { count: numbers.verified })}
        />
        <Figure
          href="/admin/games"
          label={t("admin.overview.games")}
          value={numbers.allGames}
          hint={t("admin.overview.gamesHint", { count: numbers.published })}
        />
      </ul>
    </AdminPage>
  );
}

function Figure({
  href,
  label,
  value,
  hint,
  alert = false,
}: {
  href: Route;
  label: string;
  value: number;
  hint: string;
  alert?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex h-full flex-col gap-2 rounded-lg border border-line bg-surface p-5 transition-colors hover:border-accent"
      >
        <span className="text-sm font-medium text-ink-2">{label}</span>
        <span
          className={cn(
            "font-display text-h2 tabular-nums",
            alert && "text-remove",
          )}
        >
          {value}
        </span>
        <span className="text-sm text-ink-3">{hint}</span>
      </Link>
    </li>
  );
}
