"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Doodle } from "@/components/doodles/doodle";
import { Button, LinkButton, type ButtonVariant } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { ApiRequestError, apiPost } from "@/lib/api-client";
import { t } from "@/lib/i18n";

const REDIRECT_AFTER_MS = 3000;

/** Right after sign-up, and whenever an unconfirmed player comes here. */
export function CheckYourMail({
  email,
  next,
}: {
  email: string;
  next: string;
}) {
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
      <p>{t("account.register.doneText", { email })}</p>
      <p className="text-sm text-ink-2">{t("account.register.doneSpam")}</p>
      <div className="flex w-full flex-col gap-3">
        <ResendLetter email={email} next={next} variant="secondary" />
        <LinkButton href={next as Route}>
          {t("account.register.continue")}
        </LinkButton>
      </div>
    </Card>
  );
}

/** The address is confirmed: back to where the player came from. */
export function EmailVerified({
  next,
  signedIn,
}: {
  next: string;
  signedIn: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!signedIn) return;
    const timer = setTimeout(
      () => router.replace(next as Route),
      REDIRECT_AFTER_MS,
    );
    return () => clearTimeout(timer);
  }, [next, router, signedIn]);

  return (
    <Card className="flex flex-col items-center gap-4 text-center md:p-8">
      <Doodle name="check" draw="view" className="size-16 text-accent" />
      <p>{t("account.verify.doneText")}</p>
      {signedIn ? (
        <>
          <p role="status" className="text-sm text-ink-2">
            {t("account.verify.redirecting")}
          </p>
          <LinkButton href={next as Route} className="mt-2">
            {t("account.verify.continue")}
          </LinkButton>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-2">{t("account.verify.signInText")}</p>
          <LinkButton
            href={`/login?next=${encodeURIComponent(next)}` as Route}
            className="mt-2"
          >
            {t("account.register.signIn")}
          </LinkButton>
        </>
      )}
    </Card>
  );
}

const reasons = {
  expired: "account.verify.expired",
  invalid: "account.verify.invalid",
} as const;

/** The link did not work: why, and a new letter. */
export function VerificationFailed({
  reason,
  email,
  next,
}: {
  reason: keyof typeof reasons;
  email: string | null;
  next: string;
}) {
  return (
    <Card className="flex flex-col gap-6 md:p-8">
      <p>{t(reasons[reason])}</p>
      <ResendLetter email={email} next={next} />
    </Card>
  );
}

// A signed-in player gets the letter with one press; a guest types the
// address. The answer is the same whether the address is registered or not.
function ResendLetter({
  email,
  next,
  variant = "primary",
}: {
  email: string | null;
  next: string;
  variant?: ButtonVariant;
}) {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function resend(event: FormEvent) {
    event.preventDefault();
    const to = email ?? typed.trim();
    setError(null);
    setSending(true);
    try {
      await apiPost("/api/auth/send-verification-email", { email: to, next });
      setSentTo(to);
    } catch (failure) {
      setError(
        failure instanceof ApiRequestError
          ? (failure.fields.email ?? failure.message)
          : t("errors.internal"),
      );
    } finally {
      setSending(false);
    }
  }

  if (sentTo) {
    return (
      <p role="status" className="flex items-start gap-2 text-left font-medium">
        <Doodle
          name="check"
          draw="view"
          className="size-5 shrink-0 text-accent"
        />
        {t("account.verify.sentTo", { email: sentTo })}
      </p>
    );
  }

  return (
    <form
      noValidate
      onSubmit={resend}
      className="flex flex-col gap-4 text-left"
    >
      {email === null && (
        <Field label={t("account.register.email")} error={error ?? undefined}>
          {(control) => (
            <Input
              {...control}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
            />
          )}
        </Field>
      )}
      {email !== null && error && (
        <p role="alert" className="text-error">
          {error}
        </p>
      )}
      <Button
        type="submit"
        variant={variant}
        loading={sending}
        className="w-full"
      >
        {t("account.verify.resend")}
      </Button>
    </form>
  );
}
