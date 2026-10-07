import { Doodle } from "@/components/doodles/doodle";

// Game titles running across the page — the one endless animation on the
// site (DEV_PLAN.md, «Правила анимаций»). Decorative: the gallery below has
// the same titles as links. Pauses on hover.
export function Marquee({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  // Wider than any screen, then twice, so moving by half loops seamlessly.
  const copies = Math.max(2, Math.ceil(8 / items.length));
  const row = Array.from({ length: copies }, () => items).flat();

  const half = (copy: string) => (
    <div className="flex shrink-0 items-center">
      {row.map((title, index) => (
        <span key={`${copy}-${index}`} className="flex items-center">
          <span className="px-6 font-display text-display-sm whitespace-nowrap md:px-10">
            {title}
          </span>
          <Doodle name="sparkle" className="size-8 text-accent md:size-12" />
        </span>
      ))}
    </div>
  );

  return (
    <div
      aria-hidden
      className="group overflow-hidden border-y border-line py-6 md:py-8"
    >
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
        {half("a")}
        {half("b")}
      </div>
    </div>
  );
}
