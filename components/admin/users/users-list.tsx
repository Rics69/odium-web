"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { apiGet } from "@/lib/api-client";
import { formatDate, t, tp } from "@/lib/i18n";
import type { AdminUsersPage } from "@/lib/server/admin-users";
import type { AdminUsersQuery } from "@/lib/validation/admin-users";
import { UserBadges } from "./user-badges";

/** The players found: the first page from the server, more by a button. */
export function UsersList({
  query,
  initial,
}: {
  query: AdminUsersQuery;
  initial: AdminUsersPage;
}) {
  const toast = useToast();
  const [pages, setPages] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!pages.nextCursor) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries({
        ...query,
        cursor: pages.nextCursor,
      })) {
        if (value) params.set(key, value);
      }
      const next = await apiGet<AdminUsersPage>(`/api/admin/users?${params}`);
      setPages((current) => ({
        users: [...current.users, ...next.users],
        nextCursor: next.nextCursor,
      }));
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : t("errors.internal"),
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  if (pages.users.length === 0) {
    return (
      <EmptyState
        title={t("admin.users.emptyTitle")}
        text={t("admin.users.emptyText")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
        {pages.users.map((user) => (
          <li key={user.id}>
            <Link
              href={`/admin/users/${user.id}` as Route}
              className="flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-paper"
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold break-all">{user.nickname}</span>
                <UserBadges user={user} />
              </span>
              <span className="text-sm break-all text-ink-2">{user.email}</span>
              <span className="text-sm text-ink-3">
                {t("admin.users.since", {
                  date: formatDate(user.createdAt.slice(0, 10)),
                })}
                {" · "}
                {tp("games.wishes", user.wishesCount)}
                {" · "}
                {tp("board.votes", user.votesCount)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {pages.nextCursor && (
        <Button
          variant="secondary"
          loading={loading}
          onClick={loadMore}
          className="self-center"
        >
          {t("board.more")}
        </Button>
      )}
    </div>
  );
}
