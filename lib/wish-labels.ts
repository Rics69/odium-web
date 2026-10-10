// Dictionary keys of wish types and statuses, for client and server code
// alike (a "use client" module would give the server references, not
// values).

export const typeLabel = {
  add: "wishType.add",
  remove: "wishType.remove",
} as const;

export const statusLabel = {
  new: "wishStatus.new",
  review: "wishStatus.review",
  planned: "wishStatus.planned",
  in_progress: "wishStatus.in_progress",
  done: "wishStatus.done",
  declined: "wishStatus.declined",
} as const;

/** Why a moderator hid a wish; "flagged" waits for one and has its own text. */
export const hiddenReasonLabel = {
  spam: "wish.reason.spam",
  abuse: "wish.reason.abuse",
  off_topic: "wish.reason.off_topic",
  duplicate: "wish.reason.duplicate",
  other: "wish.reason.other",
} as const;
