"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { BracketLabel } from "@/components/ui/bracket-label";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { apiGet } from "@/lib/api-client";
import { formatRelativeTime, t, tp } from "@/lib/i18n";
import type { MyWish, MyWishesPage } from "@/lib/server/board";
import { hiddenReasonLabel, statusLabel, typeLabel } from "@/lib/wish-labels";

/** "Мои пожелания": every game, newest first, more by a button. */
export function MyWishes({ firstPage }: { firstPage: MyWishesPage }) {
  const [pages, setPages] = useState(firstPage);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function loadMore() {
    if (!pages.nextCursor) return;
    setLoading(true);
    try {
      const next = await apiGet<MyWishesPage>(
        `/api/me/wishes?cursor=${encodeURIComponent(pages.nextCursor)}`,
      );
      setPages((current) => ({
        wishes: [...current.wishes, ...next.wishes],
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

  if (pages.wishes.length === 0) {
    return (
      <EmptyState
        title={t("account.profile.wishesEmptyTitle")}
        text={t("account.profile.wishesEmptyText")}
        action={
          <LinkButton href="/games" variant="secondary">
            {t("account.profile.wishesToGames")}
          </LinkButton>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col divide-y divide-line">
        {pages.wishes.map((wish) => (
          <MyWishRow key={wish.id} wish={wish} />
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

function MyWishRow({ wish }: { wish: MyWish }) {
  return (
    <li className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <BracketLabel className="text-sm text-ink-2">
          {wish.game.title}
        </BracketLabel>
        <Badge tone={wish.type}>{t(typeLabel[wish.type])}</Badge>
        <Badge tone={wish.status === "done" ? "add" : "neutral"}>
          {t(statusLabel[wish.status])}
        </Badge>
      </div>
      <Link
        href={`/games/${wish.game.slug}/wishes/${wish.id}` as Route}
        className="text-lg font-semibold break-words transition-colors hover:text-accent"
      >
        {wish.title}
      </Link>
      {wish.hidden && (
        <p className="text-sm text-remove">
          {wish.hiddenReason === "flagged" || !wish.hiddenReason
            ? t("wish.hiddenFlagged")
            : t("wish.hiddenByModerator", {
                reason: t(hiddenReasonLabel[wish.hiddenReason]),
              })}
        </p>
      )}
      <p className="text-sm text-ink-3">
        {tp("board.votes", wish.votesCount)}
        {" · "}
        <time dateTime={wish.createdAt} suppressHydrationWarning>
          {formatRelativeTime(new Date(wish.createdAt))}
        </time>
      </p>
    </li>
  );
}
