// Carried over from Module 3 (regression): these must keep passing in every later module.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parse, parseOrThrow, analyzeParens, print, printFull, show, equalSyntax,
  Var, Lam, App, apps, lams, mulberry32, randomTerm, I, K, S, Omega,
} from "../src/index.ts";

const same = (src: string, expected: ReturnType<typeof Var>) => {
  const t = parseOrThrow(src);
  assert.ok(equalSyntax(t, expected), `${src} parsed as ${show(t)}`);
};
const x = Var("x"), y = Var("y"), f = Var("f"), g = Var("g");

test("the three shapes", () => {
  same("x", x);
  same("λx. x", I);
  same("f x", App(f, x));
});

test("convention 1: application is left-associative", () => {
  same("f x y", App(App(f, x), y));
  same("f (x y)", App(f, App(x, y)));
});

test("convention 2: a λ body extends as far right as possible", () => {
  same("λx. x y", Lam("x", App(x, y)));
  same("(λx. x) y", App(I, y));
  same("f λx. x g", App(f, Lam("x", App(x, g))));
});

test("multi-binder shorthand: λx y z. M = λx. λy. λz. M", () => {
  same("λx y z. x z (y z)", S);
  same("λx y. x", K);
  same("\\x y. x", K);
});

test("whitespace, comments and redundant parens don't matter", () => {
  same("((λx.(x)))", I);
  same("  λx.\n   x  -- identity\n", I);
  same("(((f))) (((x)))", App(f, x));
});

test("classic terms parse to the Module 1 constructors", () => {
  same("(λx. x x) (λx. x x)", Omega);
  same("(λx. x x) λx. x x", Omega);
});

test("syntax errors: located, with a helpful message", () => {
  const cases: [string, string, RegExp][] = [
    ["", "1:1", /expected a term, found end of input/],
    ["λ. x", "1:2", /expected a parameter name after 'λ', found '.'/],
    ["λx x", "1:5", /expected '\.' after the parameters of 'λx x', found end of input/],
    ["(λx. x", "1:7", /expected '\)' to close the '\(' at 1:1, found end of input/],
    ["f )", "1:3", /unexpected '\)' after a complete term/],
    ["λx.", "1:4", /expected a term, found end of input/],
    ["( )", "1:3", /expected a term, found '\)'/],
  ];
  for (const [src, where, msg] of cases) {
    const r = parse(src);
    assert.equal(r.term, null, src);
    assert.equal(r.errors.length, 1, src);
    assert.equal(`${r.errors[0].start.line}:${r.errors[0].start.col}`, where, `${src}: ${r.errors[0].message}`);
    assert.match(r.errors[0].message, msg, src);
  }
});

test("lexical errors are passed through, not re-reported", () => {
  const r = parse("λx. x + y $");
  assert.equal(r.term, null);
  assert.equal(r.errors.length, 2);
});

test("parseOrThrow throws a located message", () => {
  assert.throws(() => parseOrThrow("(x"), /parse error at 1:3: expected '\)' to close the '\(' at 1:1/);
});

test("ROUND TRIP: parse(print(t)) = t on 5000 random terms, both λ spellings", () => {
  const rand = mulberry32(3);
  for (let i = 0; i < 5000; i++) {
    const t = randomTerm(rand, { maxDepth: 8, names: ["x", "y", "z", "f'"] });
    for (const lambda of ["λ", "\\"] as const) {
      const back = parseOrThrow(print(t, { lambda }));
      assert.ok(equalSyntax(back, t), `${print(t)} came back as ${print(back)}`);
    }
    assert.ok(equalSyntax(parseOrThrow(printFull(t)), t));
  }
});

test("MINIMALITY: every paren pair print() emits is necessary (2000 random terms)", () => {
  const rand = mulberry32(11);
  let pairs = 0;
  for (let i = 0; i < 2000; i++) {
    const t = randomTerm(rand, { maxDepth: 7, names: ["x", "y", "z"] });
    for (const p of analyzeParens(print(t))!) {
      pairs++;
      assert.ok(p.necessary, `redundant pair in ${print(t)}: removing gives ${p.without}`);
    }
  }
  assert.ok(pairs > 1000, `only ${pairs} pairs checked`);
});

test("analyzeParens finds redundant pairs in hand-written text", () => {
  const r = analyzeParens("((λx. x) (y z)) (λw. w)")!;
  assert.deepEqual(r.map(p => p.necessary), [false, true, true, false]);
  assert.equal(print(parseOrThrow("((λx. x) (y z)) (λw. w)")), "(λx. x) (y z) λw. w");
});

test("trace records the recursive descent", () => {
  const r = parse("(λx. x) y", { trace: true });
  assert.deepEqual(r.trace.map(l => l.trim().split(" ")[0]), ["term", "atom", "term", "lambda", "term", "atom", "atom"]);
});

test("helpers agree with the parser", () => {
  assert.ok(equalSyntax(parseOrThrow("f a b c"), apps(f, Var("a"), Var("b"), Var("c"))));
  assert.ok(equalSyntax(parseOrThrow("λa b c. a"), lams(["a", "b", "c"], Var("a"))));
});
