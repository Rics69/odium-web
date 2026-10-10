"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";

const sections: { href: Route; label: string }[] = [
  { href: "/admin", label: t("admin.sections.overview") },
  { href: "/admin/wishes", label: t("admin.sections.wishes") },
  { href: "/admin/users", label: t("admin.sections.users") },
  { href: "/admin/games", label: t("admin.sections.games") },
  { href: "/admin/studio", label: t("admin.sections.studio") },
  { href: "/admin/lists", label: t("admin.sections.lists") },
  { href: "/admin/log", label: t("admin.sections.log") },
];

// The admin's menu: a column on the left on a computer, a row that scrolls
// sideways on a phone. A working tool: no doodles, no motion.
export function AdminNav({ nickname }: { nickname: string }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="border-b border-line bg-surface md:sticky md:top-0 md:flex md:h-dvh md:w-60 md:shrink-0 md:flex-col md:border-r md:border-b-0">
      <div className="flex items-center justify-between gap-4 px-4 py-4 md:flex-col md:items-start md:px-6 md:py-6">
        <Link href="/admin" className="flex items-baseline gap-2">
          <span className="font-display text-lg">Odium</span>
          <span className="text-sm text-ink-2">{t("admin.title")}</span>
        </Link>
        <Link
          href="/"
          className="text-sm text-ink-2 transition-colors hover:text-accent md:hidden"
        >
          {t("admin.toSite")}
        </Link>
      </div>
      <nav
        aria-label={t("admin.menu")}
        className="[scrollbar-width:none] overflow-x-auto md:flex-1 md:overflow-visible"
      >
        <ul className="flex gap-1 px-2 pb-2 md:flex-col md:px-3 md:pb-0">
          {sections.map((section) => (
            <li key={section.href} className="shrink-0">
              <Link
                href={section.href}
                aria-current={isActive(section.href) ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive(section.href)
                    ? "bg-accent/10 text-accent-deep"
                    : "text-ink-2 hover:bg-paper hover:text-ink",
                )}
              >
                {section.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="hidden flex-col gap-2 border-t border-line px-6 py-5 text-sm md:flex">
        <p className="truncate text-ink-2">
          {t("admin.signedInAs", { nickname })}
        </p>
        <Link
          href="/"
          className="w-fit text-ink transition-colors hover:text-accent"
        >
          {t("admin.toSite")}
        </Link>
      </div>
    </aside>
  );
}
