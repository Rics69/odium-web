import { z } from "zod";
import { t } from "@/lib/i18n";
import { isReservedNickname } from "./reserved-nicknames";

// Accounts: one set of rules for the forms and the API (spec, section 7).

const LATIN = /[a-z]/i;
// А–я and Ё, ё (they sit apart from the rest of the alphabet).
const CYRILLIC = /[А-яЁё]/;
const NICKNAME_CHARACTERS = /^[a-z0-9_А-яЁё-]+$/i;

export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 24;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

// Letters of one alphabet only: a Cyrillic «а» inside a Latin nickname
// would make a lookalike of someone else's.
export const nicknameSchema = z
  .string({ error: t("account.errors.nicknameRequired") })
  .trim()
  .min(NICKNAME_MIN, t("account.errors.nicknameShort"))
  .max(NICKNAME_MAX, t("account.errors.nicknameLong"))
  .regex(NICKNAME_CHARACTERS, t("account.errors.nicknameCharacters"))
  .refine(
    (nickname) => !(LATIN.test(nickname) && CYRILLIC.test(nickname)),
    t("account.errors.nicknameMixed"),
  )
  .refine(
    (nickname) => !isReservedNickname(nickname),
    t("account.errors.nicknameReserved"),
  );

export const emailSchema = z
  .string({ error: t("account.errors.emailInvalid") })
  .trim()
  .toLowerCase()
  .pipe(z.email(t("account.errors.emailInvalid")).max(254));

export const passwordSchema = z
  .string({ error: t("account.errors.passwordShort") })
  .min(PASSWORD_MIN, t("account.errors.passwordShort"))
  .max(PASSWORD_MAX, t("account.errors.passwordLong"));

export const signUpSchema = z.object({
  email: emailSchema,
  nickname: nicknameSchema,
  password: passwordSchema,
  /** Where the player came from; they return there after confirming. */
  next: z.string().optional(),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const resendVerificationSchema = z.object({
  email: emailSchema,
  next: z.string().optional(),
});
