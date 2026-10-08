import {
  sendChangeEmailVerification,
  sendEmailChangeNotice,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/lib/server/mail/letters";

const TO = "samples@odium.local";

// Development only: sends one of every letter to Mailpit, to look at them
// (the button on /dev/ui). Production answers 404.
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }
  const url = new URL(
    "/api/auth/verify-email?token=sample",
    process.env.SITE_URL,
  ).href;
  await sendVerificationEmail({ to: TO, nickname: "Pixel_Hunter", url });
  await sendPasswordResetEmail({ to: TO, nickname: "Pixel_Hunter", url });
  await sendChangeEmailVerification({ to: TO, nickname: "Pixel_Hunter", url });
  await sendEmailChangeNotice({
    to: TO,
    nickname: "Pixel_Hunter",
    newEmail: "pixel.new@example.com",
  });
  return Response.json({ sent: 4, to: TO });
}
