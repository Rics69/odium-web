import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import {
  adminActionLabel,
  adminActionNames,
  adminTargetLabel,
  adminTargets,
} from "@/lib/admin-actions";
import { t } from "@/lib/i18n";
import type { JournalQuery } from "@/lib/validation/admin-log";

/** Who, what, on what: a GET form, so a filtered journal has an address. */
export function JournalFilters({
  query,
  admins,
}: {
  query: JournalQuery;
  admins: { id: string; nickname: string }[];
}) {
  return (
    <Form
      action="/admin/log"
      className="grid gap-4 rounded-lg border border-line bg-surface p-4 md:grid-cols-[1fr_1fr_1fr_auto]"
    >
      <Labelled label={t("admin.log.admin")}>
        <Select name="admin" defaultValue={query.admin ?? ""}>
          <option value="">{t("admin.log.allAdmins")}</option>
          {admins.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.nickname}
            </option>
          ))}
        </Select>
      </Labelled>
      <Labelled label={t("admin.log.action")}>
        <Select name="action" defaultValue={query.action ?? ""}>
          <option value="">{t("admin.log.allActions")}</option>
          {adminActionNames.map((action) => (
            <option key={action} value={action}>
              {t(adminActionLabel[action])}
            </option>
          ))}
        </Select>
      </Labelled>
      <Labelled label={t("admin.log.type")}>
        <Select name="type" defaultValue={query.type ?? ""}>
          <option value="">{t("admin.log.allTypes")}</option>
          {adminTargets.map((type) => (
            <option key={type} value={type}>
              {t(adminTargetLabel[type])}
            </option>
          ))}
        </Select>
      </Labelled>
      {query.target && (
        <input type="hidden" name="target" value={query.target} />
      )}
      <div className="flex items-end gap-3">
        <Button type="submit">{t("admin.log.show")}</Button>
        <Link
          href="/admin/log"
          className="flex min-h-11 items-center px-2 text-ink-2 transition-colors hover:text-accent"
        >
          {t("admin.log.reset")}
        </Link>
      </div>
    </Form>
  );
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
