"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { ApiRequestError, apiSend } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { t, tp } from "@/lib/i18n";

export type Viewer = { signedIn: boolean; verified: boolean };

// The counter with the vote toggle. Step 3.5 makes it answer at once and
// adds the guest dialog; for now a guest goes to sign in.
export function VoteButton({
  wishId,
  title,
  votesCount,
  votedByMe,
  closed,
  viewer,
}: {
  wishId: string;
  title: string;
  votesCount: number;
  votedByMe: boolean;
  closed: boolean;
  viewer: Viewer;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const toast = useToast();
  const [state, setState] = useState({ votesCount, votedByMe });
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!viewer.signedIn) {
      const here = search.size > 0 ? `${pathname}?${search}` : pathname;
      router.push(`/login?next=${encodeURIComponent(here)}` as never);
      return;
    }
    if (!viewer.verified) {
      toast({ title: t("errors.emailNotVerified"), tone: "error" });
      return;
    }
    setPending(true);
    try {
      setState(
        await apiSend<{ votesCount: number; votedByMe: boolean }>(
          state.votedByMe ? "DELETE" : "PUT",
          `/api/wishes/${wishId}/vote`,
          {},
        ),
      );
    } catch (error) {
      toast({
        title:
          error instanceof ApiRequestError
            ? error.message
            : t("errors.internal"),
        tone: "error",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={closed || pending}
      aria-pressed={state.votedByMe}
      aria-label={`${t("board.vote", { title })}: ${tp("board.votes", state.votesCount)}`}
      title={closed ? t("board.votingClosed") : undefined}
      className={cn(
        "flex h-16 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border text-sm font-semibold tabular-nums transition-[background-color,border-color,color,translate] duration-150",
        state.votedByMe
          ? "border-accent bg-accent text-white"
          : "border-line-strong bg-surface text-ink hover:border-accent hover:text-accent",
        !closed && "active:translate-y-px",
        closed &&
          "cursor-not-allowed opacity-60 hover:border-line-strong hover:text-ink",
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
      >
        <path d="m6 15 6-6 6 6" />
      </svg>
      {state.votesCount}
    </button>
  );
}
