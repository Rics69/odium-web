"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Markdown } from "@/components/ui/markdown";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextLink } from "@/components/ui/text-link";
import { useToast } from "@/components/ui/toast";
import { ApiRequestError, apiSend } from "@/lib/api-client";
import { statusLabel, storeLabel } from "@/lib/games";
import { t } from "@/lib/i18n";
import type { AdminGame } from "@/lib/server/admin-games";
import { slugify } from "@/lib/slug";
import {
  DESCRIPTION_MAX,
  gameInputSchema,
  GENRE_MAX,
  TAGLINE_MAX,
  TITLE_MAX,
} from "@/lib/validation/admin-games";
import {
  gameStatuses,
  SLUG_MAX,
  stores,
  type GameStatus,
  type Screenshot,
  type Store,
} from "@/lib/validation/games";
import { CoverField, ScreenshotsField } from "./media-fields";

type Values = {
  title: string;
  slug: string;
  tagline: string;
  descriptionMd: string;
  genre: string;
  coverUrl: string | null;
  screenshots: Screenshot[];
  trailerUrl: string;
  platforms: { store: Store; url: string }[];
  status: GameStatus;
  releaseDate: string;
  sortOrder: string;
  wishesOpen: boolean;
  published: boolean;
};

type Errors = Record<string, string | undefined>;

function initialValues(game: AdminGame | null): Values {
  return {
    title: game?.title ?? "",
    slug: game?.slug ?? "",
    tagline: game?.tagline ?? "",
    descriptionMd: game?.descriptionMd ?? "",
    genre: game?.genre ?? "",
    coverUrl: game?.coverUrl ?? null,
    screenshots: game?.screenshots ?? [],
    trailerUrl: game?.trailerUrl ?? "",
    platforms: (game?.platforms ?? []).map((link) => ({
      store: link.store,
      url: link.url ?? "",
    })),
    status: game?.status ?? "in_development",
    releaseDate: game?.releaseDate ?? "",
    sortOrder: String(game?.sortOrder ?? 0),
    wishesOpen: game?.wishesOpen ?? true,
    published: game?.published ?? false,
  };
}

/**
 * A game's form (spec, section 6), new or existing. Checked with the API's
 * own schema before sending; a new game is a draft until "published".
 */
export function GameForm({ game }: { game: AdminGame | null }) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState(() => initialValues(game));
  // A new game's address follows its title until typed by hand.
  const [slugTouched, setSlugTouched] = useState(game !== null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<"write" | "preview">("write");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const parsed = gameInputSchema.safeParse({
      ...values,
      platforms: values.platforms.map((link) => ({
        store: link.store,
        url: link.url.trim() || null,
      })),
    });
    if (!parsed.success) {
      const found: Errors = {};
      for (const issue of parsed.error.issues) {
        found[issue.path.join(".")] ??= issue.message;
      }
      setErrors(found);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (game) {
        await apiSend("PATCH", `/api/admin/games/${game.id}`, parsed.data);
        toast({ title: t("admin.games.saved"), tone: "success" });
        router.refresh();
      } else {
        const created = await apiSend<{ id: string }>(
          "POST",
          "/api/admin/games",
          parsed.data,
        );
        toast({ title: t("admin.games.created"), tone: "success" });
        router.push(`/admin/games/${created.id}` as Route);
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
      setSaving(false);
    }
  }

  async function remove() {
    if (!game) return;
    setDeleting(true);
    try {
      await apiSend("DELETE", `/api/admin/games/${game.id}`, {});
      toast({ title: t("admin.games.deleted"), tone: "success" });
      router.push("/admin/games");
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

  const usedStores = new Set(values.platforms.map((link) => link.store));
  const freeStore = stores.find((store) => !usedStores.has(store));

  return (
    <form noValidate onSubmit={save} className="flex max-w-3xl flex-col gap-6">
      <Section title={t("admin.games.main")}>
        <Field
          label={t("admin.games.title")}
          error={errors.title}
          count={{ value: values.title.trim().length, max: TITLE_MAX }}
        >
          {(control) => (
            <Input
              {...control}
              value={values.title}
              onChange={(event) => {
                set("title", event.target.value);
                if (!slugTouched) set("slug", slugify(event.target.value));
              }}
            />
          )}
        </Field>
        <Field
          label={t("admin.games.slug")}
          hint={t("admin.games.slugHint")}
          error={errors.slug}
        >
          {(control) => (
            <Input
              {...control}
              value={values.slug}
              maxLength={SLUG_MAX}
              autoCapitalize="none"
              spellCheck={false}
              onChange={(event) => {
                setSlugTouched(true);
                set("slug", event.target.value);
              }}
            />
          )}
        </Field>
        <Field
          label={t("admin.games.tagline")}
          error={errors.tagline}
          count={{ value: values.tagline.trim().length, max: TAGLINE_MAX }}
        >
          {(control) => (
            <Input
              {...control}
              value={values.tagline}
              onChange={(event) => set("tagline", event.target.value)}
            />
          )}
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("admin.games.genre")} error={errors.genre}>
            {(control) => (
              <Input
                {...control}
                value={values.genre}
                maxLength={GENRE_MAX}
                onChange={(event) => set("genre", event.target.value)}
              />
            )}
          </Field>
          <Field label={t("admin.games.status")} error={errors.status}>
            {(control) => (
              <Select
                {...control}
                value={values.status}
                onChange={(event) =>
                  set("status", event.target.value as GameStatus)
                }
              >
                {gameStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label={t("admin.games.releaseDate")}
            error={errors.releaseDate}
          >
            {(control) => (
              <Input
                {...control}
                type="date"
                value={values.releaseDate}
                onChange={(event) => set("releaseDate", event.target.value)}
              />
            )}
          </Field>
          <Field
            label={t("admin.games.sortOrder")}
            hint={t("admin.games.sortOrderHint")}
            error={errors.sortOrder}
          >
            {(control) => (
              <Input
                {...control}
                type="number"
                inputMode="numeric"
                value={values.sortOrder}
                onChange={(event) => set("sortOrder", event.target.value)}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section title={t("admin.games.description")}>
        <SegmentedControl<"write" | "preview">
          label={t("admin.games.description")}
          value={preview}
          onChange={setPreview}
          options={[
            { value: "write", label: t("admin.games.write") },
            { value: "preview", label: t("admin.games.preview") },
          ]}
          className="self-start"
        />
        {preview === "write" ? (
          <Field
            label={t("admin.games.description")}
            hint={t("admin.games.descriptionHint")}
            error={errors.descriptionMd}
            count={{
              value: values.descriptionMd.trim().length,
              max: DESCRIPTION_MAX,
            }}
          >
            {(control) => (
              <Textarea
                {...control}
                rows={12}
                value={values.descriptionMd}
                onChange={(event) => set("descriptionMd", event.target.value)}
              />
            )}
          </Field>
        ) : values.descriptionMd.trim() ? (
          <Markdown className="rounded-md border border-line p-4 text-lg">
            {values.descriptionMd}
          </Markdown>
        ) : (
          <p className="text-ink-2">{t("admin.games.previewEmpty")}</p>
        )}
      </Section>

      <Section title={t("admin.games.cover")}>
        <CoverField
          value={values.coverUrl}
          onChange={(url) => set("coverUrl", url)}
          error={errors.coverUrl}
        />
      </Section>

      <Section title={t("admin.games.screenshots")}>
        <ScreenshotsField
          value={values.screenshots}
          onChange={(screenshots) => set("screenshots", screenshots)}
          errors={errors}
        />
      </Section>

      <Section title={t("admin.games.trailer")}>
        <Field
          label={t("admin.games.trailer")}
          hint={t("admin.games.trailerHint")}
          error={errors.trailerUrl}
        >
          {(control) => (
            <Input
              {...control}
              type="url"
              inputMode="url"
              placeholder="https://www.youtube.com/watch?v=…"
              value={values.trailerUrl}
              onChange={(event) => set("trailerUrl", event.target.value)}
            />
          )}
        </Field>
      </Section>

      <Section title={t("admin.games.stores")}>
        <p className="text-sm text-ink-2">{t("admin.games.storesHint")}</p>
        {values.platforms.map((link, index) => (
          <div
            key={link.store}
            className="grid gap-3 md:grid-cols-[12rem_1fr_auto] md:items-start"
          >
            <Select
              aria-label={t("admin.games.store")}
              value={link.store}
              onChange={(event) =>
                set(
                  "platforms",
                  values.platforms.map((item, i) =>
                    i === index
                      ? { ...item, store: event.target.value as Store }
                      : item,
                  ),
                )
              }
            >
              {stores.map((store) => (
                <option
                  key={store}
                  value={store}
                  disabled={store !== link.store && usedStores.has(store)}
                >
                  {storeLabel(store)}
                </option>
              ))}
            </Select>
            <div className="flex flex-col gap-1">
              <Input
                aria-label={t("admin.games.storeUrl")}
                aria-invalid={
                  errors[`platforms.${index}.url`] ? true : undefined
                }
                type="url"
                inputMode="url"
                placeholder="https://"
                value={link.url}
                onChange={(event) =>
                  set(
                    "platforms",
                    values.platforms.map((item, i) =>
                      i === index ? { ...item, url: event.target.value } : item,
                    ),
                  )
                }
              />
              {errors[`platforms.${index}.url`] && (
                <p className="text-sm text-error">
                  {errors[`platforms.${index}.url`]}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                set(
                  "platforms",
                  values.platforms.filter((_, i) => i !== index),
                )
              }
            >
              {t("admin.games.remove")}
            </Button>
          </div>
        ))}
        {errors.platforms && (
          <p className="text-sm text-error">{errors.platforms}</p>
        )}
        {freeStore && (
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() =>
              set("platforms", [
                ...values.platforms,
                { store: freeStore, url: "" },
              ])
            }
          >
            {t("admin.games.addStore")}
          </Button>
        )}
      </Section>

      <Section title={t("admin.games.visibility")}>
        <Check
          checked={values.wishesOpen}
          onChange={(checked) => set("wishesOpen", checked)}
          label={t("admin.games.wishesOpen")}
          hint={t("admin.games.wishesOpenHint")}
        />
        <Check
          checked={values.published}
          onChange={(checked) => set("published", checked)}
          label={t("admin.games.publishedLabel")}
          hint={t("admin.games.publishedHint")}
        />
      </Section>

      {formError && (
        <p role="alert" className="text-error">
          {formError}
        </p>
      )}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4 shadow-md">
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" loading={saving}>
            {t("admin.games.save")}
          </Button>
          {game?.published && (
            <TextLink
              href={`/games/${game.slug}` as Route}
              target="_blank"
              className="text-sm"
            >
              {t("admin.games.openOnSite")}
            </TextLink>
          )}
        </div>
        {game &&
          (game.wishesCount > 0 ? (
            <p className="max-w-sm text-sm text-ink-2">
              {t("admin.games.errors.hasWishes")}
            </p>
          ) : (
            <Button
              type="button"
              variant="danger"
              onClick={() => setConfirmDelete(true)}
            >
              {t("admin.games.delete")}
            </Button>
          ))}
      </div>

      {game && (
        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent
            title={t("admin.games.deleteTitle", { title: game.title })}
            description={t("admin.games.deleteText")}
            closeLabel={t("common.close")}
          >
            <Button variant="danger" loading={deleting} onClick={remove}>
              {t("admin.games.delete")}
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-display text-h4">{title}</h2>
      {children}
    </Card>
  );
}

function Check({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        className="mt-1 size-5 shrink-0 accent-accent"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="flex flex-col gap-1">
        <span className="font-medium">{label}</span>
        <span className="text-sm text-ink-2">{hint}</span>
      </span>
    </label>
  );
}
