"use client";

import dynamic from "next/dynamic";

// The wish form carries the validation rules (Zod, the largest library on
// the site). It is only rendered for a signed-in player, so it loads after
// the page, and guests, most of the visitors, never download it.
export const NewWishDialog = dynamic(
  () => import("./wish-form-dialog").then((module) => module.NewWishDialog),
  { ssr: false },
);

export const WishFormDialog = dynamic(
  () => import("./wish-form-dialog").then((module) => module.WishFormDialog),
  { ssr: false },
);
