import { randomBytes, randomInt } from "node:crypto";

/**
 * A made-up visitor address. Limits count per IP, and without Caddy the
 * e2e server trusts X-Forwarded-For as sent, so every test is someone else.
 */
export function randomIp(): string {
  return `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
}

/** Sign-up details nobody has used yet. */
export function newPlayer() {
  const id = randomBytes(4).toString("hex");
  return {
    email: `e2e-${id}@example.com`,
    nickname: `Player_${id}`,
    password: `pw-${randomBytes(8).toString("hex")}`,
  };
}
