"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { spring } from "@/components/motion/presets";
import { useToast } from "@/components/ui/toast";
import { ApiRequestError, apiSend } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { t, tp } from "@/lib/i18n";
import { useBoard } from "./board-context";

type Vote = { votesCount: number; votedByMe: boolean };

/**
 * The counter with the vote toggle (spec, section 5). It changes at once;
 * the requests go one after another, and when the last one is answered the
 * counter takes the server's number (other players vote too). A refusal
 * puts it back with the server's message.
 */
export function VoteButton({
  wishId,
  title,
  votesCount,
  votedByMe,
  closed,
}: Vote & { wishId: string; title: string; closed: boolean }) {
  const { viewer, askToSignIn } = useBoard();
  const toast = useToast();
  const [shown, setShown] = useState<Vote>({ votesCount, votedByMe });
  const [bursts, setBursts] = useState(0);
  const confirmed = useRef<Vote>({ votesCount, votedByMe });
  const queue = useRef(Promise.resolve());
  const waiting = useRef(0);

  const locked = closed || (viewer.signedIn && !viewer.verified);

  function toggle() {
    if (!viewer.signedIn) return askToSignIn();
    if (locked) return;
    const on = !shown.votedByMe;
    setShown((current) => ({
      votesCount: current.votesCount + (on ? 1 : -1),
      votedByMe: on,
    }));
    if (on) setBursts((count) => count + 1);

    waiting.current += 1;
    queue.current = queue.current.then(async () => {
      try {
        confirmed.current = await apiSend<Vote>(
          on ? "PUT" : "DELETE",
          `/api/wishes/${wishId}/vote`,
          {},
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
        waiting.current -= 1;
        if (waiting.current === 0) setShown(confirmed.current);
      }
    });
  }

  return (
    <motion.button
      type="button"
      onClick={toggle}
      aria-disabled={locked || undefined}
      aria-pressed={shown.votedByMe}
      aria-label={`${t("board.vote", { title })}: ${tp("board.votes", shown.votesCount)}`}
      title={
        closed
          ? t("board.votingClosed")
          : locked
            ? t("board.verifyFirstShort")
            : undefined
      }
      whileTap={locked ? undefined : { scale: 0.88 }}
      transition={spring.bouncy}
      className={cn(
        "relative flex h-16 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border text-sm font-semibold tabular-nums transition-[background-color,border-color,color] duration-150",
        shown.votedByMe
          ? "border-accent bg-accent text-white"
          : "border-line-strong bg-surface text-ink",
        locked
          ? "cursor-not-allowed opacity-60"
          : !shown.votedByMe && "hover:border-accent hover:text-accent",
      )}
    >
      <motion.svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
        animate={{ y: shown.votedByMe ? -2 : 0 }}
        transition={spring.bouncy}
      >
        <path d="m6 15 6-6 6 6" />
      </motion.svg>
      <Odometer value={shown.votesCount} />
      <Burst key={bursts} active={bursts > 0} />
    </motion.button>
  );
}

/** Digits that roll up when the count grows and down when it shrinks. */
function Odometer({ value }: { value: number }) {
  // React's way to remember the previous value: compare during render.
  const [previous, setPrevious] = useState(value);
  const [direction, setDirection] = useState(1);
  if (value !== previous) {
    setDirection(value > previous ? 1 : -1);
    setPrevious(value);
  }
  return (
    <span className="relative inline-flex h-5 overflow-hidden leading-5">
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.span
          key={value}
          custom={direction}
          variants={{
            enter: (d: number) => ({ y: d > 0 ? "100%" : "-100%", opacity: 0 }),
            center: { y: "0%", opacity: 1 },
            exit: (d: number) => ({ y: d > 0 ? "-100%" : "100%", opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={spring.snappy}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const PARTICLES = Array.from({ length: 10 }, (_, index) => {
  const angle = (index / 10) * Math.PI * 2 + 0.3;
  const distance = 28 + (index % 3) * 8;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    size: 4 + (index % 2) * 2,
  };
});

/** A little salute from the button when a vote is put. */
function Burst({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  if (!active || reduce) return null;
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {PARTICLES.map((particle, index) => (
        <motion.span
          key={index}
          className="absolute top-1/2 left-1/2 rounded-full bg-accent"
          style={{ width: particle.size, height: particle.size }}
          initial={{ x: "-50%", y: "-50%", scale: 1, opacity: 1 }}
          animate={{
            x: `calc(-50% + ${particle.x}px)`,
            y: `calc(-50% + ${particle.y}px)`,
            scale: 0,
            opacity: 0,
          }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </span>
  );
}
