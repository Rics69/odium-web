"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/api-client";
import { boardSearch } from "@/lib/board-url";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import type { BoardPage } from "@/lib/server/board";
import type { WishView } from "@/lib/server/wishes";
import {
  wishStatuses,
  type BoardQuery,
  type BoardSort,
} from "@/lib/validation/wishes";
import { BoardProvider, useBoard, type Viewer } from "./board-context";
import { NewWishDialog } from "./wish-form-dialog";
import { statusLabel } from "@/lib/wish-labels";
import { WishCard } from "./wish-card";

const SEARCH_PAUSE_MS = 350;

/**
 * The board: choices in the address, the first page from the server, more
 * pages from the API. A change of choice is a navigation, so the server
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
  const { viewer } = useBoard();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [navigating, startNavigation] = useTransition();
  const [pages, setPages] = useState(initial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState(query.q ?? "");

  function choose(change: Partial<BoardQuery>) {
    const next = boardSearch({ ...query, cursor: undefined, ...change });
    startNavigation(() =>
      router.replace(`${pathname}${next ? `?${next}` : ""}` as Route, {
        scroll: false,
      }),
    );
  }

  // Search after a pause in typing, not on every key.
  useEffect(() => {
    const value = search.trim();
    if (value === (query.q ?? "")) return;
    const timer = setTimeout(
      () => choose({ q: value || undefined }),
      SEARCH_PAUSE_MS,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- choose changes every render
  }, [search]);

  async function loadMore() {
    if (!pages.nextCursor) return;
    setLoadingMore(true);
    try {
      const response = await fetch(
        `/api/games/${slug}/wishes?${boardSearch({ ...query, cursor: pages.nextCursor })}`,
      );
      const data = (await response.json()) as BoardPage & {
        error?: { message: string };
      };
      if (!response.ok) {
        throw new ApiRequestError(
          "",
          data.error?.message ?? t("errors.internal"),
        );
      }
      setPages((current) => ({
        wishes: [...current.wishes, ...data.wishes],
        nextCursor: data.nextCursor,
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

  const filtered = Boolean(
    query.type || query.status || query.q || query.mine || query.voted,
  );

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
      <div className="flex flex-col gap-4">
        {/* On a phone the four sorts scroll sideways instead of wrapping. */}
        <div className="-mx-4 [scrollbar-width:none] overflow-x-auto px-4 md:mx-0 md:px-0">
          <SegmentedControl<BoardSort>
            nowrap
            label={t("board.sortLabel")}
            value={query.sort}
            onChange={(sort) => choose({ sort })}
            options={[
              { value: "top", label: t("board.sortTop") },
              { value: "new", label: t("board.sortNew") },
              { value: "trending", label: t("board.sortTrending") },
              { value: "old", label: t("board.sortOld") },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl<"all" | "add" | "remove">
            label={t("board.typeLabel")}
            value={query.type ?? "all"}
            onChange={(type) =>
              choose({ type: type === "all" ? undefined : type })
            }
            options={[
              { value: "all", label: t("board.typeAll") },
              { value: "add", label: t("wishType.add") },
              { value: "remove", label: t("wishType.remove") },
            ]}
          />
          <label className="sr-only" htmlFor="board-status">
            {t("board.statusLabel")}
          </label>
          <select
            id="board-status"
            value={query.status ?? ""}
            onChange={(event) =>
              choose({
                status: (event.target.value ||
                  undefined) as BoardQuery["status"],
              })
            }
            className="min-h-11 rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-ink focus:border-accent focus:outline-none"
          >
            <option value="">{t("board.statusActive")}</option>
            {wishStatuses.map((status) => (
              <option key={status} value={status}>
                {t(statusLabel[status])}
              </option>
            ))}
            <option value="all">{t("board.statusAll")}</option>
          </select>
          {viewer.signedIn && (
            <>
              <Toggle
                pressed={Boolean(query.mine)}
                onClick={() => choose({ mine: query.mine ? undefined : "1" })}
              >
                {t("board.mine")}
              </Toggle>
              <Toggle
                pressed={Boolean(query.voted)}
                onClick={() => choose({ voted: query.voted ? undefined : "1" })}
              >
                {t("board.voted")}
              </Toggle>
            </>
          )}
        </div>
        <Input
          type="search"
          aria-label={t("board.searchLabel")}
          placeholder={t("board.searchPlaceholder")}
          value={search}
          maxLength={100}
          onChange={(event) => setSearch(event.target.value)}
          className="md:max-w-md"
        />
      </div>

      <div
        aria-busy={navigating}
        className={cn("transition-opacity", navigating && "opacity-60")}
      >
        {pages.wishes.length === 0 ? (
          filtered ? (
            <EmptyState
              title={t("board.nothingTitle")}
              text={t("board.nothingText")}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    choose({
                      type: undefined,
                      status: undefined,
                      q: undefined,
                      mine: undefined,
                      voted: undefined,
                    });
                  }}
                >
                  {t("board.reset")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              title={t("board.emptyTitle")}
              text={t("board.emptyText")}
            />
          )
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

function Toggle({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-md border px-4 text-sm font-medium transition-colors",
        pressed
          ? "border-accent bg-accent/10 text-accent-deep"
          : "border-line-strong bg-surface text-ink-2 hover:text-ink",
      )}
    >
      {children}
    </button>
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
