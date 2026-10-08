"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { TextLink } from "@/components/ui/text-link";
import { ApiRequestError, apiPost } from "@/lib/api-client";
import { t } from "@/lib/i18n";
import { signInSchema } from "@/lib/validation/account";
import { PasswordInput } from "./password-input";

type Values = { email: string; password: string };
type Errors = Partial<Record<keyof Values, string>>;

// A wrong pair, a ban or the lock come back as one message above the
// button: the form never says which of the two fields is wrong.
export function LoginForm({ next }: { next: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>({ email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const change = (name: keyof Values) => (value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const parsed = signInSchema.safeParse({ ...values, next });
    if (!parsed.success) {
      const found: Errors = {};
      for (const issue of parsed.error.issues) {
        found[issue.path[0] as keyof Values] ??= issue.message;
      }
      setErrors(found);
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>("[aria-invalid='true']")
          ?.focus(),
      );
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/api/auth/sign-in", parsed.data);
      // A full load: the header, the banner and every page change with it.
      window.location.replace(next);
    } catch (error) {
      setFormError(
        error instanceof ApiRequestError ? error.message : t("errors.internal"),
      );
      setSubmitting(false);
    }
  }

  return (
    <Card className="md:p-8">
      <form
        ref={formRef}
        noValidate
        onSubmit={submit}
        className="flex flex-col gap-6"
      >
        <Field label={t("account.fields.email")} error={errors.email}>
          {(control) => (
            <Input
              {...control}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={values.email}
              onChange={(event) => change("email")(event.target.value)}
            />
          )}
        </Field>
        <Field label={t("account.fields.password")} error={errors.password}>
          {(control) => (
            <PasswordInput
              {...control}
              name="password"
              autoComplete="current-password"
              value={values.password}
              onChange={(event) => change("password")(event.target.value)}
            />
          )}
        </Field>
        <TextLink href="/forgot-password" className="-mt-2 self-end text-sm">
          {t("account.login.forgot")}
        </TextLink>
        {formError && (
          <p role="alert" className="text-error">
            {formError}
          </p>
        )}
        <Button type="submit" loading={submitting} className="w-full">
          {t("account.login.submit")}
        </Button>
      </form>
    </Card>
  );
}
