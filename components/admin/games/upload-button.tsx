"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

/** A button that opens the file picker for JPG, PNG and WebP. */
export function UploadButton({
  label,
  multiple = false,
  loading,
  disabled,
  onFiles,
}: {
  label: string;
  multiple?: boolean;
  loading: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        hidden
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          if (files.length > 0) onFiles(files);
        }}
      />
      <Button
        type="button"
        variant="secondary"
        loading={loading}
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        {loading ? t("admin.games.uploading") : label}
      </Button>
    </>
  );
}
