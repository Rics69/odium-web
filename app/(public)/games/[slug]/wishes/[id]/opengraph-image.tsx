import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { t, tp } from "@/lib/i18n";
import { OG_DISPLAY, OG_TEXT, ogFonts } from "@/lib/server/og";
import { getWish } from "@/lib/server/wishes";

// The picture a link to a wish shows in messengers (spec, section 10).
// Only what a guest may see: a hidden or deleted wish gets the plain card.

export const alt = t("wish.ogAlt");
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  await connection();
  const { slug, id } = await params;
  const wish = UUID.test(id) ? await getWish(id, null) : null;
  const shown = wish && wish.game.slug === slug ? wish : null;
  const remove = shown?.type === "remove";

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#f7f3eb",
        color: "#1c1a17",
        padding: 64,
        fontFamily: OG_TEXT,
      }}
    >
      <div style={{ fontSize: 28, letterSpacing: 4, color: "#5e5850" }}>
        {shown ? `[ ODIUM · ${shown.game.title.toUpperCase()} ]` : "[ ODIUM ]"}
      </div>
      {shown && (
        <div style={{ display: "flex", marginTop: 40 }}>
          <div
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              fontSize: 28,
              background: remove ? "#fbe3e0" : "#e2f1e4",
              color: remove ? "#b42318" : "#166534",
            }}
          >
            {t(remove ? "wishType.remove" : "wishType.add")}
          </div>
        </div>
      )}
      <div
        style={{
          marginTop: 28,
          fontFamily: OG_DISPLAY,
          fontSize: shown && shown.title.length > 40 ? 56 : 72,
          lineHeight: 1.1,
        }}
      >
        {shown?.title ?? t("board.title")}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginTop: "auto",
          gap: 24,
        }}
      >
        <div style={{ width: 120, height: 10, background: "#2d46e6" }} />
        {shown && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 32,
              color: "#2d46e6",
            }}
          >
            {/* The vote arrow: the fonts have no ▲. */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="m6 15 6-6 6 6"
                stroke="#2d46e6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {tp("board.votes", shown.votesCount)}
          </div>
        )}
      </div>
    </div>,
    { ...size, fonts: await ogFonts() },
  );
}
