import "server-only";
import { diskStorage } from "./disk";

/**
 * Where uploaded images are kept (spec, section 4.5): the server's disk at
 * the start; S3 later is another implementation of the same two methods,
 * and nothing else changes.
 */
export type ImageStorage = {
  /** Saves a file under its name and gives the address the site shows. */
  save(name: string, data: Buffer, contentType: string): Promise<string>;
  /** The file behind an address of this storage, or null. */
  read(name: string): Promise<{ data: Buffer; contentType: string } | null>;
};

export const storage: ImageStorage = diskStorage;
