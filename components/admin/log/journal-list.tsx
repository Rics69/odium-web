"use client";

import type { Route } from "next";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TextLink } from "@/components/ui/text-link";
import { useToast } from "@/components/ui/toast";
import { adminActionLabel, adminTargetLabel } from "@/lib/admin-actions";
import { apiGet } from "@/lib/api-client";
import { formatDateTime } from "@/lib/i18n";
import { t } from "@/lib/i18n/admin";
import type { JournalEntry, JournalPage } from "@/lib/server/admin-journal";
import type { JournalQuery } from "@/lib/validation/admin-log";
import { hiddenReasonLabel } from "@/lib/wish-labels";
import { JournalChange } from "./journal-change";

/** The journal's entries: the first page from the server, more by a button. */
export function JournalList({
  query,
  initial,
}: {
  query: JournalQuery;
  initial: JournalPage;
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
      const next = await apiGet<JournalPage>(`/api/admin/log?${params}`);
      setPages((current) => ({
        entries: [...current.entries, ...next.entries],
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

  if (pages.entries.length === 0) {
    return (
      <EmptyState
        title={t("admin.log.emptyTitle")}
        text={t("admin.log.emptyText")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4">
        {pages.entries.map((entry) => (
          <Entry key={entry.id} entry={entry} />
        ))}
      </ol>
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

/** A wish's reason is a code (off_topic); a ban's is the admin's words. */
function reasonText(entry: JournalEntry): string | null {
  const { reason } = entry;
  if (!reason) return null;
  return entry.targetType === "wish" && reason in hiddenReasonLabel
    ? t(hiddenReasonLabel[reason as keyof typeof hiddenReasonLabel])
    : reason;
}

function Entry({ entry }: { entry: JournalEntry }) {
  const reason = reasonText(entry);
  const objectFilter = `/admin/log?type=${entry.targetType}&target=${encodeURIComponent(entry.targetId)}`;
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge tone="accent">{t(adminActionLabel[entry.action])}</Badge>
        <span className="text-sm text-ink-2">
          {t(adminTargetLabel[entry.targetType])}
        </span>
        {entry.targetHref ? (
          <TextLink
            href={entry.targetHref as Route}
            className="text-sm font-medium break-words"
          >
            {entry.targetTitle ?? t(adminTargetLabel[entry.targetType])}
          </TextLink>
        ) : (
          entry.targetTitle && (
            <span className="text-sm font-medium break-words">
              {entry.targetTitle}{" "}
              <span className="text-ink-3">({t("admin.log.gone")})</span>
            </span>
          )
        )}
      </div>
      <p className="text-sm text-ink-3">
        {entry.admin?.nickname ?? t("admin.log.deletedAdmin")}
        {" · "}
        <time dateTime={entry.createdAt}>
          {formatDateTime(new Date(entry.createdAt))}
        </time>
        {(entry.targetType === "wish" ||
          entry.targetType === "user" ||
          entry.targetType === "game") && (
          <>
            {" · "}
            <TextLink href={objectFilter as Route}>
              {t("admin.log.onlyTarget")}
            </TextLink>
          </>
        )}
      </p>
      {reason && <p className="text-sm">{t("admin.log.reason", { reason })}</p>}
      <JournalChange before={entry.before} after={entry.after} />
    </li>
  );
}
