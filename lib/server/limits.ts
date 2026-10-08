// Every rate limit of the site in one place (spec, section 7): change the
// numbers here, not in the code that checks them.

export type RateLimitRule = {
  /** How many requests one key may make per window. */
  max: number;
  /** Window length. Windows are fixed: they start at whole minutes, hours, days. */
  windowSeconds: number;
};

const minute = 60;
const hour = 60 * minute;
const day = 24 * hour;

export const limits = {
  /** Any API request, per IP. */
  api: { max: 300, windowSeconds: minute },
  /** Sign-ups, per IP (step 2.4). */
  signUp: { max: 3, windowSeconds: hour },
  /** Sign-in tries, per IP + email; when they run out, the lock below. */
  signInTries: { max: 10, windowSeconds: 15 * minute },
  /** New wishes, per user; admins have no limit (step 3.2). */
  wishPerHour: { max: 5, windowSeconds: hour },
  wishPerDay: { max: 20, windowSeconds: day },
  /** New wishes from accounts younger than a day, per user. */
  wishPerDayNewAccount: { max: 2, windowSeconds: day },
  /** Edits of one's own wishes, per user (step 3.7). */
  wishEdit: { max: 10, windowSeconds: hour },
  /** Voting and taking a vote back, per user (step 3.3). */
  vote: { max: 60, windowSeconds: minute },
  /** Resending the confirmation email, per user (step 2.4). */
  verificationEmailPerMinute: { max: 1, windowSeconds: minute },
  verificationEmailPerDay: { max: 5, windowSeconds: day },
  /** Password reset requests, per email and per IP separately (step 2.6). */
  passwordResetPerEmail: { max: 3, windowSeconds: hour },
  passwordResetPerIp: { max: 3, windowSeconds: hour },
} as const satisfies Record<string, RateLimitRule>;

export type LimitName = keyof typeof limits;

/** How long a subject waits once it is locked out, in seconds. */
export const locks = {
  /** Ten failed sign-ins for one IP + email: no tries for 15 minutes. */
  signIn: 15 * minute,
} as const;

export type LockName = keyof typeof locks;
