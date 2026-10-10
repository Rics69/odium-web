import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { t } from "@/lib/i18n";
import { ApiError } from "./http";
import { storage } from "./storage";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** The longest side after saving: enough for a full-screen screenshot. */
const MAX_SIDE = 2560;
const FORMATS = new Set(["jpeg", "png", "webp"]);

const refused = () =>
  new ApiError("VALIDATION_ERROR", {
    fields: { file: t("admin.games.errors.imageType") },
  });

export type SavedImage = { url: string; width: number; height: number };

/**
 * Takes an uploaded picture (spec, section 6): JPG, PNG or WebP up to 5 MB,
 * the type told by the content, not the name. It is turned upright by its
 * EXIF, made no larger than 2560 px and saved anew as WebP: no camera
 * data or location goes on, and no hidden payload survives.
 */
export async function saveImage(input: Buffer): Promise<SavedImage> {
  if (input.length > MAX_UPLOAD_BYTES) {
    throw new ApiError("VALIDATION_ERROR", {
      fields: { file: t("admin.games.errors.imageSize") },
    });
  }
  let format: string | undefined;
  try {
    format = (await sharp(input).metadata()).format;
  } catch {
    throw refused();
  }
  if (!format || !FORMATS.has(format)) throw refused();

  const { data, info } = await sharp(input, { limitInputPixels: 50_000_000 })
    .rotate()
    .resize({
      width: MAX_SIDE,
      height: MAX_SIDE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true });
  const name = `${createHash("sha256").update(data).digest("hex")}.webp`;
  const url = await storage.save(name, data, "image/webp");
  return { url, width: info.width, height: info.height };
}
