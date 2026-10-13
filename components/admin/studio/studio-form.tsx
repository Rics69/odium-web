"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ApiRequestError, apiSend } from "@/lib/api-client";
import { t } from "@/lib/i18n/admin";
import {
  ABOUT_MAX,
  MISSION_MAX,
  SOCIALS_MAX,
  STUDIO_TAGLINE_MAX,
  studioInputSchema,
  TEAM_MAX,
  type StudioInput,
} from "@/lib/validation/admin-studio";

type Errors = Record<string, string | undefined>;

/** Swaps an item with its neighbour: up (-1) or down (+1). */
function moved<T>(list: T[], index: number, by: -1 | 1): T[] {
  const next = [...list];
  [next[index], next[index + by]] = [next[index + by]!, next[index]!];
  return next;
}

/** «О студии» (spec, section 6): the texts, the team, the links. */
export function StudioForm({ initial }: { initial: StudioInput }) {
  const toast = useToast();
  const [values, setValues] = useState({
    ...initial,
    contactEmail: initial.contactEmail ?? "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof values>(
    key: K,
    value: (typeof values)[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const parsed = studioInputSchema.safeParse(values);
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
      const { changed } = await apiSend<{ changed: boolean }>(
        "PUT",
        "/api/admin/studio",
        parsed.data,
      );
      toast({
        title: changed ? t("admin.studio.saved") : t("admin.studio.noChanges"),
        tone: "success",
      });
      // The form shows what was saved: trimmed, the email in lowercase.
      setValues({
        ...parsed.data,
        contactEmail: parsed.data.contactEmail ?? "",
      });
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        Object.keys(error.fields).length
      ) {
        setErrors(error.fields);
      } else {
        toast({
          title:
            error instanceof ApiRequestError
              ? error.message
              : t("errors.internal"),
          tone: "error",
        });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={save} className="flex max-w-3xl flex-col gap-6">
      <Section>
        <Field
          label={t("admin.studio.tagline")}
          hint={t("admin.studio.taglineHint")}
          error={errors.tagline}
          count={{
            value: values.tagline.trim().length,
            max: STUDIO_TAGLINE_MAX,
          }}
        >
          {(control) => (
            <Input
              {...control}
              value={values.tagline}
              onChange={(event) => set("tagline", event.target.value)}
            />
          )}
        </Field>
        <Field
          label={t("admin.studio.about")}
          hint={t("admin.studio.aboutHint")}
          error={errors.aboutMd}
          count={{ value: values.aboutMd.trim().length, max: ABOUT_MAX }}
        >
          {(control) => (
            <Textarea
              {...control}
              rows={4}
              value={values.aboutMd}
              onChange={(event) => set("aboutMd", event.target.value)}
            />
          )}
        </Field>
        <Field
          label={t("admin.studio.mission")}
          hint={t("admin.studio.missionHint")}
          error={errors.mission}
          count={{ value: values.mission.trim().length, max: MISSION_MAX }}
        >
          {(control) => (
            <Textarea
              {...control}
              rows={3}
              value={values.mission}
              onChange={(event) => set("mission", event.target.value)}
            />
          )}
        </Field>
      </Section>

      <Section title={t("admin.studio.team")} hint={t("admin.studio.teamHint")}>
        <ol className="flex flex-col gap-4">
          {values.team.map((member, index) => (
            <li
              key={index}
              className="flex flex-col gap-3 rounded-md border border-line p-4"
            >
              <p className="text-sm font-medium text-ink-2">
                {t("admin.studio.member", { number: index + 1 })}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label={t("admin.studio.role")}
                  error={errors[`team.${index}.role`]}
                >
                  {(control) => (
                    <Input
                      {...control}
                      value={member.role}
                      maxLength={80}
                      onChange={(event) =>
                        set(
                          "team",
                          values.team.map((item, i) =>
                            i === index
                              ? { ...item, role: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  )}
                </Field>
                <Field
                  label={t("admin.studio.name")}
                  hint={t("admin.studio.nameHint")}
                  error={errors[`team.${index}.name`]}
                >
                  {(control) => (
                    <Input
                      {...control}
                      value={member.name}
                      maxLength={80}
                      onChange={(event) =>
                        set(
                          "team",
                          values.team.map((item, i) =>
                            i === index
                              ? { ...item, name: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  )}
                </Field>
              </div>
              <Order
                index={index}
                length={values.team.length}
                onMove={(by) => set("team", moved(values.team, index, by))}
                onRemove={() =>
                  set(
                    "team",
                    values.team.filter((_, i) => i !== index),
                  )
                }
              />
            </li>
          ))}
        </ol>
        {values.team.length < TEAM_MAX && (
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() =>
              set("team", [
                ...values.team,
                { name: "", role: "", photoUrl: null },
              ])
            }
          >
            {t("admin.studio.addMember")}
          </Button>
        )}
      </Section>

      <Section title={t("admin.studio.socials")}>
        <ol className="flex flex-col gap-4">
          {values.socials.map((social, index) => (
            <li
              key={index}
              className="flex flex-col gap-3 rounded-md border border-line p-4"
            >
              <p className="text-sm font-medium text-ink-2">
                {t("admin.studio.social", { number: index + 1 })}
              </p>
              <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
                <Field
                  label={t("admin.studio.label")}
                  error={errors[`socials.${index}.label`]}
                >
                  {(control) => (
                    <Input
                      {...control}
                      value={social.label}
                      maxLength={40}
                      onChange={(event) =>
                        set(
                          "socials",
                          values.socials.map((item, i) =>
                            i === index
                              ? { ...item, label: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  )}
                </Field>
                <Field
                  label={t("admin.studio.url")}
                  error={errors[`socials.${index}.url`]}
                >
                  {(control) => (
                    <Input
                      {...control}
                      type="url"
                      inputMode="url"
                      placeholder="https://"
                      value={social.url}
                      onChange={(event) =>
                        set(
                          "socials",
                          values.socials.map((item, i) =>
                            i === index
                              ? { ...item, url: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  )}
                </Field>
              </div>
              <Order
                index={index}
                length={values.socials.length}
                onMove={(by) =>
                  set("socials", moved(values.socials, index, by))
                }
                onRemove={() =>
                  set(
                    "socials",
                    values.socials.filter((_, i) => i !== index),
                  )
                }
              />
            </li>
          ))}
        </ol>
        {values.socials.length < SOCIALS_MAX && (
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() =>
              set("socials", [...values.socials, { label: "", url: "" }])
            }
          >
            {t("admin.studio.addSocial")}
          </Button>
        )}
      </Section>

      <Section>
        <Field
          label={t("admin.studio.contact")}
          hint={t("admin.studio.contactHint")}
          error={errors.contactEmail}
        >
          {(control) => (
            <Input
              {...control}
              type="email"
              autoComplete="off"
              value={values.contactEmail}
              onChange={(event) => set("contactEmail", event.target.value)}
            />
          )}
        </Field>
      </Section>

      <div className="sticky bottom-4 z-10 rounded-lg border border-line bg-surface p-4 shadow-md">
        <Button type="submit" loading={saving}>
          {t("admin.studio.save")}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4">
      {title && <h2 className="font-display text-h4">{title}</h2>}
      {hint && <p className="text-sm text-ink-2">{hint}</p>}
      {children}
    </Card>
  );
}

function Order({
  index,
  length,
  onMove,
  onRemove,
}: {
  index: number;
  length: number;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="ghost"
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        {t("admin.studio.up")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={index === length - 1}
        onClick={() => onMove(1)}
      >
        {t("admin.studio.down")}
      </Button>
      <Button type="button" variant="ghost" onClick={onRemove}>
        {t("admin.studio.remove")}
      </Button>
    </div>
  );
}
