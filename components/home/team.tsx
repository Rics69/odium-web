import type { CSSProperties } from "react";
import { Doodle, type DoodleName } from "@/components/doodles/doodle";
import { BracketLabel } from "@/components/ui/bracket-label";
import { t } from "@/lib/i18n";
import type { TeamMember } from "@/lib/validation/studio";

const FACES: DoodleName[] = ["face-cap", "face-glasses", "face-curly"];
const TILTS = ["-4deg", "3deg", "-2deg"];

// The team as stickers taped to the page at different angles. Only roles
// are shown (the user's decision, 07.10.2026), with drawn faces.
export function Team({ team }: { team: TeamMember[] }) {
  if (team.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-24 md:px-8">
      <BracketLabel className="text-ink-2">{t("home.teamLabel")}</BracketLabel>
      <h2 className="mt-4 font-display text-display-sm">
        {t("home.teamTitle")}
      </h2>
      <ul className="mt-16 flex flex-wrap justify-center gap-x-10 gap-y-14">
        {team.map((member, index) => (
          <li
            key={`${member.role}-${index}`}
            className="relative w-56 rotate-[var(--tilt)] transition-[rotate,translate] duration-300 ease-[var(--ease-bounce)] hover:-translate-y-2 hover:rotate-0"
            style={{ "--tilt": TILTS[index % TILTS.length] } as CSSProperties}
          >
            <span
              aria-hidden
              className="absolute -top-3 left-1/2 z-10 h-6 w-24 -translate-x-1/2 -rotate-3 bg-accent/20"
            />
            <div className="rounded-md bg-surface p-4 pb-6 shadow-md">
              <div className="grid aspect-square place-items-center rounded-sm bg-paper">
                <Doodle
                  name={FACES[index % FACES.length]!}
                  draw="view"
                  className="size-3/5 text-ink"
                />
              </div>
              <p className="mt-4 text-center font-display text-h4">
                {member.role}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
