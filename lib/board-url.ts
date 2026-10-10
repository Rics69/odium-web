import type { BoardQuery } from "@/lib/validation/wishes";

/** The board's choice as a query string, leaving out the default. */
export function boardSearch(query: Partial<BoardQuery>): string {
  const params = new URLSearchParams();
  if (query.sort && query.sort !== "top") params.set("sort", query.sort);
  if (query.cursor) params.set("cursor", query.cursor);
  return params.toString();
}
