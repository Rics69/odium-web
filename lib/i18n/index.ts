import { ru } from "./ru";

export const locale = "ru";

/** Plural forms as Intl.PluralRules names them for Russian. */
export type PluralForms = {
  one: string;
  few: string;
  many: string;
  other: string;
};

type Join<K extends string, P extends string> = `${K}.${P}`;

// "nav.games"-style paths to the leaves of the dictionary of the given kind.
type Paths<T, Leaf> = {
  [K in keyof T & string]: T[K] extends Leaf
    ? K
    : T[K] extends PluralForms | string
      ? never
      : Join<K, Paths<T[K], Leaf>>;
}[keyof T & string];

export type MessageKey = Paths<typeof ru, string>;
export type PluralKey = Paths<typeof ru, PluralForms>;
type Params = Record<string, string | number>;

function lookup(key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => {
    return typeof node === "object" && node !== null
      ? (node as Record<string, unknown>)[part]
      : undefined;
  }, ru);
}

function fill(template: string, params?: Params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Text by key, with {name} placeholders filled from params. */
export function t(key: MessageKey, params?: Params): string {
  return fill(lookup(key) as string, params);
}

const pluralRules = new Intl.PluralRules(locale);

/** «1 голос», «3 голоса», «5 голосов»: picks the form and fills {count}. */
export function formatPlural(
  count: number,
  forms: PluralForms,
  params?: Params,
) {
  const form = pluralRules.select(count) as keyof PluralForms;
  return fill(forms[form] ?? forms.other, { count, ...params });
}

/** Plural text by key, see formatPlural. */
export function tp(key: PluralKey, count: number, params?: Params) {
  return formatPlural(count, lookup(key) as PluralForms, params);
}

const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["minute", 60],
  ["hour", 60 * 60],
  ["day", 60 * 60 * 24],
  ["week", 60 * 60 * 24 * 7],
  ["month", 60 * 60 * 24 * 30],
  ["year", 60 * 60 * 24 * 365],
];

/** «только что», «5 минут назад», «вчера», «3 дня назад», «в прошлом месяце». */
export function formatRelativeTime(date: Date, now: Date = new Date()) {
  const seconds = (date.getTime() - now.getTime()) / 1000;
  if (Math.abs(seconds) < 45) return t("time.justNow");
  // The largest unit that fits at least once.
  let chosen = units[0]!;
  for (const unit of units) {
    if (Math.abs(seconds) >= unit[1]) chosen = unit;
  }
  return relative.format(Math.round(seconds / chosen[1]), chosen[0]);
}

const dateFormat = new Intl.DateTimeFormat(locale, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** «15 июня 2026 г.» from a date column ("2026-06-15"). */
export function formatDate(isoDate: string) {
  return dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

const dateTimeFormat = new Intl.DateTimeFormat(locale, {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Moscow",
});

/** «15 октября 2026 г. в 18:30 по Москве»: most players are in Russia. */
export function formatDateTime(date: Date) {
  return t("time.moscow", { time: dateTimeFormat.format(date) });
}
