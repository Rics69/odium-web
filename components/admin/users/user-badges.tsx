import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";
import type { AdminUser } from "@/lib/server/admin-users";

/** Admin, banned, unconfirmed: what sets a player apart, at a glance. */
export function UserBadges({ user }: { user: AdminUser }) {
  return (
    <>
      {user.role === "admin" && (
        <Badge tone="accent">{t("admin.users.adminBadge")}</Badge>
      )}
      {user.banned && (
        <Badge tone="remove">{t("admin.users.bannedBadge")}</Badge>
      )}
      {!user.emailVerified && <Badge>{t("admin.users.unverifiedBadge")}</Badge>}
    </>
  );
}
