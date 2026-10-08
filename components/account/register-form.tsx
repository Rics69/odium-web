"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { ApiRequestError, apiPost } from "@/lib/api-client";
import { t } from "@/lib/i18n";
import { NICKNAME_MAX, signUpSchema } from "@/lib/validation/account";
import { PasswordInput } from "./password-input";

type Values = { email: string; nickname: string; password: string };
type Errors = Partial<Record<keyof Values, string>>;

// The same rules as the server, so most mistakes show before sending;
// what only the server knows (a taken nickname) comes back per field.
// Signed up, the player lands on /verify-email: "check your mail", with
// the header already showing their nickname.
export function RegisterForm({ next }: { next: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>({
    email: "",
    nickname: "",
    password: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const change = (name: keyof Values) => (value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  function showErrors(found: Errors) {
    setErrors(found);
    // Straight to the first field that needs fixing.
    requestAnimationFrame(() =>
      formRef.current
        ?.querySelector<HTMLElement>("[aria-invalid='true']")
        ?.focus(),
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const parsed = signUpSchema.safeParse({ ...values, next });
    if (!parsed.success) {
      const found: Errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof Values;
        found[field] ??= issue.message;
      }
      showErrors(found);
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/api/auth/sign-up", parsed.data);
      // A full load: /register and /verify-email share a layout, and a
      // client navigation would keep the header of a guest.
      window.location.replace(`/verify-email?next=${encodeURIComponent(next)}`);
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        Object.keys(error.fields).length
      ) {
        showErrors(error.fields);
      } else {
        setFormError(
          error instanceof ApiRequestError
            ? error.message
            : t("errors.internal"),
        );
      }
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
        <Field label={t("account.register.email")} error={errors.email}>
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
        <Field
          label={t("account.register.nickname")}
          hint={t("account.register.nicknameHint")}
          error={errors.nickname}
        >
          {(control) => (
            <Input
              {...control}
              name="nickname"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={NICKNAME_MAX}
              value={values.nickname}
              onChange={(event) => change("nickname")(event.target.value)}
            />
          )}
        </Field>
        <Field
          label={t("account.register.password")}
          hint={t("account.register.passwordHint")}
          error={errors.password}
        >
          {(control) => (
            <PasswordInput
              {...control}
              name="password"
              autoComplete="new-password"
              value={values.password}
              onChange={(event) => change("password")(event.target.value)}
            />
          )}
        </Field>
        {formError && (
          <p role="alert" className="text-error">
            {formError}
          </p>
        )}
        <Button type="submit" loading={submitting} className="w-full">
          {t("account.register.submit")}
        </Button>
      </form>
    </Card>
  );
}
