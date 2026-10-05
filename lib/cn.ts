/** Joins class names, skipping empty ones. Callers avoid conflicting utilities. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
