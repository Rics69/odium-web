import type { Metadata } from "next";
import { env } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),
  title: { default: "Odium", template: "%s · Odium" },
  description: "Игровая студия Odium: наши игры и доска пожеланий игроков.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
