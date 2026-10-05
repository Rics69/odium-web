import { Inter, Unbounded } from "next/font/google";

// Text font from the design-guide skill, with Cyrillic.
export const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

// Display font for the logo and big headings. Unbounded until the choice in step 1.1.
export const displayFace = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display-face",
});
