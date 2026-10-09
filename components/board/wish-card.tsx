"use client";

import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime, t } from "@/lib/i18n";
import { statusLabel, typeLabel } from "@/lib/wish-labels";
import type { WishView } from "@/lib/server/wishes";
import { VoteButton } from "./vote-button";

const statusTone = {
  new: "neutral",
  review: "neutral",
  planned: "accent",
  in_progress: "accent",
  done: "add",
  declined: "neutral",
} as const;

/** A wish on the board: votes, labels, title, two lines, author and time. */
export function WishCard({ wish, slug }: { wish: WishView; slug: string }) {
  const closed = wish.status === "done" || wish.status === "declined";
  return (
    <article className="flex gap-4 rounded-lg border border-line bg-surface p-4 md:gap-6 md:p-6">
      <VoteButton
        wishId={wish.id}
        title={wish.title}
        votesCount={wish.votesCount}
        votedByMe={wish.votedByMe}
        closed={closed}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge tone={wish.type}>{t(typeLabel[wish.type])}</Badge>
          <Badge tone={statusTone[wish.status]}>
            {t(statusLabel[wish.status])}
            {wish.status === "done" && wish.doneVersion
              ? ` ${t("board.doneVersion", { version: wish.doneVersion })}`
              : ""}
          </Badge>
          {wish.studioReply && (
            <Badge tone="accent">{t("board.studioReply")}</Badge>
          )}
        </div>
        <h3 className="text-lg font-semibold break-words">
          <Link
            href={`/games/${slug}/wishes/${wish.id}` as Route}
            className="transition-colors hover:text-accent"
          >
            {wish.title}
          </Link>
        </h3>
        {wish.body && (
          <p className="line-clamp-2 break-words whitespace-pre-line text-ink-2">
            {wish.body}
          </p>
        )}
        <p className="text-sm text-ink-3">
          {wish.author?.nickname ?? t("board.deletedAuthor")}
          {" · "}
          <time dateTime={wish.createdAt} suppressHydrationWarning>
            {formatRelativeTime(new Date(wish.createdAt))}
          </time>
        </p>
      </div>
    </article>
  );
}
