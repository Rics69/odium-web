import type { PlaywrightWorkerArgs } from "@playwright/test";
import { findLetter } from "../test/mailpit";
import { newPlayer, randomIp } from "./visitors";

/**
 * A player with a confirmed email, signed in on a request context of
 * their own (another visitor than the page). Dispose it at the end.
 */
export async function confirmedPlayer(
  playwright: PlaywrightWorkerArgs["playwright"],
  baseURL: string,
) {
  const request = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { origin: baseURL, "x-forwarded-for": randomIp() },
  });
  const player = newPlayer();
  await request.post("/api/auth/sign-up", { data: player });
  const letter = await findLetter(player.email);
  await request.get(
    letter.Text.match(/https?:\/\/\S+verify-email\?token=\S+/)![0],
  );
  return { ...player, request };
}
