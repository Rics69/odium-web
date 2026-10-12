import type { Metadata } from "next";

// Sign-in, sign-up and the email and password links: nothing to find in
// search, though their links may be followed.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

// They share the frame of the public pages for now.
export { default } from "../(public)/layout";
