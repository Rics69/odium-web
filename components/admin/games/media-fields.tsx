"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { t } from "@/lib/i18n";
import { ALT_MAX, SCREENSHOTS_MAX } from "@/lib/validation/admin-games";
import type { Screenshot } from "@/lib/validation/games";
import { UploadButton } from "./upload-button";
import { useUpload } from "./use-upload";

/** The cover: a preview, upload or replace, remove. */
export function CoverField({
  value,
  onChange,
  error,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  error?: string;
}) {
  const { upload, uploading } = useUpload();
  return (
    <div className="flex flex-col gap-3">
      {value && (
        <div className="relative aspect-[16/9] max-w-xl overflow-hidden rounded-md bg-line">
          <Image
            src={value}
            alt={t("admin.games.coverAlt")}
            fill
            sizes="(min-width: 768px) 576px, 100vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <UploadButton
          label={value ? t("admin.games.replace") : t("admin.games.upload")}
          loading={uploading}
          onFiles={async (files) => {
            const [saved] = await upload(files.slice(0, 1));
            if (saved) onChange(saved.url);
          }}
        />
        {value && (
          <Button type="button" variant="ghost" onClick={() => onChange(null)}>
            {t("admin.games.remove")}
          </Button>
        )}
      </div>
      <p className="text-sm text-ink-2">{t("admin.games.imageHint")}</p>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}

/** Screenshots: upload several, caption each, put them in order. */
export function ScreenshotsField({
  value,
  onChange,
  errors,
}: {
  value: Screenshot[];
  onChange: (screenshots: Screenshot[]) => void;
  errors: Record<string, string | undefined>;
}) {
  const { upload, uploading } = useUpload();
  const room = SCREENSHOTS_MAX - value.length;

  function move(index: number, by: -1 | 1) {
    const next = [...value];
    [next[index], next[index + by]] = [next[index + by]!, next[index]!];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-4">
      {value.length > 0 && (
        <ol className="grid gap-4 md:grid-cols-2">
          {value.map((shot, index) => (
            <li
              key={shot.url}
              className="flex flex-col gap-3 rounded-md border border-line p-3"
            >
              <Image
                src={shot.url}
                alt={shot.alt}
                width={shot.width}
                height={shot.height}
                sizes="(min-width: 768px) 320px, 100vw"
                className="h-40 w-full rounded-sm bg-line object-contain"
              />
              <Input
                aria-label={t("admin.games.screenshotAlt", {
                  number: index + 1,
                })}
                aria-invalid={
                  errors[`screenshots.${index}.alt`] ? true : undefined
                }
                placeholder={t("admin.games.altPlaceholder")}
                value={shot.alt}
                maxLength={ALT_MAX}
                onChange={(event) =>
                  onChange(
                    value.map((item, i) =>
                      i === index ? { ...item, alt: event.target.value } : item,
                    ),
                  )
                }
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  {t("admin.games.earlier")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={index === value.length - 1}
                  onClick={() => move(index, 1)}
                >
                  {t("admin.games.later")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  {t("admin.games.remove")}
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div>
        <UploadButton
          label={t("admin.games.upload")}
          multiple
          loading={uploading}
          disabled={room <= 0}
          onFiles={async (files) => {
            const saved = await upload(files.slice(0, room));
            onChange([
              ...value,
              ...saved.map((image) => ({ ...image, alt: "" })),
            ]);
          }}
        />
      </div>
      <p className="text-sm text-ink-2">
        {t("admin.games.screenshotsHint")} {t("admin.games.imageHint")}
      </p>
      {errors.screenshots && (
        <p className="text-sm text-error">{errors.screenshots}</p>
      )}
    </div>
  );
}
