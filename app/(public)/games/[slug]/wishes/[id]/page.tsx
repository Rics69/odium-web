import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { BoardProvider } from "@/components/board/board-context";
import { VoteButton } from "@/components/board/vote-button";
import { Badge } from "@/components/ui/badge";
import { TextLink } from "@/components/ui/text-link";
import { AuthorActions, ShareButton } from "@/components/wish/wish-actions";
import { formatDateTime, t } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/server/session";
import { findMergedOriginal, getWish } from "@/lib/server/wishes";
import { hiddenReasonLabel, statusLabel, typeLabel } from "@/lib/wish-labels";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(params: PageProps<"/games/[slug]/wishes/[id]">["params"]) {
  const { slug, id } = await params;
  if (!UUID.test(id)) return null;
  const viewer = await getCurrentUser(await headers());
  const wish = await getWish(id, viewer);
  // A wish lives at its own game's address only.
  if (!wish || wish.game.slug !== slug) return null;
  return { wish, viewer };
}

export async function generateMetadata({
  params,
}: PageProps<"/games/[slug]/wishes/[id]">): Promise<Metadata> {
  const found = await load(params);
  if (!found) return {};
  const { wish } = found;
  return {
    title: `${wish.title} · ${wish.game.title}`,
    description:
      wish.body.slice(0, 160) ||
      t("board.description", { game: wish.game.title }),
    // Hidden wishes are not for search engines (spec, section 10).
    robots: wish.hidden ? { index: false, follow: false } : undefined,
  };
}

// A wish's own address, to share the idea (spec, section 4).
export default async function WishPage({
  params,
}: PageProps<"/games/[slug]/wishes/[id]">) {
  const found = await load(params);
  if (!found) {
    // A merged duplicate is hidden: everyone else goes to its original.
    const { id } = await params;
    const original = UUID.test(id) ? await findMergedOriginal(id) : null;
    if (original) {
      redirect(`/games/${original.slug}/wishes/${original.id}` as Route);
    }
    notFound();
  }
  const { wish, viewer } = found;
  const closed = wish.status === "done" || wish.status === "declined";

  return (
    <BoardProvider
      viewer={{
        signedIn: viewer !== null,
        verified: viewer?.emailVerified ?? false,
      }}
    >
      <article className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 md:px-8 md:py-16">
        <TextLink
          href={`/games/${wish.game.slug}/wishes` as Route}
          className="w-fit text-sm"
        >
          {t("wish.back", { game: wish.game.title })}
        </TextLink>

        {wish.hidden && (
          <p className="rounded-md border border-remove/30 bg-remove-soft px-4 py-3 text-remove">
            {wish.hiddenReason === "flagged" || !wish.hiddenReason
              ? t("wish.hiddenFlagged")
              : t("wish.hiddenByModerator", {
                  reason: t(hiddenReasonLabel[wish.hiddenReason]),
                })}
          </p>
        )}
        {wish.mergedInto && (
          <p className="rounded-md border border-line bg-surface px-4 py-3">
            {t("wish.mergedInto")}{" "}
            <TextLink
              href={
                `/games/${wish.game.slug}/wishes/${wish.mergedInto.id}` as Route
              }
            >
              {wish.mergedInto.title}
            </TextLink>
          </p>
        )}

        <div className="flex gap-5 md:gap-8">
          <VoteButton
            wishId={wish.id}
            title={wish.title}
            votesCount={wish.votesCount}
            votedByMe={wish.votedByMe}
            closed={closed || wish.hidden}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone={wish.type}>{t(typeLabel[wish.type])}</Badge>
              <Badge tone={wish.status === "done" ? "add" : "neutral"}>
                {t(statusLabel[wish.status])}
                {wish.status === "done" && wish.doneVersion
                  ? ` ${t("board.doneVersion", { version: wish.doneVersion })}`
                  : ""}
              </Badge>
            </div>
            <h1 className="font-display text-h1 break-words">{wish.title}</h1>
            <p className="text-ink-2">
              {wish.author?.nickname ?? t("board.deletedAuthor")}
              {" · "}
              <time dateTime={wish.createdAt}>
                {formatDateTime(new Date(wish.createdAt))}
              </time>
            </p>
          </div>
        </div>

        {wish.body && (
          // Plain text: line breaks kept, links stay text (spec, section 5).
          <p className="text-lg break-words whitespace-pre-line">{wish.body}</p>
        )}

        {wish.studioReply && (
          <section className="flex flex-col gap-2 rounded-lg border-2 border-accent bg-accent/5 p-6">
            <h2 className="font-display text-h4 text-accent-deep">
              {t("board.studioReply")}
            </h2>
            <p className="break-words whitespace-pre-line">
              {wish.studioReply}
            </p>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <ShareButton title={wish.title} />
          <AuthorActions wish={wish} />
        </div>
      </article>
    </BoardProvider>
  );
}
