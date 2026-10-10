"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ApiRequestError, apiGet, apiSend } from "@/lib/api-client";
import { t, tp } from "@/lib/i18n";
import type { AdminWish } from "@/lib/server/admin-wishes";
import { statusLabel } from "@/lib/wish-labels";

const SEARCH_PAUSE_MS = 300;

export type MergeResult = {
  wish: AdminWish;
  original: AdminWish;
  movedVotes: number;
};

/**
 * «Объединить с оригиналом» (spec, section 6): folded until opened, then
 * the closest titles of the same game, or those found by a search.
 */
export function MergePanel({
  wish,
  onMerged,
}: {
  wish: AdminWish;
  onMerged: (result: MergeResult) => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<AdminWish[] | null>(null);
  const [chosen, setChosen] = useState<AdminWish | null>(null);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!open) return;
    let current = true;
    const timer = setTimeout(() => {
      apiGet<{ wishes: AdminWish[] }>(
        `/api/admin/wishes/${wish.id}/originals?q=${encodeURIComponent(search.trim())}`,
      )
        .then((data) => current && setCandidates(data.wishes))
        .catch(() => current && setCandidates([]));
    }, SEARCH_PAUSE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [open, search, wish.id]);

  async function merge() {
    if (!chosen) return;
    setMerging(true);
    try {
      const result = await apiSend<MergeResult>(
        "POST",
        `/api/admin/wishes/${wish.id}/merge`,
        { targetId: chosen.id },
      );
      toast({
        title: t("admin.wishes.merged", { count: result.movedVotes }),
        tone: "success",
      });
      onMerged(result);
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? (Object.values(error.fields)[0] ?? error.message)
          : t("errors.internal");
      toast({ title: message, tone: "error" });
    } finally {
      setMerging(false);
      setChosen(null);
    }
  }

  return (
    <details
      className="group rounded-md border border-line"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="flex min-h-11 cursor-pointer items-center px-4 font-medium">
        {t("admin.wishes.mergeTitle")}
      </summary>
      <div className="flex flex-col gap-4 border-t border-line p-4">
        <p className="text-sm text-ink-2">{t("admin.wishes.mergeHint")}</p>
        <Input
          type="search"
          aria-label={t("admin.wishes.mergeSearch")}
          placeholder={t("admin.wishes.mergeSearch")}
          value={search}
          maxLength={100}
          onChange={(event) => setSearch(event.target.value)}
          // It sits inside the editor's form: Enter must not save it.
          onKeyDown={(event) => event.key === "Enter" && event.preventDefault()}
        />
        {!search.trim() && (
          <p className="text-sm font-medium text-ink-2">
            {t("admin.wishes.mergeSimilar")}
          </p>
        )}
        {candidates?.length === 0 && (
          <p className="text-sm text-ink-2">{t("admin.wishes.mergeNone")}</p>
        )}
        {candidates && candidates.length > 0 && (
          <ul className="flex flex-col divide-y divide-line">
            {candidates.map((candidate) => (
              <li
                key={candidate.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-medium break-words">{candidate.title}</p>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-ink-3">
                    <Badge>{t(statusLabel[candidate.status])}</Badge>
                    {tp("board.votes", candidate.votesCount)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setChosen(candidate)}
                >
                  {t("admin.wishes.mergeChoose")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={chosen !== null}
        onOpenChange={(value) => !value && setChosen(null)}
      >
        <DialogContent
          title={t("admin.wishes.mergeConfirmTitle", {
            title: chosen?.title ?? "",
          })}
          description={t("admin.wishes.mergeConfirmText")}
          closeLabel={t("common.close")}
        >
          <Button loading={merging} onClick={merge}>
            {t("admin.wishes.mergeChoose")}
          </Button>
        </DialogContent>
      </Dialog>
    </details>
  );
}
