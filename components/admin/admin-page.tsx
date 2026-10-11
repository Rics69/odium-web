import type { ReactNode } from "react";

/** A section of the admin: its title, then the work. */
export function AdminPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-h2">{title}</h1>
      {children}
    </div>
  );
}
