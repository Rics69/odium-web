import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-page";
import { GameForm } from "@/components/admin/games/game-form";
import { TextLink } from "@/components/ui/text-link";
import { t } from "@/lib/i18n";
import { requireAdminPage } from "@/lib/server/session";

export const metadata: Metadata = { title: t("admin.games.newGame") };

export default async function NewGamePage() {
  await requireAdminPage();
  return (
    <AdminPage title={t("admin.games.newGame")}>
      <TextLink href="/admin/games" className="-mt-4 w-fit text-sm">
        {t("admin.games.back")}
      </TextLink>
      <GameForm game={null} />
    </AdminPage>
  );
}
