"use client";

import type { Route } from "next";
import { usePathname, useSearchParams } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { LinkButton } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { t } from "@/lib/i18n";

export type Viewer = { signedIn: boolean; verified: boolean };

type BoardContextValue = {
  viewer: Viewer;
  /** For a guest who tried to vote or post: sign in or sign up, then back. */
  askToSignIn: () => void;
};

const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoard(): BoardContextValue {
  const value = useContext(BoardContext);
  if (!value) throw new Error("useBoard outside BoardProvider");
  return value;
}

/** Who looks at the board, and the one sign-in dialog for all its buttons. */
export function BoardProvider({
  viewer,
  children,
}: {
  viewer: Viewer;
  children: ReactNode;
}) {
  const [asking, setAsking] = useState(false);
  const pathname = usePathname();
  const search = useSearchParams();
  const here = encodeURIComponent(
    search.size > 0 ? `${pathname}?${search}` : pathname,
  );

  return (
    <BoardContext value={{ viewer, askToSignIn: () => setAsking(true) }}>
      {children}
      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent
          title={t("board.signInTitle")}
          description={t("board.signInText")}
          closeLabel={t("common.close")}
        >
          <div className="flex flex-col gap-3 md:flex-row">
            <LinkButton
              href={`/login?next=${here}` as Route}
              className="flex-1"
            >
              {t("account.login.submit")}
            </LinkButton>
            <LinkButton
              href={`/register?next=${here}` as Route}
              variant="secondary"
              className="flex-1"
            >
              {t("account.login.register")}
            </LinkButton>
          </div>
        </DialogContent>
      </Dialog>
    </BoardContext>
  );
}
