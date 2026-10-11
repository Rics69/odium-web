import { adminFieldLabel } from "@/lib/admin-actions";
import { statusLabel as gameStatusLabel } from "@/lib/games";
import { t, type MessageKey } from "@/lib/i18n";
import type { GameStatus } from "@/lib/validation/games";
import { hiddenReasonLabel, statusLabel, typeLabel } from "@/lib/wish-labels";

const LONG = 160;

const durationLabel = {
  "1d": "admin.users.day1",
  "7d": "admin.users.day7",
  "30d": "admin.users.day30",
  forever: "admin.users.forever",
} as const;

/** A stored code in words: off_topic → «не по теме», 7d → «7 дней». */
function inWords(field: string, value: unknown): string | null {
  if (typeof value !== "string") return null;
  const lookup = (map: Record<string, MessageKey>) =>
    value in map ? t(map[value]!) : null;
  switch (field) {
    case "status":
      if (value === "released" || value === "in_development") {
        return gameStatusLabel(value as GameStatus);
      }
      return lookup(statusLabel);
    case "hiddenReason":
      return value === "flagged"
        ? t("admin.log.flagged")
        : lookup(hiddenReasonLabel);
    case "type":
      return lookup(typeLabel);
    case "role":
      return value === "admin"
        ? t("admin.log.roleAdmin")
        : t("admin.log.roleUser");
    case "duration":
      return lookup(durationLabel);
    default:
      return null;
  }
}

/** Same value? Key order inside objects does not count. */
function same(a: unknown, b: unknown): boolean {
  const stable = (value: unknown) =>
    JSON.stringify(value ?? null, (_key, item: unknown) =>
      item && typeof item === "object" && !Array.isArray(item)
        ? Object.fromEntries(
            Object.entries(item).sort(([x], [y]) => x.localeCompare(y)),
          )
        : item,
    );
  return stable(a) === stable(b);
}

/** A value of "before — after" as an admin reads it. */
function Value({ field, value }: { field: string; value: unknown }) {
  const words = inWords(field, value);
  if (words) return <>{words}</>;
  if (value === null || value === undefined || value === "") {
    return <span className="text-ink-3">{t("admin.log.empty")}</span>;
  }
  if (typeof value === "boolean") {
    return <>{value ? t("admin.log.yes") : t("admin.log.no")}</>;
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value.length === 0 ? (
      <span className="text-ink-3">{t("admin.log.empty")}</span>
    ) : (
      <>{value.join(", ")}</>
    );
  }
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (text.length <= LONG && typeof value !== "object") {
    return <span className="break-words whitespace-pre-line">{text}</span>;
  }
  return (
    <details>
      <summary className="cursor-pointer break-words">
        {text.slice(0, LONG).replace(/\s+/g, " ")}
        {text.length > LONG && "…"}
      </summary>
      <pre className="text-xs mt-2 max-h-80 overflow-auto rounded-sm bg-paper p-3 whitespace-pre-wrap">
        {text}
      </pre>
    </details>
  );
}

/** What one action changed: a row per field, before and after. */
export function JournalChange({
  before,
  after,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  // A field that is the same on both sides says nothing.
  const keys = [
    ...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]),
  ].filter((key) => !before || !after || !same(before[key], after[key]));
  if (keys.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-md text-left text-sm">
        <thead className="text-ink-2">
          <tr>
            <th className="w-40 py-1 pr-4 font-medium">
              {t("admin.log.field")}
            </th>
            {before && (
              <th className="py-1 pr-4 font-medium">{t("admin.log.was")}</th>
            )}
            {after && (
              <th className="py-1 font-medium">{t("admin.log.now")}</th>
            )}
          </tr>
        </thead>
        <tbody className="align-top">
          {keys.map((key) => (
            <tr key={key} className="border-t border-line">
              <td className="py-2 pr-4 text-ink-2">
                {key in adminFieldLabel
                  ? t(adminFieldLabel[key as keyof typeof adminFieldLabel])
                  : key}
              </td>
              {before && (
                <td className="py-2 pr-4">
                  <Value field={key} value={before[key]} />
                </td>
              )}
              {after && (
                <td className="py-2">
                  <Value field={key} value={after[key]} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
