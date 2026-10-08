// Nicknames nobody can take: the studio's name and words that make a player
// look like staff. Data, not interface text, so it may be in Russian.
// Compared after lowercasing, ё → е, dropping _ and - and trailing digits:
// "Admin_2" and "модератор-1" are taken too.

const reservedNicknames = new Set([
  "admin",
  "administrator",
  "administration",
  "moderator",
  "moder",
  "mod",
  "support",
  "staff",
  "official",
  "system",
  "root",
  "owner",
  "deleted",
  "deleteduser",
  "админ",
  "администратор",
  "администрация",
  "модератор",
  "модер",
  "поддержка",
  "официальный",
  "система",
  "владелец",
  "удаленный",
  "удаленныйпользователь",
]);

// Anything starting with the studio's name: Odium_Dev, odium-team, Одиум.
const reservedPrefixes = ["odium", "одиум"];

/** Admin, Moderator_2, Odium_Dev and the like belong to the studio. */
export function isReservedNickname(nickname: string): boolean {
  const core = nickname
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[_-]/g, "")
    .replace(/\d+$/, "");
  return (
    reservedNicknames.has(core) ||
    reservedPrefixes.some((prefix) => core.startsWith(prefix))
  );
}
