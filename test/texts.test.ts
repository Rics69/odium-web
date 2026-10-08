import { globSync, readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { ru } from "@/lib/i18n/ru";

// Code that players see. The /dev/ui showcase and tests may use any text.
const CODE = [
  "app/**/*.{ts,tsx}",
  "components/**/*.{ts,tsx}",
  "lib/**/*.{ts,tsx}",
];
const NOT_CODE = [
  "**/*.test.ts",
  "**/*.test.tsx",
  "app/dev/**",
  "lib/i18n/ru.ts",
  // Data, not interface text: nicknames nobody may take.
  "lib/validation/reserved-nicknames.ts",
];

type Literal = { file: string; line: number; text: string };

// String literals, template parts and JSX text: everything but comments.
function literals(file: string): Literal[] {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    kind,
  );
  const found: Literal[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteralLike(node) ||
      ts.isTemplateLiteralToken(node) ||
      ts.isJsxText(node)
    ) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart());
      found.push({ file, line: line + 1, text: node.text });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

// "nav.games" for every text, and one key per set of plural forms.
function dictionaryKeys(node: object, prefix = ""): string[] {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string" || "many" in value) return [path];
    return dictionaryKeys(value as object, path);
  });
}

const allLiterals = globSync(CODE, { exclude: NOT_CODE }).flatMap(literals);

describe("interface texts", () => {
  it("live in lib/i18n/ru.ts, not in code", () => {
    const russian = allLiterals
      .filter((literal) => /[А-Яа-яЁё]/.test(literal.text))
      .map(
        (literal) => `${literal.file}:${literal.line} ${literal.text.trim()}`,
      );
    expect(russian).toEqual([]);
  });

  it("are all used somewhere", () => {
    const used = new Set(allLiterals.map((literal) => literal.text));
    const unused = dictionaryKeys(ru).filter((key) => !used.has(key));
    expect(unused).toEqual([]);
  });
});
