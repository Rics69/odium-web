import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/cn";

// Markdown written in the admin: game descriptions and the studio texts.
// Raw HTML is dropped, links open in a new tab.
export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("markdown", className)}>
      <ReactMarkdown
        skipHtml
        components={{
          a: ({ href, children: text }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:text-accent-deep"
            >
              {text}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
