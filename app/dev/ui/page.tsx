import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Showcase } from "./showcase";

export const metadata: Metadata = {
  title: "Витрина компонентов",
  robots: { index: false, follow: false },
};

// Design system showcase for development only; production answers 404.
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <Showcase />;
}
