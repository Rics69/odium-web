import type { Metadata } from "next";
import { MotionProvider } from "@/components/motion/motion-provider";
import { ToastProvider } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { env } from "@/lib/env";
import { displayFace, inter } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),
  title: { default: "Odium", template: "%s · Odium" },
  description: "Игровая студия Odium: наши игры и доска пожеланий игроков.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={cn(inter.variable, displayFace.variable)}>
      <body className="min-h-dvh">
        <MotionProvider>
          <ToastProvider>{children}</ToastProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
