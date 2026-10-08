"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ApiRequestError, apiPost } from "@/lib/api-client";
import { t } from "@/lib/i18n";

/** Ends this session and goes home with a full load. */
export function SignOutButton() {
  const toast = useToast();
  const [leaving, setLeaving] = useState(false);

  async function signOut() {
    setLeaving(true);
    try {
      await apiPost("/api/auth/sign-out", {});
      window.location.replace("/");
    } catch (error) {
      setLeaving(false);
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
    <Button variant="secondary" loading={leaving} onClick={signOut}>
      {t("account.signOut")}
    </Button>
  );
}
