import "server-only";
import { formatDateTime, t } from "@/lib/i18n";

/**
 * What a banned player reads when signing in (spec, section 3): until when,
 * and why.
 */
export function banMessage(user: {
  banReason?: string | null;
  banExpires?: Date | string | null;
}): string {
  const until = user.banExpires
    ? t("account.login.bannedUntil", {
        until: formatDateTime(new Date(user.banExpires)),
      })
    : t("account.login.bannedForever");
  return user.banReason
    ? `${until} ${t("account.login.banReason", { reason: user.banReason })}`
    : until;
}
