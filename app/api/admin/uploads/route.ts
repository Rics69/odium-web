import { t } from "@/lib/i18n";
import { ApiError, apiRoute } from "@/lib/server/http";
import { MAX_UPLOAD_BYTES, saveImage } from "@/lib/server/images";
import { adminOnly } from "@/lib/server/session";

// The form's own fields are a few hundred bytes on top of the file.
const MAX_REQUEST_BYTES = MAX_UPLOAD_BYTES + 64 * 1024;

const tooBig = () =>
  new ApiError("VALIDATION_ERROR", {
    fields: { file: t("admin.games.errors.imageSize") },
  });

/**
 * An image for a game: multipart with `file` → { url, width, height }.
 * A body that says it is too big is turned away before it is read.
 */
export const POST = apiRoute({ guard: adminOnly }, async ({ request }) => {
  if (Number(request.headers.get("content-length")) > MAX_REQUEST_BYTES) {
    throw tooBig();
  }
  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    throw new ApiError("VALIDATION_ERROR");
  }
  if (!(file instanceof File)) {
    throw new ApiError("VALIDATION_ERROR", {
      fields: { file: t("admin.games.errors.imageType") },
    });
  }
  if (file.size > MAX_UPLOAD_BYTES) throw tooBig();
  return saveImage(Buffer.from(await file.arrayBuffer()));
});
