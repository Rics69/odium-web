import { headers } from "next/headers";
import { VerifyEmailBanner } from "@/components/account/verify-email-banner";
import { getCurrentUser } from "@/lib/server/session";
import { HeaderBar } from "./header-bar";

// The header knows who is signed in: "Sign in" for a guest, the nickname
// for a player, and a reminder under it until the email is confirmed.
// Only what is shown goes to the browser.
export async function SiteHeader() {
  const user = await getCurrentUser(await headers());
  return (
    <>
      <HeaderBar user={user && { nickname: user.nickname }} />
      {user && !user.emailVerified && <VerifyEmailBanner email={user.email} />}
    </>
  );
}
