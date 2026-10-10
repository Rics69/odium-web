"use client";

import type { Route } from "next";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextLink } from "@/components/ui/text-link";
import { useToast } from "@/components/ui/toast";
import { ApiRequestError, apiSend } from "@/lib/api-client";
import { formatDateTime, t, tp } from "@/lib/i18n";
import type { AdminWish } from "@/lib/server/admin-wishes";
import {
  adminWishPatchSchema,
  moderatorReasons,
  REPLY_MAX,
  type AdminWishPatch,
} from "@/lib/validation/admin-wishes";
import {
  BODY_MAX,
  TITLE_MAX,
  wishStatuses,
  type WishStatus,
  type WishType,
} from "@/lib/validation/wishes";
import { hiddenReasonLabel, statusLabel } from "@/lib/wish-labels";
import { MergePanel, type MergeResult } from "./merge-panel";

type Reason = (typeof moderatorReasons)[number];
type Errors = Record<string, string | undefined>;

/** Field errors of a failed check, by dotted path ("text.title"). */
function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const found: Errors = {};
  for (const issue of issues) found[issue.path.join(".")] ??= issue.message;
  return found;
}

/**
 * One wish in the moderator's hands (spec, section 6). Only what changed
 * is sent; the server writes each kind of change to the journal.
 */
export function WishEditor({
  wish,
  onClose,
  onSaved,
  onDeleted,
  onMerged,
}: {
  wish: AdminWish;
  onClose: () => void;
  onSaved: (wish: AdminWish) => void;
  onDeleted: (id: string) => void;
  onMerged: (result: MergeResult) => void;
}) {
  const toast = useToast();
  const [status, setStatus] = useState<WishStatus>(wish.status);
  const [version, setVersion] = useState(wish.doneVersion ?? "");
  const [reply, setReply] = useState(wish.studioReply ?? "");
  const [hidden, setHidden] = useState(wish.hidden);
  // A stop word's "flagged" is not a moderator's reason: one is chosen.
  const [reason, setReason] = useState<Reason | "">(
    wish.hiddenReason === "flagged" ? "" : (wish.hiddenReason ?? ""),
  );
  const [type, setType] = useState<WishType>(wish.type);
  const [title, setTitle] = useState(wish.title);
  const [body, setBody] = useState(wish.body);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function changes(): AdminWishPatch {
    const patch: AdminWishPatch = {};
    if (status !== wish.status) patch.status = status;
    if (status === "done" && version.trim() !== (wish.doneVersion ?? "")) {
      patch.doneVersion = version;
    }
    if (reply.trim() !== (wish.studioReply ?? "")) patch.studioReply = reply;
    if (hidden !== wish.hidden || (hidden && reason !== wish.hiddenReason)) {
      patch.hidden = hidden;
      if (hidden && reason) patch.hiddenReason = reason;
    }
    if (type !== wish.type || title !== wish.title || body !== wish.body) {
      patch.text = { type, title, body };
    }
    return patch;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const patch = changes();
    if (Object.keys(patch).length === 0) {
      toast({ title: t("admin.wishes.noChanges") });
      onClose();
      return;
    }
    const parsed = adminWishPatchSchema.safeParse(patch);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const { wish: saved } = await apiSend<{ wish: AdminWish }>(
        "PATCH",
        `/api/admin/wishes/${wish.id}`,
        parsed.data,
      );
      toast({ title: t("admin.wishes.saved"), tone: "success" });
      onSaved(saved);
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        Object.keys(error.fields).length
      ) {
        setErrors(error.fields);
      } else {
        setFormError(
          error instanceof ApiRequestError
            ? error.message
            : t("errors.internal"),
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await apiSend("DELETE", `/api/admin/wishes/${wish.id}`, {});
      toast({ title: t("admin.wishes.deleted"), tone: "success" });
      onDeleted(wish.id);
    } catch (error) {
      toast({
        title:
          error instanceof ApiRequestError
            ? error.message
            : t("errors.internal"),
        tone: "error",
      });
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        fullScreenOnPhone
        title={t("admin.wishes.editorTitle")}
        description={
          <>
            {wish.game.title} ·{" "}
            {wish.author?.nickname ?? t("board.deletedAuthor")} ·{" "}
            {formatDateTime(new Date(wish.createdAt))} ·{" "}
            {tp("board.votes", wish.votesCount)}
          </>
        }
        closeLabel={t("common.close")}
      >
        <form noValidate onSubmit={save} className="flex flex-col gap-6">
          <TextLink
            href={`/games/${wish.game.slug}/wishes/${wish.id}` as Route}
            target="_blank"
            className="w-fit text-sm"
          >
            {t("admin.wishes.openOnSite")}
          </TextLink>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("admin.wishes.status")} error={errors.status}>
              {(control) => (
                <Select
                  {...control}
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as WishStatus)
                  }
                >
                  {wishStatuses.map((value) => (
                    <option key={value} value={value}>
                      {t(statusLabel[value])}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {status === "done" && (
              <Field
                label={t("admin.wishes.version")}
                hint={t("admin.wishes.versionHint")}
                error={errors.doneVersion}
              >
                {(control) => (
                  <Input
                    {...control}
                    value={version}
                    maxLength={30}
                    onChange={(event) => setVersion(event.target.value)}
                  />
                )}
              </Field>
            )}
          </div>

          <Field
            label={t("admin.wishes.reply")}
            hint={t("admin.wishes.replyHint")}
            error={errors.studioReply}
            count={{ value: reply.trim().length, max: REPLY_MAX }}
          >
            {(control) => (
              <Textarea
                {...control}
                rows={3}
                value={reply}
                onChange={(event) => setReply(event.target.value)}
              />
            )}
          </Field>

          <div className="flex flex-col gap-3">
            {wish.hiddenReason === "flagged" && hidden && !reason && (
              <p className="rounded-md bg-remove-soft px-4 py-3 text-sm text-remove">
                {t("admin.wishes.flaggedNote")}
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("admin.wishes.visibility")}>
                {(control) => (
                  <Select
                    {...control}
                    value={hidden ? "hidden" : "visible"}
                    onChange={(event) =>
                      setHidden(event.target.value === "hidden")
                    }
                  >
                    <option value="visible">{t("admin.wishes.visible")}</option>
                    <option value="hidden">{t("admin.wishes.hidden")}</option>
                  </Select>
                )}
              </Field>
              {hidden && (
                <Field
                  label={t("admin.wishes.reason")}
                  error={errors.hiddenReason}
                >
                  {(control) => (
                    <Select
                      {...control}
                      value={reason}
                      onChange={(event) =>
                        setReason(event.target.value as Reason | "")
                      }
                    >
                      <option value="" disabled>
                        —
                      </option>
                      {moderatorReasons.map((value) => (
                        <option key={value} value={value}>
                          {t(hiddenReasonLabel[value])}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              )}
            </div>
          </div>

          <fieldset className="flex flex-col gap-4 border-t border-line pt-6">
            <legend className="sr-only">{t("admin.wishes.text")}</legend>
            <SegmentedControl<WishType>
              label={t("board.typeLabel")}
              value={type}
              onChange={setType}
              options={[
                { value: "add", label: t("wishType.add") },
                { value: "remove", label: t("wishType.remove") },
              ]}
              className="self-start"
            />
            <Field
              label={t("board.form.titleLabel")}
              error={errors["text.title"]}
              count={{ value: title.trim().length, max: TITLE_MAX }}
            >
              {(control) => (
                <Input
                  {...control}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              )}
            </Field>
            <Field
              label={t("board.form.bodyLabel")}
              error={errors["text.body"]}
              count={{ value: body.trim().length, max: BODY_MAX }}
            >
              {(control) => (
                <Textarea
                  {...control}
                  rows={4}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
              )}
            </Field>
          </fieldset>

          {wish.mergedInto ? (
            <p className="rounded-md bg-paper px-4 py-3 text-sm">
              {t("admin.wishes.mergedInto", { title: wish.mergedInto.title })}
            </p>
          ) : (
            <MergePanel wish={wish} onMerged={onMerged} />
          )}

          {formError && (
            <p role="alert" className="text-error">
              {formError}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button type="submit" loading={saving}>
              {t("admin.wishes.save")}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => setConfirmDelete(true)}
            >
              {t("admin.wishes.delete")}
            </Button>
          </div>
        </form>

        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent
            title={t("admin.wishes.deleteTitle")}
            description={t("admin.wishes.deleteText")}
            closeLabel={t("common.close")}
          >
            <Button variant="danger" loading={deleting} onClick={remove}>
              {t("admin.wishes.delete")}
            </Button>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
