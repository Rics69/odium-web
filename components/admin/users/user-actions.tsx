"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ApiRequestError, apiSend } from "@/lib/api-client";
import { t } from "@/lib/i18n";
import type { AdminUser } from "@/lib/server/admin-users";
import {
  BAN_REASON_MAX,
  banSchema,
  type BanDuration,
} from "@/lib/validation/admin-users";

type Confirm = "ban" | "unban" | "role" | null;

/**
 * What an admin can do with a player: ban (with a reason, maybe wiping
 * their wishes and votes), unban, give or take the admin role. Each step
 * asks once more; the card reloads after it.
 */
export function UserActions({
  user,
  isMe,
}: {
  user: AdminUser;
  isMe: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [duration, setDuration] = useState<BanDuration>("7d");
  const [reason, setReason] = useState("");
  const [wipe, setWipe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [sending, setSending] = useState(false);

  if (isMe) {
    return <p className="text-ink-2">{t("admin.users.itsYou")}</p>;
  }

  function askToBan() {
    const parsed = banSchema.safeParse({ duration, reason, wipe });
    if (!parsed.success) {
      const found: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        found[String(issue.path[0])] ??= issue.message;
      }
      setErrors(found);
      return;
    }
    setErrors({});
    setConfirm("ban");
  }

  async function run(
    send: () => Promise<unknown>,
    done: string,
  ): Promise<void> {
    setSending(true);
    try {
      await send();
      toast({ title: done, tone: "success" });
      setReason("");
      setWipe(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? (Object.values(error.fields)[0] ?? error.message)
          : t("errors.internal");
      toast({ title: message, tone: "error" });
    } finally {
      setSending(false);
      setConfirm(null);
    }
  }

  const ban = () =>
    run(
      () =>
        apiSend("POST", `/api/admin/users/${user.id}/ban`, {
          duration,
          reason,
          wipe,
        }),
      t("admin.users.bannedDone", { nickname: user.nickname }),
    );
  const unban = () =>
    run(
      () => apiSend("DELETE", `/api/admin/users/${user.id}/ban`, {}),
      t("admin.users.unbanned"),
    );
  const nextRole = user.role === "admin" ? "user" : "admin";
  const changeRole = () =>
    run(
      () =>
        apiSend("PATCH", `/api/admin/users/${user.id}/role`, {
          role: nextRole,
        }),
      t("admin.users.roleChanged"),
    );

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-h4">{t("admin.users.banTitle")}</h2>
        {user.banned ? (
          <Button
            variant="secondary"
            onClick={() => setConfirm("unban")}
            className="self-start"
          >
            {t("admin.users.unban")}
          </Button>
        ) : user.role === "admin" ? (
          <p className="text-ink-2">{t("admin.users.adminNoBan")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            <Field label={t("admin.users.duration")} error={errors.duration}>
              {(control) => (
                <Select
                  {...control}
                  value={duration}
                  onChange={(event) =>
                    setDuration(event.target.value as BanDuration)
                  }
                >
                  <option value="1d">{t("admin.users.day1")}</option>
                  <option value="7d">{t("admin.users.day7")}</option>
                  <option value="30d">{t("admin.users.day30")}</option>
                  <option value="forever">{t("admin.users.forever")}</option>
                </Select>
              )}
            </Field>
            <Field
              label={t("admin.users.reason")}
              hint={t("admin.users.reasonHint")}
              error={errors.reason}
              count={{ value: reason.trim().length, max: BAN_REASON_MAX }}
            >
              {(control) => (
                <Textarea
                  {...control}
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              )}
            </Field>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-5 shrink-0 accent-accent"
                checked={wipe}
                onChange={(event) => setWipe(event.target.checked)}
              />
              <span className="flex flex-col gap-1">
                <span className="font-medium">{t("admin.users.wipe")}</span>
                <span className="text-sm text-ink-2">
                  {t("admin.users.wipeHint")}
                </span>
              </span>
            </label>
            <Button variant="danger" onClick={askToBan} className="self-start">
              {t("admin.users.ban")}
            </Button>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-h4">{t("admin.users.roleTitle")}</h2>
        <p className="text-ink-2">
          {user.role === "admin"
            ? t("admin.users.isAdmin")
            : t("admin.users.isPlayer")}
        </p>
        <Button
          variant="secondary"
          onClick={() => setConfirm("role")}
          className="self-start"
        >
          {user.role === "admin"
            ? t("admin.users.removeAdmin")
            : t("admin.users.makeAdmin")}
        </Button>
      </section>

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        {confirm === "ban" && (
          <DialogContent
            title={t("admin.users.banConfirmTitle", {
              nickname: user.nickname,
            })}
            description={t("admin.users.banConfirmText")}
            closeLabel={t("common.close")}
          >
            <Button variant="danger" loading={sending} onClick={ban}>
              {t("admin.users.ban")}
            </Button>
          </DialogContent>
        )}
        {confirm === "unban" && (
          <DialogContent
            title={t("admin.users.unban")}
            description={user.nickname}
            closeLabel={t("common.close")}
          >
            <Button loading={sending} onClick={unban}>
              {t("admin.users.unban")}
            </Button>
          </DialogContent>
        )}
        {confirm === "role" && (
          <DialogContent
            title={
              nextRole === "admin"
                ? t("admin.users.makeAdminTitle", { nickname: user.nickname })
                : t("admin.users.removeAdminTitle", {
                    nickname: user.nickname,
                  })
            }
            description={
              nextRole === "admin"
                ? t("admin.users.makeAdminText")
                : t("admin.users.removeAdminText")
            }
            closeLabel={t("common.close")}
          >
            <Button loading={sending} onClick={changeRole}>
              {nextRole === "admin"
                ? t("admin.users.makeAdmin")
                : t("admin.users.removeAdmin")}
            </Button>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
