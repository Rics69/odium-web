import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-page";
import { UserSearch } from "@/components/admin/users/user-search";
import { UsersList } from "@/components/admin/users/users-list";
import { t } from "@/lib/i18n";
import { listAdminUsers } from "@/lib/server/admin-users";
import { requireAdminPage } from "@/lib/server/session";
import { adminUsersQuerySchema } from "@/lib/validation/admin-users";

export const metadata: Metadata = { title: t("admin.sections.users") };

// Players (spec, section 6). Odd choices in the address fall back to the
// defaults.
export default async function AdminUsersPage({
  searchParams,
}: PageProps<"/admin/users">) {
  await requireAdminPage();
  const raw = Object.fromEntries(
    Object.entries(await searchParams).filter(
      ([key, value]) => key !== "cursor" && typeof value === "string",
    ),
  );
  const parsed = adminUsersQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : adminUsersQuerySchema.parse({});
  const initial = await listAdminUsers(query);

  return (
    <AdminPage title={t("admin.sections.users")}>
      <UserSearch query={query} />
      <UsersList key={JSON.stringify(query)} query={query} initial={initial} />
    </AdminPage>
  );
}
