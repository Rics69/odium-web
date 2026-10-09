import type { BoardQuery } from "@/lib/validation/wishes";

/** The board's choices as a query string, leaving out the defaults. */
export function boardSearch(query: Partial<BoardQuery>): string {
  const params = new URLSearchParams();
  if (query.sort && query.sort !== "top") params.set("sort", query.sort);
  if (query.type) params.set("type", query.type);
  if (query.status) params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  if (query.mine) params.set("mine", "1");
  if (query.voted) params.set("voted", "1");
  if (query.cursor) params.set("cursor", query.cursor);
  return params.toString();
}
