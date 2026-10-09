"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";
import { ApiRequestError, apiPost } from "@/lib/api-client";
import { t } from "@/lib/i18n";
import type { WishView } from "@/lib/server/wishes";
import {
  BODY_MAX,
  TITLE_MAX,
  TITLE_MIN,
  wishInputSchema,
  type WishType,
} from "@/lib/validation/wishes";
import { VoteButton } from "./vote-button";
import { statusLabel } from "./wish-card";

const SIMILAR_PAUSE_MS = 400;
const CLOSE_MS = 300;

type Errors = Partial<Record<"type" | "title" | "body", string>>;

/**
 * The new wish form (spec, section 5): a whole screen on phones. While the
 * title is typed, up to three similar wishes slide in below it with their
 * vote buttons: often the idea is there already.
 */
export function NewWishDialog({
  slug,
  open,
  onOpenChange,
  onCreated,
}: {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (wish: WishView) => void;
}) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<WishType>("add");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [similar, setSimilar] = useState<WishView[]>([]);

  // Too short a title shows none; the last answer stays hidden meanwhile.
  const shownSimilar = title.trim().length >= TITLE_MIN ? similar : [];

  // Similar wishes after a pause in typing; an older answer never wins.
  useEffect(() => {
    const text = title.trim();
    if (text.length < TITLE_MIN) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/games/${slug}/wishes/similar?q=${encodeURIComponent(text)}`, {
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : { wishes: [] }))
        .then((data: { wishes: WishView[] }) => setSimilar(data.wishes))
        .catch(() => {});
    }, SIMILAR_PAUSE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug, title]);

  function reset() {
    setType("add");
    setTitle("");
    setBody("");
    setErrors({});
    setFormError(null);
    setSimilar([]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const parsed = wishInputSchema.safeParse({ type, title, body });
    if (!parsed.success) {
      const found: Errors = {};
      for (const issue of parsed.error.issues) {
        found[issue.path[0] as keyof Errors] ??= issue.message;
      }
      setErrors(found);
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>("[aria-invalid='true']")
          ?.focus(),
      );
      return;
    }

    setSending(true);
    try {
      const { wish } = await apiPost<{ wish: WishView }>(
        `/api/games/${slug}/wishes`,
        parsed.data,
      );
      onOpenChange(false);
      // After the closing animation; a dialog closed by accident keeps its
      // draft.
      setTimeout(reset, CLOSE_MS);
      if (wish.hidden) {
        toast({ title: t("board.form.flagged") });
      } else {
        onCreated(wish);
        toast({ title: t("board.form.published"), tone: "success" });
      }
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
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        fullScreenOnPhone
        title={t("board.form.title")}
        description={t("board.form.description")}
        closeLabel={t("common.close")}
      >
        <form
          ref={formRef}
          noValidate
          onSubmit={submit}
          className="flex flex-col gap-6"
        >
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
          <div className="flex flex-col gap-3">
            <Field
              label={t("board.form.titleLabel")}
              hint={t("board.form.titleHint")}
              error={errors.title}
              count={{ value: title.trim().length, max: TITLE_MAX }}
            >
              {(control) => (
                <Input
                  {...control}
                  name="title"
                  autoComplete="off"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setErrors((current) => ({ ...current, title: undefined }));
                  }}
                />
              )}
            </Field>
            <AnimatePresence initial={false}>
              {shownSimilar.length > 0 && (
                <motion.section
                  aria-live="polite"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-3 rounded-md border border-accent/30 bg-accent/5 p-4">
                    <h3 className="text-sm font-semibold text-accent-deep">
                      {t("board.form.similarTitle")}
                    </h3>
                    <ul className="flex flex-col gap-3">
                      {shownSimilar.map((wish) => (
                        <li key={wish.id} className="flex items-center gap-3">
                          <VoteButton
                            wishId={wish.id}
                            title={wish.title}
                            votesCount={wish.votesCount}
                            votedByMe={wish.votedByMe}
                            closed={
                              wish.status === "done" ||
                              wish.status === "declined"
                            }
                          />
                          <div className="flex min-w-0 flex-col gap-1">
                            <p className="font-medium break-words">
                              {wish.title}
                            </p>
                            <Badge className="self-start">
                              {t(statusLabel[wish.status])}
                            </Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
          <Field
            label={t("board.form.bodyLabel")}
            hint={t("board.form.bodyHint")}
            error={errors.body}
            count={{ value: body.trim().length, max: BODY_MAX }}
          >
            {(control) => (
              <Textarea
                {...control}
                name="body"
                rows={5}
                value={body}
                onChange={(event) => {
                  setBody(event.target.value);
                  setErrors((current) => ({ ...current, body: undefined }));
                }}
              />
            )}
          </Field>
          {formError && (
            <p role="alert" className="text-error">
              {formError}
            </p>
          )}
          <Button type="submit" doodle loading={sending} className="self-start">
            {t("board.form.submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
