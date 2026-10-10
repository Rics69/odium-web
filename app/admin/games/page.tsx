import type { Metadata, Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { statusLabel } from "@/lib/games";
import { t, tp } from "@/lib/i18n";
import { listAdminGames } from "@/lib/server/admin-games";
import { requireAdminPage } from "@/lib/server/session";

export const metadata: Metadata = { title: t("admin.sections.games") };

// Every game, drafts too, in catalogue order (spec, section 6).
export default async function AdminGamesPage() {
  await requireAdminPage();
  const games = await listAdminGames();

  return (
    <AdminPage title={t("admin.sections.games")}>
      <LinkButton href="/admin/games/new" className="self-start">
        {t("admin.games.newGame")}
      </LinkButton>
      {games.length === 0 ? (
        <EmptyState
          title={t("admin.games.emptyTitle")}
          text={t("admin.games.emptyText")}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => (
            <li key={game.id}>
              <Link
                href={`/admin/games/${game.id}` as Route}
                className="flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-accent"
              >
                <div className="relative aspect-[16/9] bg-line">
                  {game.coverUrl && (
                    <Image
                      src={game.coverUrl}
                      alt=""
                      fill
                      sizes="(min-width: 1440px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex flex-wrap gap-2">
                    {game.published ? (
                      <Badge tone="add">{t("admin.games.published")}</Badge>
                    ) : (
                      <Badge>{t("admin.games.draft")}</Badge>
                    )}
                    <Badge>{statusLabel(game.status)}</Badge>
                  </div>
                  <p className="font-display text-h4">{game.title}</p>
                  <p className="text-sm text-ink-3">
                    /games/{game.slug} ·{" "}
                    {t("admin.games.order", { order: game.sortOrder })} ·{" "}
                    {tp("games.wishes", game.wishesCount)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  );
}
