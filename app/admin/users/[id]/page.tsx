import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AdminPage } from "@/components/admin/admin-page";
import { UserActions } from "@/components/admin/users/user-actions";
import { UserBadges } from "@/components/admin/users/user-badges";
import { Badge } from "@/components/ui/badge";
import { TextLink } from "@/components/ui/text-link";
import { formatDateTime, t, tp } from "@/lib/i18n";
import {
  getAdminUser,
  type AdminUserHistoryEntry,
} from "@/lib/server/admin-users";
import { requireAdminPage } from "@/lib/server/session";
import { statusLabel } from "@/lib/wish-labels";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: PageProps<"/admin/users/[id]">): Promise<Metadata> {
  await requireAdminPage();
  const { id } = await params;
  const user = UUID.test(id) ? await getAdminUser(id) : null;
  return { title: user?.nickname ?? t("admin.sections.users") };
}

// The player's card (spec, section 6).
export default async function AdminUserPage({
  params,
}: PageProps<"/admin/users/[id]">) {
  const admin = await requireAdminPage();
  const { id } = await params;
  const user = UUID.test(id) ? await getAdminUser(id) : null;
  if (!user) notFound();

  return (
    <AdminPage title={user.nickname}>
      <TextLink href="/admin/users" className="-mt-4 w-fit text-sm">
        {t("admin.users.back")}
      </TextLink>
      <div className="flex flex-wrap gap-2">
        <UserBadges user={user} />
      </div>
      {user.banned && (
        <p className="rounded-md bg-remove-soft px-4 py-3 text-remove">
          {user.banExpires
            ? t("admin.users.bannedUntil", {
                date: formatDateTime(new Date(user.banExpires)),
              })
            : t("admin.users.bannedForever")}{" "}
          {user.banReason &&
            t("account.login.banReason", { reason: user.banReason })}
        </p>
      )}

      <dl className="grid gap-4 rounded-lg border border-line bg-surface p-5 md:grid-cols-4">
        <Fact label={t("admin.users.email")}>
          <span className="break-all">{user.email}</span>
        </Fact>
        <Fact label={t("admin.users.registered")}>
          {formatDateTime(new Date(user.createdAt))}
        </Fact>
        <Fact label={t("admin.users.wishesCount")}>
          {tp("games.wishes", user.wishesCount)}
        </Fact>
        <Fact label={t("admin.users.votesCount")}>
          {tp("board.votes", user.votesCount)}
        </Fact>
      </dl>

      <div className="grid gap-10 lg:grid-cols-2">
        <UserActions user={user} isMe={user.id === admin.id} />

        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-4">
            <h2 className="font-display text-h4">
              {t("admin.users.historyTitle")}
            </h2>
            {user.history.length === 0 ? (
              <p className="text-ink-2">{t("admin.users.historyEmpty")}</p>
            ) : (
              <ol className="flex flex-col gap-4">
                {user.history.map((entry) => (
                  <HistoryEntry key={entry.id} entry={entry} />
                ))}
              </ol>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-display text-h4">
              {t("admin.users.wishesTitle")}
            </h2>
            {user.wishes.length === 0 ? (
              <p className="text-ink-2">{t("admin.users.wishesNone")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {user.wishes.map((wish) => (
                  <li key={wish.id} className="flex flex-col gap-1">
                    <TextLink
                      href={
                        `/games/${wish.game.slug}/wishes/${wish.id}` as Route
                      }
                      className="w-fit break-words"
                    >
                      {wish.title}
                    </TextLink>
                    <span className="flex flex-wrap items-center gap-2 text-sm text-ink-3">
                      {wish.game.title}
                      <Badge>{t(statusLabel[wish.status])}</Badge>
                      {wish.hidden && (
                        <Badge tone="remove">{t("admin.wishes.hidden")}</Badge>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <TextLink
              href={
                `/admin/wishes?author=${encodeURIComponent(user.nickname)}` as Route
              }
              className="w-fit text-sm"
            >
              {t("admin.users.wishesAll")}
            </TextLink>
          </section>
        </div>
      </div>
    </AdminPage>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function HistoryEntry({ entry }: { entry: AdminUserHistoryEntry }) {
  const after = entry.after ?? {};
  const title =
    entry.action === "user.ban"
      ? t("admin.users.historyBan")
      : entry.action === "user.unban"
        ? t("admin.users.historyUnban")
        : t("admin.users.historyRole");
  return (
    <li className="flex flex-col gap-1 border-l-2 border-line pl-4">
      <p className="font-medium">{title}</p>
      {entry.action === "user.ban" && (
        <p className="text-sm">
          {typeof after.banExpires === "string"
            ? t("admin.users.bannedUntil", {
                date: formatDateTime(new Date(after.banExpires)),
              })
            : t("admin.users.bannedForever")}{" "}
          {entry.reason &&
            t("account.login.banReason", { reason: entry.reason })}
          {after.wipe === true &&
            ` ${t("admin.users.historyWipe", {
              wishes: Number(after.hiddenWishes ?? 0),
              votes: Number(after.removedVotes ?? 0),
            })}`}
        </p>
      )}
      {entry.action === "user.role" && (
        <p className="text-sm">
          {after.role === "admin"
            ? t("admin.users.historyRoleTo")
            : t("admin.users.historyRoleFrom")}
        </p>
      )}
      <p className="text-sm text-ink-3">
        {t("admin.users.historyBy", {
          admin: entry.admin ?? t("board.deletedAuthor"),
          date: formatDateTime(new Date(entry.createdAt)),
        })}
      </p>
    </li>
  );
}
