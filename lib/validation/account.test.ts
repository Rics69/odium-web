import { describe, expect, it } from "vitest";
import { emailSchema, nicknameSchema, signUpSchema } from "./account";

const nicknameError = (nickname: string) =>
  nicknameSchema.safeParse(nickname).error?.issues[0]?.message;

describe("nicknames", () => {
  it.each(["Pixel", "pixel_hunter", "Пиксель-2", "abc", "a".repeat(24)])(
    "accept %s",
    (nickname) => {
      expect(nicknameSchema.safeParse(nickname).success).toBe(true);
    },
  );

  it.each([
    ["ab", "Ник — от 3 символов."],
    ["a".repeat(25), "Ник — не длиннее 24 символов."],
    ["pixel hunter", "Только буквы, цифры, _ и -."],
    ["pixel!", "Только буквы, цифры, _ и -."],
    ["Pixеl", "Латиница или кириллица — что-то одно."],
  ])("refuse %s", (nickname, message) => {
    expect(nicknameError(nickname)).toBe(message);
  });

  it.each([
    "admin",
    "Admin_2",
    "ADMINISTRATOR",
    "moderator-1",
    "Odium",
    "odium_dev",
    "Одиум",
    "Модератор",
    "поддержка",
    "Удалённый",
  ])("keep %s for the studio", (nickname) => {
    expect(nicknameError(nickname)).toBe("Этот ник зарезервирован.");
  });

  it("do not keep innocent nicknames that only contain a reserved word", () => {
    expect(nicknameSchema.safeParse("badminton").success).toBe(true);
  });

  it("are trimmed", () => {
    expect(nicknameSchema.parse("  Pixel ")).toBe("Pixel");
  });
});

describe("emails", () => {
  it("are trimmed and lowercased", () => {
    expect(emailSchema.parse(" Pixel@Example.COM ")).toBe("pixel@example.com");
  });

  it("must look like an address", () => {
    expect(emailSchema.safeParse("pixel@").error?.issues[0]?.message).toBe(
      "Проверьте адрес почты.",
    );
  });
});

describe("sign-up", () => {
  it("wants a password of 8 characters at least", () => {
    const result = signUpSchema.safeParse({
      email: "pixel@example.com",
      nickname: "Pixel",
      password: "1234567",
    });
    expect(result.error?.issues[0]).toMatchObject({
      path: ["password"],
      message: "Пароль — от 8 символов.",
    });
  });
});
