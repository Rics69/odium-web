import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/server/session";
import { HeaderBar } from "./header-bar";

// The header knows who is signed in: "Sign in" for a guest, the nickname
// for a player. Only the nickname goes to the browser.
export async function SiteHeader() {
  const user = await getCurrentUser(await headers());
  return <HeaderBar user={user && { nickname: user.nickname }} />;
}
