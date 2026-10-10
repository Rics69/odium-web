import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { env } from "@/lib/env";
import { MAX_UPLOAD_BYTES, saveImage } from "./images";
import { storage } from "./storage";

const picture = (format: "png" | "jpeg" | "webp" | "gif", width = 40) =>
  sharp({
    create: {
      width,
      height: Math.round(width / 2),
      channels: 3,
      background: { r: 45, g: 70, b: 230 },
    },
  })
    .toFormat(format)
    .toBuffer();

describe("uploaded images", () => {
  it("saves JPG, PNG and WebP anew as WebP, by content hash", async () => {
    for (const format of ["png", "jpeg", "webp"] as const) {
      const saved = await saveImage(await picture(format));
      expect(saved).toMatchObject({ width: 40, height: 20 });
      expect(saved.url).toMatch(/^\/uploads\/[a-f0-9]{64}\.webp$/);
      const file = await readFile(
        path.resolve(env.STORAGE_DIR, saved.url.slice(1)),
      );
      expect((await sharp(file).metadata()).format).toBe("webp");
    }
  });

  it("drops camera data and turns the picture upright", async () => {
    // 40×20, but EXIF says "rotate 90°" and carries a camera model.
    const withExif = await sharp(await picture("jpeg"))
      .withExif({ IFD0: { Model: "Secret Camera" } })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    expect(withExif.includes(Buffer.from("Secret Camera"))).toBe(true);

    const saved = await saveImage(withExif);

    expect(saved).toMatchObject({ width: 20, height: 40 });
    const file = (await storage.read(saved.url.split("/").pop()!))!.data;
    const meta = await sharp(file).metadata();
    expect(meta.exif).toBeUndefined();
    expect(file.includes(Buffer.from("Secret Camera"))).toBe(false);
  });

  it("makes big pictures no larger than 2560 px", async () => {
    const saved = await saveImage(await picture("png", 4000));
    expect(saved).toMatchObject({ width: 2560, height: 1280 });
  });

  it("refuses other formats, non-images and files over 5 MB", async () => {
    await expect(saveImage(await picture("gif"))).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      fields: { file: "Нужна картинка JPG, PNG или WebP." },
    });
    // A script named like a picture is told by its content.
    await expect(
      saveImage(Buffer.from("<script>alert(1)</script>")),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      saveImage(Buffer.alloc(MAX_UPLOAD_BYTES + 1)),
    ).rejects.toMatchObject({ fields: { file: "Картинка больше 5 МБ." } });
  });

  it("serves only names it could have made", async () => {
    expect(await storage.read("../../.env.local")).toBeNull();
    expect(await storage.read(`${"a".repeat(64)}.webp`)).toBeNull();
  });
});
