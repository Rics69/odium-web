import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import type { ImageStorage } from ".";

/** Public addresses of uploaded files; app/uploads serves them. */
export const UPLOADS_PATH = "/uploads/";

// Names are content hashes with an extension: nothing else gets in.
const SAFE_NAME = /^[a-f0-9]{64}\.(webp|png|jpg)$/;

const types: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
};

const directory = () => path.resolve(env.STORAGE_DIR, "uploads");

/** Files in STORAGE_DIR/uploads, a Docker volume on the server. */
export const diskStorage: ImageStorage = {
  async save(name, data) {
    if (!SAFE_NAME.test(name)) throw new Error(`Unsafe file name: ${name}`);
    await mkdir(directory(), { recursive: true });
    await writeFile(path.join(directory(), name), data);
    return `${UPLOADS_PATH}${name}`;
  },

  async read(name) {
    if (!SAFE_NAME.test(name)) return null;
    try {
      const data = await readFile(path.join(directory(), name));
      return { data, contentType: types[name.split(".").pop()!]! };
    } catch {
      return null;
    }
  },
};
