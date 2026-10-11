// Every action the admin journal records, with its dictionary key (spec,
// section 6). A new action is added here first: the journal's type comes
// from this list, so an action without a label does not compile.

export const adminActionLabel = {
  "wish.status": "admin.log.actions.wishStatus",
  "wish.reply": "admin.log.actions.wishReply",
  "wish.hide": "admin.log.actions.wishHide",
  "wish.show": "admin.log.actions.wishShow",
  "wish.edit": "admin.log.actions.wishEdit",
  "wish.delete": "admin.log.actions.wishDelete",
  "wish.merge": "admin.log.actions.wishMerge",
  "user.ban": "admin.log.actions.userBan",
  "user.unban": "admin.log.actions.userUnban",
  "user.role": "admin.log.actions.userRole",
  "game.create": "admin.log.actions.gameCreate",
  "game.update": "admin.log.actions.gameUpdate",
  "game.delete": "admin.log.actions.gameDelete",
  "studio.update": "admin.log.actions.studioUpdate",
  "stop_words.update": "admin.log.actions.stopWordsUpdate",
  "blocked_domains.update": "admin.log.actions.blockedDomainsUpdate",
} as const;

export type AdminActionName = keyof typeof adminActionLabel;
export const adminActionNames = Object.keys(
  adminActionLabel,
) as AdminActionName[];

/** What an admin acts on (spec, section 6). */
export const adminTargets = [
  "wish",
  "user",
  "game",
  "studio",
  "stop_words",
  "blocked_domains",
] as const;
export type AdminTarget = (typeof adminTargets)[number];

export const adminTargetLabel = {
  wish: "admin.log.targets.wish",
  user: "admin.log.targets.user",
  game: "admin.log.targets.game",
  studio: "admin.log.targets.studio",
  stop_words: "admin.log.targets.stopWords",
  blocked_domains: "admin.log.targets.blockedDomains",
} as const satisfies Record<AdminTarget, string>;

/** Names of the changed fields in "before — after", where there is one. */
export const adminFieldLabel = {
  status: "admin.log.fields.status",
  doneVersion: "admin.log.fields.doneVersion",
  studioReply: "admin.log.fields.studioReply",
  hidden: "admin.log.fields.hidden",
  hiddenReason: "admin.log.fields.hiddenReason",
  mergedIntoId: "admin.log.fields.mergedIntoId",
  type: "admin.log.fields.type",
  title: "admin.log.fields.title",
  body: "admin.log.fields.body",
  votesCount: "admin.log.fields.votesCount",
  originalTitle: "admin.log.fields.originalTitle",
  originalVotesCount: "admin.log.fields.originalVotesCount",
  movedVotes: "admin.log.fields.movedVotes",
  banned: "admin.log.fields.banned",
  banReason: "admin.log.fields.banReason",
  banExpires: "admin.log.fields.banExpires",
  duration: "admin.log.fields.duration",
  wipe: "admin.log.fields.wipe",
  hiddenWishes: "admin.log.fields.hiddenWishes",
  removedVotes: "admin.log.fields.removedVotes",
  role: "admin.log.fields.role",
  slug: "admin.log.fields.slug",
  tagline: "admin.log.fields.tagline",
  descriptionMd: "admin.log.fields.descriptionMd",
  genre: "admin.log.fields.genre",
  coverUrl: "admin.log.fields.coverUrl",
  screenshots: "admin.log.fields.screenshots",
  trailerUrl: "admin.log.fields.trailerUrl",
  platforms: "admin.log.fields.platforms",
  releaseDate: "admin.log.fields.releaseDate",
  sortOrder: "admin.log.fields.sortOrder",
  wishesOpen: "admin.log.fields.wishesOpen",
  published: "admin.log.fields.published",
  aboutMd: "admin.log.fields.aboutMd",
  mission: "admin.log.fields.mission",
  team: "admin.log.fields.team",
  socials: "admin.log.fields.socials",
  contactEmail: "admin.log.fields.contactEmail",
  added: "admin.log.fields.added",
  removed: "admin.log.fields.removed",
} as const;
