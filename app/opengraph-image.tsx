import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { t } from "@/lib/i18n";
import { OG_DISPLAY, OG_TEXT, ogFonts } from "@/lib/server/og";
import { getStudioInfo } from "@/lib/server/studio";

// The picture a link to the site shows in messengers, unless the page has
// its own (a game, a wish): the studio's slogan in the display font.

export const alt = t("site.ogAlt");
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  await connection();
  const slogan = (await getStudioInfo())?.tagline || t("site.slogan");

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#f7f3eb",
        color: "#1c1a17",
        padding: 72,
        fontFamily: OG_TEXT,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: 17,
            background: "#2d46e6",
          }}
        >
          <div
            style={{
              width: 34,
              height: 37,
              borderRadius: "50%",
              border: "9px solid #fff",
            }}
          />
        </div>
        <div style={{ fontFamily: OG_DISPLAY, fontSize: 44, letterSpacing: 2 }}>
          ODIUM
        </div>
      </div>
      <div
        style={{
          marginTop: "auto",
          fontFamily: OG_DISPLAY,
          fontSize: slogan.length > 40 ? 64 : 80,
          lineHeight: 1.1,
          maxWidth: 1000,
        }}
      >
        {slogan}
      </div>
      {/* The hand-drawn underline and sparkle of the site (Doodle). */}
      <svg
        width="360"
        height="30"
        viewBox="0 0 200 16"
        style={{ marginTop: 36 }}
      >
        <path
          d="M3 10 C 28 4, 46 14, 70 9 S 112 3, 136 9 S 176 13, 197 6"
          fill="none"
          stroke="#2d46e6"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
      <svg
        width="150"
        height="150"
        viewBox="0 0 48 48"
        style={{ position: "absolute", top: 150, right: 110 }}
      >
        <path
          d="M24 3 C 25 17, 31 23, 45 24 C 31 25, 25 31, 24 45 C 23 31, 17 25, 3 24 C 17 23, 23 17, 24 3 Z"
          fill="none"
          stroke="#2d46e6"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>,
    { ...size, fonts: await ogFonts() },
  );
}
