import { BracketLabel } from "@/components/ui/bracket-label";
import type { Social } from "@/lib/validation/studio";

// Social networks and stores as bracket labels: [ TELEGRAM ] [ VK ].
export function SocialLinks({
  socials,
  label,
}: {
  socials: Social[];
  label: string;
}) {
  return (
    <ul aria-label={label} className="flex flex-wrap gap-x-6">
      {socials.map((social) => (
        <li key={social.url}>
          <a
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex min-h-11 items-center text-ink-2 transition-colors hover:text-accent"
          >
            <BracketLabel>{social.label}</BracketLabel>
          </a>
        </li>
      ))}
    </ul>
  );
}
