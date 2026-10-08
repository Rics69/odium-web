import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { findLetter } from "@/test/mailpit";
import {
  sendChangeEmailVerification,
  sendEmailChangeNotice,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "./letters";

const address = () => `${randomUUID()}@example.com`;
const url = "http://localhost:3100/api/auth/verify-email?token=abc123";

describe("letters", () => {
  it("confirm an email with a button and the link spelled out", async () => {
    const to = address();
    await sendVerificationEmail({ to, nickname: "Pixel", url });

    const letter = await findLetter(to);
    expect(letter.Subject).toBe("Подтвердите почту для Odium");
    expect(letter.From).toEqual({
      Name: "Odium",
      Address: "no-reply@odium.local",
    });
    expect(letter.HTML).toContain('lang="ru"');
    expect(letter.HTML).toContain("Привет, Pixel!");
    expect(letter.HTML).toContain(`href="${url.replace("&", "&amp;")}"`);
    expect(letter.HTML).toContain("Подтвердить почту");
    // The plain-text twin, for clients without HTML and for spam filters.
    expect(letter.Text).toContain("Привет, Pixel!");
    expect(letter.Text).toContain(url);
    expect(letter.Text).toContain("24 часа");
  });

  it("reset a password", async () => {
    const to = address();
    await sendPasswordResetEmail({ to, nickname: "Pixel", url });

    const letter = await findLetter(to);
    expect(letter.Subject).toBe("Новый пароль для Odium");
    expect(letter.Text).toContain("Задать новый пароль");
    expect(letter.Text).toContain(url);
    expect(letter.Text).toContain("действует час");
  });

  it("confirm a new address", async () => {
    const to = address();
    await sendChangeEmailVerification({ to, nickname: "Pixel", url });

    const letter = await findLetter(to);
    expect(letter.Subject).toBe("Подтвердите новую почту для Odium");
    expect(letter.Text).toContain("заменит старый");
    expect(letter.Text).toContain(url);
  });

  it("warn the old address about the change", async () => {
    const to = address();
    await sendEmailChangeNotice({
      to,
      nickname: "Pixel",
      newEmail: "new@example.com",
    });

    const letter = await findLetter(to);
    expect(letter.Subject).toBe("Почта вашего аккаунта Odium меняется");
    expect(letter.Text).toContain("new@example.com");
    expect(letter.HTML).toContain(
      'href="http://localhost:3100/forgot-password"',
    );
  });

  it("show a nickname as text, never as markup", async () => {
    const to = address();
    await sendVerificationEmail({
      to,
      nickname: '<img src="x" onerror="alert(1)">',
      url,
    });

    const letter = await findLetter(to);
    expect(letter.HTML).not.toContain("<img");
    expect(letter.HTML).toContain("&lt;img");
  });
});
