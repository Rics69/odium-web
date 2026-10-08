"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ApiRequestError, apiSend } from "@/lib/api-client";
import { t } from "@/lib/i18n";
import {
  NICKNAME_MAX,
  deleteAccountSchema,
  profileChangeSchema,
} from "@/lib/validation/account";
import { PasswordInput } from "./password-input";

type Errors = Record<string, string | undefined>;

const sendToMe = (method: "PATCH" | "DELETE", body: unknown) =>
  apiSend(method, "/api/me", body);

/**
 * A profile form: checks with the shared schema, sends, and shows server
 * errors under their fields or as one message.
 */
function useProfileForm(schema: z.ZodType) {
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(value: unknown, send: () => Promise<unknown>) {
    setFormError(null);
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      const found: Errors = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0]);
        found[field] ??= issue.message;
      }
      setErrors(found);
      return false;
    }
    setErrors({});
    setPending(true);
    try {
      await send();
      return true;
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
      return false;
    } finally {
      setPending(false);
    }
  }

  const clear = (field: string) =>
    setErrors((current) => ({ ...current, [field]: undefined }));
  return { errors, formError, pending, run, clear };
}

function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-error">
      {children}
    </p>
  );
}

export function NicknameForm({ nickname }: { nickname: string }) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(nickname);
  const form = useProfileForm(profileChangeSchema);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body = { change: "nickname", nickname: value };
    const saved = await form.run(body, () => sendToMe("PATCH", body));
    if (saved) {
      toast({ title: t("account.profile.nicknameSaved"), tone: "success" });
      // The header shows the nickname too.
      router.refresh();
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <Field
        label={t("account.fields.nickname")}
        hint={t("account.register.nicknameHint")}
        error={form.errors.nickname}
      >
        {(control) => (
          <Input
            {...control}
            name="nickname"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={NICKNAME_MAX}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              form.clear("nickname");
            }}
          />
        )}
      </Field>
      {form.formError && <FormError>{form.formError}</FormError>}
      <Button
        type="submit"
        variant="secondary"
        loading={form.pending}
        disabled={value.trim() === nickname}
        className="self-start"
      >
        {t("account.profile.nicknameSave")}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const form = useProfileForm(profileChangeSchema);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body = { change: "password", currentPassword, newPassword };
    if (await form.run(body, () => sendToMe("PATCH", body))) {
      setCurrentPassword("");
      setNewPassword("");
      toast({ title: t("account.profile.passwordSaved"), tone: "success" });
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <Field
        label={t("account.profile.currentPassword")}
        error={form.errors.currentPassword}
      >
        {(control) => (
          <PasswordInput
            {...control}
            name="current-password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              form.clear("currentPassword");
            }}
          />
        )}
      </Field>
      <Field
        label={t("account.profile.newPassword")}
        hint={t("account.register.passwordHint")}
        error={form.errors.newPassword}
      >
        {(control) => (
          <PasswordInput
            {...control}
            name="new-password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
              form.clear("newPassword");
            }}
          />
        )}
      </Field>
      {form.formError && <FormError>{form.formError}</FormError>}
      <Button
        type="submit"
        variant="secondary"
        loading={form.pending}
        className="self-start"
      >
        {t("account.profile.passwordSave")}
      </Button>
    </form>
  );
}

export function EmailForm({ email }: { email: string }) {
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useProfileForm(profileChangeSchema);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body = { change: "email", email: newEmail, currentPassword };
    if (await form.run(body, () => sendToMe("PATCH", body))) {
      setSentTo(newEmail.trim().toLowerCase());
      setNewEmail("");
      setCurrentPassword("");
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-ink-2">{t("account.profile.emailNow", { email })}</p>
      <Field
        label={t("account.profile.newEmail")}
        hint={t("account.profile.emailHint")}
        error={form.errors.email}
      >
        {(control) => (
          <Input
            {...control}
            type="email"
            name="new-email"
            autoComplete="email"
            inputMode="email"
            value={newEmail}
            onChange={(event) => {
              setNewEmail(event.target.value);
              form.clear("email");
            }}
          />
        )}
      </Field>
      <Field
        label={t("account.profile.currentPassword")}
        error={form.errors.currentPassword}
      >
        {(control) => (
          <PasswordInput
            {...control}
            name="email-current-password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              form.clear("currentPassword");
            }}
          />
        )}
      </Field>
      {form.formError && <FormError>{form.formError}</FormError>}
      {sentTo && (
        <p role="status" className="font-medium">
          {t("account.profile.emailSent", { email: sentTo })}
        </p>
      )}
      <Button
        type="submit"
        variant="secondary"
        loading={form.pending}
        className="self-start"
      >
        {t("account.profile.emailSave")}
      </Button>
    </form>
  );
}

/** Asks for the password in a dialog; afterwards home, signed out. */
export function DeleteAccount() {
  const [password, setPassword] = useState("");
  const form = useProfileForm(deleteAccountSchema);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body = { password };
    if (await form.run(body, () => sendToMe("DELETE", body))) {
      window.location.replace("/");
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" className="self-start">
          {t("account.profile.deleteButton")}
        </Button>
      </DialogTrigger>
      <DialogContent
        title={t("account.profile.deleteConfirmTitle")}
        description={t("account.profile.deleteConfirmText")}
        closeLabel={t("common.close")}
      >
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          <Field
            label={t("account.fields.password")}
            error={form.errors.password}
          >
            {(control) => (
              <PasswordInput
                {...control}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  form.clear("password");
                }}
              />
            )}
          </Field>
          {form.formError && <FormError>{form.formError}</FormError>}
          <Button type="submit" variant="danger" loading={form.pending}>
            {t("account.profile.deleteConfirm")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
