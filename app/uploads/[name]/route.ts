import { storage } from "@/lib/server/storage";

// Uploaded images. Names are content hashes, so a file never changes and
// browsers may keep it for a year.
export async function GET(
  _request: Request,
  { params }: RouteContext<"/uploads/[name]">,
) {
  const file = await storage.read((await params).name);
  if (!file) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
