"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { ApiRequestError, apiUpload } from "@/lib/api-client";
import { t } from "@/lib/i18n";

export type Uploaded = { url: string; width: number; height: number };

/** Sends pictures one by one; a refused one is told in a toast. */
export function useUpload() {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  async function upload(files: File[]): Promise<Uploaded[]> {
    setUploading(true);
    const saved: Uploaded[] = [];
    try {
      for (const file of files) {
        try {
          saved.push(await apiUpload<Uploaded>("/api/admin/uploads", file));
        } catch (error) {
          const message =
            error instanceof ApiRequestError
              ? (Object.values(error.fields)[0] ?? error.message)
              : t("errors.internal");
          toast({ title: `${file.name}: ${message}`, tone: "error" });
        }
      }
    } finally {
      setUploading(false);
    }
    return saved;
  }

  return { upload, uploading };
}
