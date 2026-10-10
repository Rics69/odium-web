"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ApiRequestError, apiGet, apiSend } from "@/lib/api-client";
import { formatRelativeTime, t, tp } from "@/lib/i18n";
import type { AdminWish, AdminWishesPage } from "@/lib/server/admin-wishes";
import {
  moderatorReasons,
  REPLY_MAX,
  type AdminWishBulk,
  type AdminWishesQuery,
} from "@/lib/validation/admin-wishes";
import { wishStatuses, type WishStatus } from "@/lib/validation/wishes";
import { hiddenReasonLabel, statusLabel, typeLabel } from "@/lib/wish-labels";
import { WishEditor } from "./wish-editor";

type BulkAction = AdminWishBulk["action"];
type Reason = (typeof moderatorReasons)[number];

/** The query string of a page of the table, empty choices left out. */
function search(query: AdminWishesQuery, cursor: string) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, cursor })) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

/**
 * The moderation table: the first page from the server, more by a button.
 * A title opens the editor; checkboxes gather rows for one action.
 */
export function AdminWishes({
  query,
  initial,
}: {
  query: AdminWishesQuery;
  initial: AdminWishesPage;
}) {
  const toast = useToast();
  const [pages, setPages] = useState(initial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<AdminWish | null>(null);

  function replace(changed: AdminWish[]) {
    const byId = new Map(changed.map((wish) => [wish.id, wish]));
    setPages((current) => ({
      ...current,
      wishes: current.wishes.map((wish) => byId.get(wish.id) ?? wish),
    }));
  }

  function remove(ids: string[]) {
    const gone = new Set(ids);
    setPages((current) => ({
      ...current,
      wishes: current.wishes.filter((wish) => !gone.has(wish.id)),
    }));
    setSelected(
      (current) => new Set([...current].filter((id) => !gone.has(id))),
    );
  }

  async function loadMore() {
    if (!pages.nextCursor) return;
    setLoadingMore(true);
    try {
      const next = await apiGet<AdminWishesPage>(
        `/api/admin/wishes?${search(query, pages.nextCursor)}`,
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

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (pages.wishes.length === 0) {
    return (
      <EmptyState
        title={t("admin.wishes.emptyTitle")}
        text={t("admin.wishes.emptyText")}
      />
    );
  }

  const allSelected = pages.wishes.every((wish) => selected.has(wish.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-line bg-surface">
        <label className="flex min-h-11 items-center gap-3 border-b border-line px-4 text-sm text-ink-2">
          <input
            type="checkbox"
            className="size-5 accent-accent"
            checked={allSelected}
            onChange={() =>
              setSelected(
                allSelected
                  ? new Set()
                  : new Set(pages.wishes.map((wish) => wish.id)),
              )
            }
          />
          {t("admin.wishes.selectAll")}
        </label>
        <ul className="divide-y divide-line">
          {pages.wishes.map((wish) => (
            <WishRow
              key={wish.id}
              wish={wish}
              selected={selected.has(wish.id)}
              onToggle={() => toggle(wish.id)}
              onOpen={() => setEditing(wish)}
            />
          ))}
        </ul>
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

      {selected.size > 0 && (
        <BulkBar
          ids={[...selected]}
          onClear={() => setSelected(new Set())}
          onDone={(action, changedIds, changed) => {
            if (action === "delete") remove(changedIds);
            else replace(changed);
            setSelected(new Set());
          }}
        />
      )}

      {editing && (
        <WishEditor
          key={editing.id}
          wish={editing}
          onClose={() => setEditing(null)}
          onSaved={(wish) => {
            replace([wish]);
            setEditing(null);
          }}
          onDeleted={(id) => {
            remove([id]);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function WishRow({
  wish,
  selected,
  onToggle,
  onOpen,
}: {
  wish: AdminWish;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <li className="flex gap-3 px-4 py-4">
      <input
        type="checkbox"
        aria-label={t("admin.wishes.select", { title: wish.title })}
        className="mt-1 size-5 shrink-0 accent-accent"
        checked={selected}
        onChange={onToggle}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge tone={wish.type}>{t(typeLabel[wish.type])}</Badge>
          <Badge tone={wish.status === "done" ? "add" : "neutral"}>
            {t(statusLabel[wish.status])}
            {wish.status === "done" && wish.doneVersion
              ? ` ${t("board.doneVersion", { version: wish.doneVersion })}`
              : ""}
          </Badge>
          {wish.hidden &&
            (wish.hiddenReason === "flagged" || !wish.hiddenReason ? (
              <Badge tone="remove">{t("admin.wishes.reviewBadge")}</Badge>
            ) : (
              <Badge tone="remove">
                {t("admin.wishes.hiddenBadge", {
                  reason: t(hiddenReasonLabel[wish.hiddenReason]),
                })}
              </Badge>
            ))}
          {wish.studioReply && (
            <Badge tone="accent">{t("board.studioReply")}</Badge>
          )}
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="w-fit text-left font-semibold break-words transition-colors hover:text-accent"
        >
          {wish.title}
        </button>
        {wish.body && (
          <p className="line-clamp-2 text-sm break-words text-ink-2">
            {wish.body}
          </p>
        )}
        <p className="text-sm text-ink-3">
          {wish.game.title} ·{" "}
          {wish.author?.nickname ?? t("board.deletedAuthor")} ·{" "}
          <time dateTime={wish.createdAt} suppressHydrationWarning>
            {formatRelativeTime(new Date(wish.createdAt))}
          </time>{" "}
          · {tp("board.votes", wish.votesCount)}
        </p>
      </div>
    </li>
  );
}

/** One action for the selected rows, at the bottom of the screen. */
function BulkBar({
  ids,
  onClear,
  onDone,
}: {
  ids: string[];
  onClear: () => void;
  onDone: (
    action: BulkAction,
    changedIds: string[],
    changed: AdminWish[],
  ) => void;
}) {
  const toast = useToast();
  const [action, setAction] = useState<BulkAction>("hide");
  const [reason, setReason] = useState<Reason>("spam");
  const [status, setStatus] = useState<WishStatus>("planned");
  const [version, setVersion] = useState("");
  const [reply, setReply] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  async function apply() {
    const input: AdminWishBulk =
      action === "hide"
        ? { action, ids, reason }
        : action === "status"
          ? {
              action,
              ids,
              status,
              ...(status === "done" && version && { doneVersion: version }),
              ...(reply.trim() && { studioReply: reply }),
            }
          : { action, ids };
    setSending(true);
    try {
      const result = await apiSend<{
        changedIds: string[];
        wishes: AdminWish[];
      }>("POST", "/api/admin/wishes/bulk", input);
      toast({
        title: t("admin.wishes.bulkDone", { count: result.changedIds.length }),
        tone: "success",
      });
      onDone(action, result.changedIds, result.wishes);
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? (Object.values(error.fields)[0] ?? error.message)
          : t("errors.internal");
      toast({ title: message, tone: "error" });
    } finally {
      setSending(false);
      setConfirming(false);
    }
  }

  return (
    <section
      aria-label={t("admin.wishes.selected", { count: ids.length })}
      className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium">
          {t("admin.wishes.selected", { count: ids.length })}
        </p>
        <button
          type="button"
          onClick={onClear}
          className="min-h-11 text-sm text-ink-2 transition-colors hover:text-accent"
        >
          {t("admin.wishes.clearSelection")}
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full md:w-56">
          <Select
            aria-label={t("admin.wishes.action")}
            value={action}
            onChange={(event) => setAction(event.target.value as BulkAction)}
          >
            <option value="hide">{t("admin.wishes.hide")}</option>
            <option value="show">{t("admin.wishes.show")}</option>
            <option value="status">{t("admin.wishes.setStatus")}</option>
            <option value="delete">{t("admin.wishes.delete")}</option>
          </Select>
        </div>
        {action === "hide" && (
          <div className="w-full md:w-56">
            <Select
              aria-label={t("admin.wishes.reason")}
              value={reason}
              onChange={(event) => setReason(event.target.value as Reason)}
            >
              {moderatorReasons.map((value) => (
                <option key={value} value={value}>
                  {t(hiddenReasonLabel[value])}
                </option>
              ))}
            </Select>
          </div>
        )}
        {action === "status" && (
          <div className="w-full md:w-56">
            <Select
              aria-label={t("admin.wishes.status")}
              value={status}
              onChange={(event) => setStatus(event.target.value as WishStatus)}
            >
              {wishStatuses.map((value) => (
                <option key={value} value={value}>
                  {t(statusLabel[value])}
                </option>
              ))}
            </Select>
          </div>
        )}
        {action === "status" && status === "done" && (
          <div className="w-full md:w-40">
            <Input
              aria-label={t("admin.wishes.version")}
              placeholder={t("admin.wishes.version")}
              value={version}
              maxLength={30}
              onChange={(event) => setVersion(event.target.value)}
            />
          </div>
        )}
        <Button
          loading={sending}
          variant={action === "delete" ? "danger" : "primary"}
          onClick={() => (action === "delete" ? setConfirming(true) : apply())}
        >
          {t("admin.wishes.applyBulk")}
        </Button>
      </div>
      {action === "status" && (
        <Textarea
          aria-label={t("admin.wishes.reply")}
          placeholder={t("admin.wishes.replyHint")}
          value={reply}
          maxLength={REPLY_MAX}
          rows={2}
          onChange={(event) => setReply(event.target.value)}
        />
      )}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent
          title={t("admin.wishes.bulkDeleteTitle")}
          description={t("admin.wishes.bulkDeleteText")}
          closeLabel={t("common.close")}
        >
          <Button variant="danger" loading={sending} onClick={apply}>
            {t("admin.wishes.delete")}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
