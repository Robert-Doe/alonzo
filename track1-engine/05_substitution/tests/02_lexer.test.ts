// Carried over from Module 2 (regression): these must keep passing in every later module.
import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenize, formatError, print, counts, mulberry32, randomTerm, S, type TokenKind } from "../src/index.ts";

const kinds = (src: string): TokenKind[] => tokenize(src).tokens.map(t => t.kind);
const texts = (src: string): string[] => tokenize(src).tokens.map(t => t.text);

test("the five token kinds plus eof", () => {
  assert.deepEqual(kinds("λx. (x y)"), ["lambda", "ident", "dot", "lparen", "ident", "ident", "rparen", "eof"]);
});

test("both lambda spellings produce the same kind; text keeps the original", () => {
  assert.deepEqual(kinds("\\x. x"), kinds("λx. x"));
  assert.equal(tokenize("\\x. x").tokens[0].text, "\\");
  assert.equal(tokenize("λx. x").tokens[0].text, "λ");
});

test("whitespace is irrelevant between tokens", () => {
  assert.deepEqual(texts("λx.x y"), texts("  λ x .\n\tx   y  "));
});

test("maximal munch: xy is one identifier, not two", () => {
  assert.deepEqual(texts("λxy.x"), ["λ", "xy", ".", "x", ""]);
  assert.deepEqual(texts("λx y.x"), ["λ", "x", "y", ".", "x", ""]);
});

test("identifiers: digits, underscores, primes after the first character", () => {
  assert.deepEqual(texts("f' acc_2 _t x1"), ["f'", "acc_2", "_t", "x1", ""]);
});

test("positions are 1-based line:col, counting λ as one column", () => {
  const toks = tokenize("λx.\n  x y").tokens;
  const at = toks.map(t => `${t.start.line}:${t.start.col}`);
  assert.deepEqual(at, ["1:1", "1:2", "1:3", "2:3", "2:5", "2:6"]);
  // offsets index the string; λ is one UTF-16 unit, so x is at offset 1
  assert.equal(toks[1].start.offset, 1);
});

test("columns count code points, not UTF-16 units", () => {
  // "😀" is 2 UTF-16 units but 1 code point: the error spans exactly one column
  const r = tokenize("😀 x");
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].start.col, 1);
  assert.equal(r.errors[0].end.col, 2);
  assert.equal(r.tokens[0].start.col, 3); // x
});

test("comments run from -- to end of line", () => {
  assert.deepEqual(texts("x -- this is ignored λ ( .\ny"), ["x", "y", ""]);
});

test("eof is always last, even for empty input", () => {
  assert.deepEqual(kinds(""), ["eof"]);
  assert.deepEqual(kinds("   -- only a comment"), ["eof"]);
});

test("bad characters: located error, skipped, lexing continues", () => {
  const r = tokenize("λx. x + y $");
  assert.deepEqual(r.tokens.map(t => t.text), ["λ", "x", ".", "x", "y", ""]);
  assert.equal(r.errors.length, 2);
  assert.match(r.errors[0].message, /unexpected character '\+'/);
  assert.equal(`${r.errors[0].start.line}:${r.errors[0].start.col}`, "1:7");
  assert.match(r.errors[1].message, /'\$'/);
});

test("numbers get a dedicated, explanatory error covering the whole literal", () => {
  const r = tokenize("f 42");
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0].message, /numeric literal '42'/);
  assert.equal(r.errors[0].end.col - r.errors[0].start.col, 2);
});

test("formatError draws the line and carets", () => {
  const src = "λx. x + y";
  const r = tokenize(src);
  assert.equal(formatError(src, r.errors[0]), "1:7: unexpected character '+' (U+002B)\n  λx. x + y\n        ^");
});

test("every printed term lexes cleanly: idents = variables + binders", () => {
  const rand = mulberry32(2024);
  for (let i = 0; i < 1000; i++) {
    const t = randomTerm(rand, { maxDepth: 7, names: ["x", "y", "z", "f'"] });
    for (const lambda of ["λ", "\\"] as const) {
      const r = tokenize(print(t, { lambda }));
      assert.equal(r.errors.length, 0);
      const c = counts(t);
      assert.equal(r.tokens.filter(k => k.kind === "ident").length, c.vars + c.lams);
      assert.equal(r.tokens.filter(k => k.kind === "lambda").length, c.lams);
    }
  }
});

test("tokens of S", () => {
  assert.equal(texts(print(S)).join(" "), "λ x . λ y . λ z . x z ( y z ) ");
});
