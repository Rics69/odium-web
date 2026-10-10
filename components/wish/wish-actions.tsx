"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { WishFormDialog } from "@/components/board/wish-form-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ApiRequestError, apiSend } from "@/lib/api-client";
import { t, tp } from "@/lib/i18n";
import type { WishDetail, WishView } from "@/lib/server/wishes";

const MINUTE_MS = 60 * 1000;

/**
 * Copies text without the Clipboard API, which pages opened over plain
 * HTTP (a phone on the local network) do not get: a selected hidden field
 * and the old copy command.
 */
function copyBySelection(text: string): boolean {
  const field = document.createElement("textarea");
  field.value = text;
  field.readOnly = true;
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  field.setSelectionRange(0, text.length);
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Falls back below.
    }
  }
  return copyBySelection(text);
}

/**
 * «Поделиться»: the system share sheet on phones, a copied link elsewhere.
 * Both need HTTPS; without them the link is copied the old way, and if
 * even that fails the player is told to take it from the address bar.
 */
export function ShareButton({ title }: { title: string }) {
  const toast = useToast();

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      // A closed share sheet is not an error.
      await navigator.share({ title, url }).catch(() => {});
      return;
    }
    if (await copyText(url)) {
      toast({ title: t("wish.copied"), tone: "success" });
    } else {
      toast({ title: t("wish.copyFailed"), tone: "error" });
    }
  }

  return (
    <Button variant="secondary" onClick={share}>
      {t("wish.share")}
    </Button>
  );
}

/**
 * The author's edit and delete, while allowed: editing for 15 minutes
 * after posting, both only while the wish is "new".
 */
export function AuthorActions({ wish }: { wish: WishDetail }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const minutesLeft = useMinutesLeft(wish.editableUntil);

  async function remove() {
    setDeleting(true);
    try {
      await apiSend("DELETE", `/api/wishes/${wish.id}`, {});
      toast({ title: t("wish.deleted"), tone: "success" });
      router.replace(`/games/${wish.game.slug}/wishes` as Route);
    } catch (error) {
      setDeleting(false);
      toast({
        title:
          error instanceof ApiRequestError
            ? error.message
            : t("errors.internal"),
        tone: "error",
      });
    }
  }

  if (minutesLeft === 0 && !wish.canDelete) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {minutesLeft > 0 && (
        <>
          <Button variant="secondary" onClick={() => setEditing(true)}>
            {t("wish.edit")}
          </Button>
          <WishFormDialog
            slug={wish.game.slug}
            open={editing}
            onOpenChange={setEditing}
            heading={t("wish.editTitle")}
            submitLabel={t("wish.save")}
            initial={{ type: wish.type, title: wish.title, body: wish.body }}
            showSimilar={false}
            send={async (input) =>
              (
                await apiSend<{ wish: WishView }>(
                  "PATCH",
                  `/api/wishes/${wish.id}`,
                  input,
                )
              ).wish
            }
            onDone={() => {
              toast({ title: t("wish.saved"), tone: "success" });
              router.refresh();
            }}
          />
        </>
      )}
      {wish.canDelete && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost">{t("wish.delete")}</Button>
          </DialogTrigger>
          <DialogContent
            title={t("wish.deleteTitle")}
            description={t("wish.deleteText")}
            closeLabel={t("common.close")}
          >
            <Button variant="danger" loading={deleting} onClick={remove}>
              {t("wish.deleteConfirm")}
            </Button>
          </DialogContent>
        </Dialog>
      )}
      {minutesLeft > 0 && (
        <p className="text-sm text-ink-3">{tp("wish.editLeft", minutesLeft)}</p>
      )}
    </div>
  );
}

/** Whole minutes until the edit window closes, ticking down. */
function useMinutesLeft(until: string | null) {
  const left = () =>
    until
      ? Math.max(0, Math.ceil((Date.parse(until) - Date.now()) / MINUTE_MS))
      : 0;
  const [minutes, setMinutes] = useState(left);
  useEffect(() => {
    if (!until) return;
    const timer = setInterval(() => setMinutes(left()), 15 * 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- left reads until
  }, [until]);
  return minutes;
}
