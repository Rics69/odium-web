import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { t } from "@/lib/i18n";
import type { AdminWishesQuery } from "@/lib/validation/admin-wishes";
import { wishStatuses } from "@/lib/validation/wishes";
import { statusLabel } from "@/lib/wish-labels";

/**
 * The filters of the moderation table: a plain GET form, so the choice
 * lives in the address, survives a reload and can be sent to someone.
 */
export function WishFilters({
  query,
  games,
}: {
  query: AdminWishesQuery;
  games: { slug: string; title: string }[];
}) {
  return (
    <Form
      action="/admin/wishes"
      aria-label={t("admin.wishes.filters")}
      className="grid gap-4 rounded-lg border border-line bg-surface p-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <Labelled label={t("admin.wishes.game")}>
        <Select name="game" defaultValue={query.game ?? ""}>
          <option value="">{t("admin.wishes.allGames")}</option>
          {games.map((game) => (
            <option key={game.slug} value={game.slug}>
              {game.title}
            </option>
          ))}
        </Select>
      </Labelled>
      <Labelled label={t("admin.wishes.status")}>
        <Select name="status" defaultValue={query.status ?? ""}>
          <option value="">{t("admin.wishes.allStatuses")}</option>
          {wishStatuses.map((status) => (
            <option key={status} value={status}>
              {t(statusLabel[status])}
            </option>
          ))}
        </Select>
      </Labelled>
      <Labelled label={t("admin.wishes.type")}>
        <Select name="type" defaultValue={query.type ?? ""}>
          <option value="">{t("admin.wishes.allTypes")}</option>
          <option value="add">{t("wishType.add")}</option>
          <option value="remove">{t("wishType.remove")}</option>
        </Select>
      </Labelled>
      <Labelled label={t("admin.wishes.visibility")}>
        <Select name="visibility" defaultValue={query.visibility}>
          <option value="all">{t("admin.wishes.visibilityAll")}</option>
          <option value="visible">{t("admin.wishes.visibilityVisible")}</option>
          <option value="hidden">{t("admin.wishes.visibilityHidden")}</option>
          <option value="review">{t("admin.wishes.visibilityReview")}</option>
        </Select>
      </Labelled>
      <Labelled label={t("admin.wishes.author")}>
        <Input
          name="author"
          defaultValue={query.author ?? ""}
          placeholder={t("admin.wishes.authorPlaceholder")}
          maxLength={24}
        />
      </Labelled>
      <Labelled label={t("admin.wishes.search")}>
        <Input
          type="search"
          name="q"
          defaultValue={query.q ?? ""}
          placeholder={t("admin.wishes.searchPlaceholder")}
          maxLength={100}
        />
      </Labelled>
      <Labelled label={t("admin.wishes.sort")}>
        <Select name="sort" defaultValue={query.sort}>
          <option value="new">{t("admin.wishes.sortNew")}</option>
          <option value="old">{t("admin.wishes.sortOld")}</option>
          <option value="top">{t("admin.wishes.sortTop")}</option>
        </Select>
      </Labelled>
      <div className="flex items-end gap-3">
        <Button type="submit">{t("admin.wishes.apply")}</Button>
        <Link
          href="/admin/wishes"
          className="flex min-h-11 items-center px-2 text-ink-2 transition-colors hover:text-accent"
        >
          {t("admin.wishes.reset")}
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
