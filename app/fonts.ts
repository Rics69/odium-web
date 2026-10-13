import { Inter, Unbounded } from "next/font/google";

// Text font from the design-guide skill, with Cyrillic.
export const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

// Display font for the logo and big headings, chosen in step 1.1. Only the
// regular weight is used: one weight is 32 KB instead of 81 KB for all.
export const displayFace = Unbounded({
  weight: "400",
  subsets: ["latin", "cyrillic"],
  variable: "--font-display-face",
});
