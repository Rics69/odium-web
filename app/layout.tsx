import type { Metadata } from "next";
import { MotionProvider } from "@/components/motion/motion-provider";
import { CursorDot } from "@/components/site/cursor-dot";
import { ToastProvider } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { env } from "@/lib/env";
import { locale, t } from "@/lib/i18n";
import { displayFace, inter } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),
  title: { default: "Odium", template: "%s · Odium" },
  description: t("site.description"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={locale} className={cn(inter.variable, displayFace.variable)}>
      <body className="flex min-h-dvh flex-col">
        <MotionProvider>
          <ToastProvider>
            {children}
            <CursorDot />
          </ToastProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
