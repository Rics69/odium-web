"use client";

import { useState, type FormEvent } from "react";
import { Doodle } from "@/components/doodles/doodle";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { ApiRequestError, apiPost } from "@/lib/api-client";
import { t } from "@/lib/i18n";
import { emailSchema, passwordSchema } from "@/lib/validation/account";
import { PasswordInput } from "./password-input";

const messageOf = (error: unknown) =>
  error instanceof ApiRequestError ? error.message : t("errors.internal");

/** The address for a reset link. The answer never says if it is registered. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("errors.validation"));
      return;
    }
    setError(null);
    setSending(true);
    try {
      await apiPost("/api/auth/request-password-reset", { email: parsed.data });
      setSent(true);
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <Card className="flex flex-col items-center gap-4 text-center md:p-8">
        <div className="relative h-20 w-24 text-accent">
          <Doodle name="bubble" draw="view" className="size-full" />
          <Doodle
            name="sparkle"
            draw="view"
            className="absolute -top-2 -right-3 size-7"
          />
        </div>
        <p role="status">{t("account.forgot.sent")}</p>
      </Card>
    );
  }

  return (
    <Card className="md:p-8">
      <form noValidate onSubmit={submit} className="flex flex-col gap-6">
        <Field label={t("account.fields.email")} error={error ?? undefined}>
          {(control) => (
            <Input
              {...control}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
            />
          )}
        </Field>
        <Button type="submit" loading={sending} className="w-full">
          {t("account.forgot.submit")}
        </Button>
      </form>
    </Card>
  );
}

/** A new password by the link; afterwards every device signs in again. */
export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<"form" | "done" | "invalid">("form");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("errors.validation"));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await apiPost("/api/auth/reset-password", { token, password });
      setState("done");
    } catch (failure) {
      if (
        failure instanceof ApiRequestError &&
        failure.code === "RESET_LINK_INVALID"
      ) {
        setState("invalid");
      } else {
        setError(
          failure instanceof ApiRequestError
            ? (failure.fields.password ?? failure.message)
            : t("errors.internal"),
        );
      }
    } finally {
      setSaving(false);
    }
  }

  if (state === "invalid") return <ResetLinkInvalid />;
  if (state === "done") {
    return (
      <Card className="flex flex-col items-center gap-4 text-center md:p-8">
        <Doodle name="check" draw="view" className="size-16 text-accent" />
        <h2 className="font-display text-h3">{t("account.reset.doneTitle")}</h2>
        <p role="status">{t("account.reset.doneText")}</p>
        <LinkButton href="/login" className="mt-2">
          {t("account.login.submit")}
        </LinkButton>
      </Card>
    );
  }

  return (
    <Card className="md:p-8">
      <form noValidate onSubmit={submit} className="flex flex-col gap-6">
        <Field
          label={t("account.reset.password")}
          hint={t("account.register.passwordHint")}
          error={error ?? undefined}
        >
          {(control) => (
            <PasswordInput
              {...control}
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
            />
          )}
        </Field>
        <Button type="submit" loading={saving} className="w-full">
          {t("account.reset.submit")}
        </Button>
      </form>
    </Card>
  );
}

/** Expired, used or broken: the way to a new link. */
export function ResetLinkInvalid() {
  return (
    <Card className="flex flex-col gap-6 md:p-8">
      <p>{t("account.reset.linkInvalid")}</p>
      <LinkButton href="/forgot-password" className="w-full">
        {t("account.reset.again")}
      </LinkButton>
    </Card>
  );
}
