import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { t } from "@/lib/i18n";
import type { AdminUsersQuery } from "@/lib/validation/admin-users";

/** The search of the players list: a GET form, so it lives in the address. */
export function UserSearch({ query }: { query: AdminUsersQuery }) {
  return (
    <Form
      action="/admin/users"
      className="grid gap-4 rounded-lg border border-line bg-surface p-4 md:grid-cols-[2fr_1fr_1fr_auto]"
    >
      <Labelled label={t("admin.users.search")}>
        <Input
          type="search"
          name="q"
          defaultValue={query.q ?? ""}
          maxLength={254}
        />
      </Labelled>
      <Labelled label={t("admin.users.role")}>
        <Select name="role" defaultValue={query.role ?? ""}>
          <option value="">{t("admin.users.roleAll")}</option>
          <option value="admin">{t("admin.users.roleAdmin")}</option>
        </Select>
      </Labelled>
      <Labelled label={t("admin.users.state")}>
        <Select name="state" defaultValue={query.state}>
          <option value="all">{t("admin.users.stateAll")}</option>
          <option value="banned">{t("admin.users.stateBanned")}</option>
          <option value="unverified">{t("admin.users.stateUnverified")}</option>
        </Select>
      </Labelled>
      <div className="flex items-end gap-3">
        <Button type="submit">{t("admin.users.find")}</Button>
        <Link
          href="/admin/users"
          className="flex min-h-11 items-center px-2 text-ink-2 transition-colors hover:text-accent"
        >
          {t("admin.users.reset")}
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
