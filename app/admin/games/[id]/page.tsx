import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/admin-page";
import { GameForm } from "@/components/admin/games/game-form";
import { TextLink } from "@/components/ui/text-link";
import { t } from "@/lib/i18n";
import { getAdminGame } from "@/lib/server/admin-games";
import { requireAdminPage } from "@/lib/server/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(params: PageProps<"/admin/games/[id]">["params"]) {
  await requireAdminPage();
  const { id } = await params;
  return UUID.test(id) ? getAdminGame(id) : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/admin/games/[id]">): Promise<Metadata> {
  const game = await load(params);
  return { title: game?.title ?? t("admin.sections.games") };
}

export default async function EditGamePage({
  params,
}: PageProps<"/admin/games/[id]">) {
  const game = await load(params);
  if (!game) notFound();
  return (
    <AdminPage title={game.title}>
      <TextLink href="/admin/games" className="-mt-4 w-fit text-sm">
        {t("admin.games.back")}
      </TextLink>
      {/* A fresh form after each save brings the saved values in. */}
      <GameForm key={game.updatedAt} game={game} />
    </AdminPage>
  );
}
