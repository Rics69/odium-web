"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";
import { apiGet } from "@/lib/api-client";
import { boardSearch } from "@/lib/board-url";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import type { BoardPage } from "@/lib/server/board";
import type { WishView } from "@/lib/server/wishes";
import type { BoardQuery, BoardSort } from "@/lib/validation/wishes";
import { BoardProvider, useBoard, type Viewer } from "./board-context";
import { NewWishDialog } from "./wish-form-dialog";
import { WishCard } from "./wish-card";

/**
 * The board: the sort in the address, the first page from the server, more
 * pages from the API. A change of sort is a navigation, so the server
 * renders the new first page and a link to it can be shared.
 */
export function Board(
  props: {
    slug: string;
    query: BoardQuery;
    initial: BoardPage;
    wishesOpen: boolean;
  } & { viewer: Viewer },
) {
  return (
    <BoardProvider viewer={props.viewer}>
      <BoardView {...props} />
    </BoardProvider>
  );
}

function BoardView({
  slug,
  query,
  initial,
  wishesOpen,
}: {
  slug: string;
  query: BoardQuery;
  initial: BoardPage;
  wishesOpen: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [navigating, startNavigation] = useTransition();
  const [pages, setPages] = useState(initial);
  const [loadingMore, setLoadingMore] = useState(false);

  function chooseSort(sort: BoardSort) {
    const next = boardSearch({ sort });
    startNavigation(() =>
      router.replace(`${pathname}${next ? `?${next}` : ""}` as Route, {
        scroll: false,
      }),
    );
  }

  async function loadMore() {
    if (!pages.nextCursor) return;
    setLoadingMore(true);
    try {
      const next = await apiGet<BoardPage>(
        `/api/games/${slug}/wishes?${boardSearch({ ...query, cursor: pages.nextCursor })}`,
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
      setLoadingMore(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <BoardActions
        slug={slug}
        wishesOpen={wishesOpen}
        onCreated={(wish) =>
          setPages((current) => ({
            ...current,
            wishes: [wish, ...current.wishes.filter((w) => w.id !== wish.id)],
          }))
        }
      />
      <SegmentedControl<BoardSort>
        nowrap
        className="self-start"
        label={t("board.sortLabel")}
        value={query.sort}
        onChange={chooseSort}
        options={[
          { value: "top", label: t("board.sortTop") },
          { value: "new", label: t("board.sortNew") },
          { value: "old", label: t("board.sortOld") },
        ]}
      />

      <div
        aria-busy={navigating}
        className={cn("transition-opacity", navigating && "opacity-60")}
      >
        {pages.wishes.length === 0 ? (
          <EmptyState
            title={t("board.emptyTitle")}
            text={t("board.emptyText")}
          />
        ) : (
          <ul className="flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {pages.wishes.map((wish) => (
                <motion.li
                  key={wish.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <WishCard wish={wish} slug={slug} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {pages.nextCursor && (
        <Button
          variant="secondary"
          loading={loadingMore}
          onClick={loadMore}
          className="self-center"
        >
          {t("board.more")}
        </Button>
      )}
    </div>
  );
}

/**
 * Above the list: what this player can do here. A confirmed player writes
 * a new wish; a guest gets the button that asks to sign in; an unconfirmed
 * player a word about the email; a closed board says so.
 */
function BoardActions({
  slug,
  wishesOpen,
  onCreated,
}: {
  slug: string;
  wishesOpen: boolean;
  onCreated: (wish: WishView) => void;
}) {
  const { viewer, askToSignIn } = useBoard();
  const [writing, setWriting] = useState(false);
  if (!wishesOpen) {
    return <Note>{t("board.closed")}</Note>;
  }
  if (viewer.signedIn && !viewer.verified) {
    return <Note>{t("board.verifyFirst")}</Note>;
  }
  return (
    <>
      <Button
        doodle
        onClick={viewer.signedIn ? () => setWriting(true) : askToSignIn}
        className="self-start"
      >
        {t("board.newWish")}
      </Button>
      {viewer.signedIn && (
        <NewWishDialog
          slug={slug}
          open={writing}
          onOpenChange={setWriting}
          onCreated={onCreated}
        />
      )}
    </>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-line bg-surface px-4 py-3 text-ink-2">
      {children}
    </p>
  );
}
