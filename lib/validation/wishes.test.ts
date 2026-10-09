import { describe, expect, it } from "vitest";
import { wishInputSchema } from "./wishes";

const firstError = (value: object) =>
  wishInputSchema.safeParse({ type: "add", ...value }).error?.issues[0];

describe("a new wish", () => {
  it("is trimmed and gets an empty description by default", () => {
    expect(
      wishInputSchema.parse({ type: "remove", title: "  Убрать таймер  " }),
    ).toEqual({ type: "remove", title: "Убрать таймер", body: "" });
  });

  it.each([
    [{ title: "Да" }, "title", "Заголовок — от 5 символов."],
    [
      { title: "а".repeat(101) },
      "title",
      "Заголовок — не длиннее 100 символов.",
    ],
    [
      { title: "Норм", body: "б".repeat(2001) },
      "title",
      "Заголовок — от 5 символов.",
    ],
    [
      { title: "Нормальный заголовок", body: "б".repeat(2001) },
      "body",
      "Описание — не длиннее 2000 символов.",
    ],
  ])("refuses %j", (value, path, message) => {
    expect(firstError(value)).toMatchObject({ path: [path], message });
  });

  it("wants a type", () => {
    expect(
      wishInputSchema.safeParse({ title: "Больше уровней" }).error?.issues[0],
    ).toMatchObject({
      path: ["type"],
      message: "Выберите: добавить или убрать.",
    });
  });

  it("may shout a short title, not a long one", () => {
    expect(firstError({ title: "БОЛЬШЕ ЛУТ" })).toBeUndefined();
    expect(firstError({ title: "БОЛЬШЕ УРОВНЕЙ" })).toMatchObject({
      message: "Не пишите заголовок целиком заглавными — так читать тяжелее.",
    });
    expect(firstError({ title: "Больше УРОВНЕЙ" })).toBeUndefined();
  });

  it("has two links at most", () => {
    const two = "https://a.example и www.b.example";
    expect(firstError({ title: "Ссылки в тексте", body: two })).toBeUndefined();
    expect(
      firstError({ title: "Ссылки http://c.example", body: two }),
    ).toMatchObject({
      path: ["body"],
      message: "Не больше 2 ссылок в пожелании.",
    });
  });
});
