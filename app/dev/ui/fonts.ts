import { Climate_Crisis, Dela_Gothic_One, Unbounded } from "next/font/google";

// Display font candidates for step 1.1. Only /dev/ui loads them.
export const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  preload: false,
});

export const delaGothic = Dela_Gothic_One({
  subsets: ["latin", "cyrillic"],
  weight: "400",
  preload: false,
});

// Its YEAR axis melts the letters: 1979 is solid, 2050 has melted away.
export const climateCrisis = Climate_Crisis({
  subsets: ["latin", "cyrillic"],
  axes: ["YEAR"],
  preload: false,
});
