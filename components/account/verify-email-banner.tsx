"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Doodle } from "@/components/doodles/doodle";
import { useToast } from "@/components/ui/toast";
import { ApiRequestError, apiPost } from "@/lib/api-client";
import { t } from "@/lib/i18n";

// Under the header while the email is not confirmed: posting and voting
// wait for it (spec, section 3). The new link returns to this page.
export function VerifyEmailBanner({ email }: { email: string }) {
  const pathname = usePathname();
  const toast = useToast();
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  // That page is about this already.
  if (pathname === "/verify-email") return null;

  async function resend() {
    setState("sending");
    try {
      await apiPost("/api/auth/send-verification-email", {
        email,
        next: pathname,
      });
      setState("sent");
    } catch (error) {
      setState("idle");
      toast({
        title:
          error instanceof ApiRequestError
            ? error.message
            : t("errors.internal"),
        tone: "error",
      });
    }
  }

  return (
    <div className="bg-accent text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm md:px-8">
        <p>{t("account.banner.text", { email })}</p>
        {state === "sent" ? (
          <p
            role="status"
            className="inline-flex items-center gap-1.5 font-medium"
          >
            <Doodle name="check" draw="view" className="size-4" />
            {t("account.banner.sent")}
          </p>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={state === "sending"}
            className="min-h-11 font-medium underline decoration-white/50 underline-offset-4 transition-colors hover:decoration-white disabled:opacity-60 md:min-h-0"
          >
            {t("account.banner.resend")}
          </button>
        )}
      </div>
    </div>
  );
}
