import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { connection } from "next/server";
import sharp from "sharp";
import { t } from "@/lib/i18n";
import { getPublishedGame } from "@/lib/server/games";
import { OG_DISPLAY, OG_TEXT, ogFonts } from "@/lib/server/og";

// The picture a link to the game shows in messengers and social networks.

export const alt = t("game.ogAlt");
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Local covers come from public/, uploaded ones by URL; the picture is turned
// into a PNG data URL because the renderer reads only a few formats.
async function coverDataUrl(coverUrl: string) {
  const source = coverUrl.startsWith("/")
    ? await readFile(join(process.cwd(), "public", coverUrl))
    : Buffer.from(await (await fetch(coverUrl)).arrayBuffer());
  const png = await sharp(source)
    .resize(640, 400, { fit: "cover" })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const game = await getPublishedGame((await params).slug);
  const cover = game?.coverUrl ? await coverDataUrl(game.coverUrl) : null;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#f7f3eb",
        color: "#1c1a17",
        padding: 64,
        fontFamily: OG_TEXT,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          paddingRight: 32,
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 4, color: "#5e5850" }}>
          [ ODIUM ]
        </div>
        <div
          style={{
            marginTop: 40,
            fontFamily: OG_DISPLAY,
            fontSize: game && game.title.length > 14 ? 64 : 80,
            lineHeight: 1.05,
          }}
        >
          {game?.title ?? "Odium"}
        </div>
        {game?.tagline && (
          <div
            style={{
              marginTop: 28,
              fontSize: 32,
              lineHeight: 1.3,
              color: "#5e5850",
            }}
          >
            {game.tagline}
          </div>
        )}
        <div
          style={{
            marginTop: "auto",
            width: 120,
            height: 10,
            background: "#2d46e6",
          }}
        />
      </div>
      {cover && (
        <div style={{ display: "flex", alignItems: "center" }}>
          <img
            src={cover}
            width={460}
            height={288}
            alt=""
            style={{
              borderRadius: 24,
              transform: "rotate(-4deg)",
              boxShadow: "0 12px 24px rgba(0,0,0,0.12)",
            }}
          />
        </div>
      )}
    </div>,
    {
      ...size,
      fonts: await ogFonts(),
    },
  );
}
