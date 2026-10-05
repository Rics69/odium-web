import { t } from "@/lib/i18n";

export default function HomePage() {
  return (
    <section className="flex min-h-[60dvh] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 className="font-display text-display">ODIUM</h1>
      <p className="text-lg text-ink-2">{t("home.comingSoon")}</p>
    </section>
  );
}
