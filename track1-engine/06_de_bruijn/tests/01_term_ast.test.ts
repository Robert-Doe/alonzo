// Carried over from Module 1 (regression): these must keep passing in every later module.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Var, Lam, App, apps, lams, size, depth, counts, equalSyntax, isIdent,
  print, printFull, show, renderTree, mulberry32, randomTerm,
  I, K, S, omega, Omega, parenCases,
} from "../src/index.ts";

test("every term is exactly one of three kinds", () => {
  const rand = mulberry32(1);
  for (let i = 0; i < 500; i++) {
    const t = randomTerm(rand, { maxDepth: 6, names: ["x", "y", "z"] });
    assert.ok(["var", "lam", "app"].includes(t.kind));
  }
});

test("constructors reject names the printer could not print unambiguously", () => {
  for (const bad of ["", "1x", "a b", "x.y", "λ", "(x)"]) {
    assert.throws(() => Var(bad), /invalid variable name/);
  }
  assert.throws(() => Lam("x y", Var("x")), /invalid parameter name/);
  for (const ok of ["x", "x1", "f'", "acc_2", "_", "Foo"]) assert.ok(isIdent(ok));
});

test("apps groups left, lams nests right", () => {
  const f = Var("f"), a = Var("a"), b = Var("b");
  assert.ok(equalSyntax(apps(f, a, b), App(App(f, a), b)));
  assert.ok(equalSyntax(lams(["x", "y"], Var("x")), Lam("x", Lam("y", Var("x")))));
  assert.equal(apps(f), f); // zero arguments: just the head
});

test("printer: classic combinators", () => {
  assert.equal(print(I), "λx. x");
  assert.equal(print(K), "λx. λy. x");
  assert.equal(print(S), "λx. λy. λz. x z (y z)");
  assert.equal(print(omega), "λx. x x");
  assert.equal(print(Omega), "(λx. x x) λx. x x");
  assert.equal(print(S, { lambda: "\\" }), "\\x. \\y. \\z. x z (y z)");
});

test("printer: every parenthesization rule", () => {
  const expected: Record<string, string> = {
    "app is left-assoc": "f a b",
    "right-nested app needs parens": "f (a b)",
    "λ body extends right": "λx. x y",
    "λ applied needs parens": "(λx. x) y",
    "trailing λ arg: no parens": "f λx. x",
    "λ arg followed by more": "f (λx. x) g",
    "λ arg inside right-nested app": "f (g λx. x)",
    "Ω": "(λx. x x) λx. x x",
  };
  for (const { name, term } of parenCases) assert.equal(print(term), expected[name], name);
});

test("printFull parenthesizes every compound node", () => {
  assert.equal(printFull(S), "(λx. (λy. (λz. ((x z) (y z)))))");
  assert.equal(printFull(apps(Var("f"), Var("a"), Var("b"))), "((f a) b)");
});

test("show prints constructor calls", () => {
  assert.equal(show(App(I, Var("y"))), 'App(Lam("x", Var("x")), Var("y"))');
});

test("size, depth, counts on S", () => {
  // S = λx.λy.λz. (x z) (y z): 3 lams + 3 apps + 4 vars = 10 nodes
  assert.equal(size(S), 10);
  assert.deepEqual(counts(S), { vars: 4, lams: 3, apps: 3 });
  assert.equal(depth(S), 6); // λ λ λ @ @ x
});

test("structural induction claim (P5.2): vars = apps + 1, on 2000 random terms", () => {
  const rand = mulberry32(42);
  for (let i = 0; i < 2000; i++) {
    const t = randomTerm(rand, { maxDepth: 8, names: ["x", "y"] });
    const c = counts(t);
    assert.equal(c.vars, c.apps + 1, print(t));
    assert.equal(size(t), c.vars + c.lams + c.apps);
  }
});

test("printFull text always has exactly one paren pair per compound node", () => {
  const rand = mulberry32(7);
  for (let i = 0; i < 500; i++) {
    const t = randomTerm(rand, { maxDepth: 7, names: ["x", "y", "z"] });
    const c = counts(t);
    const opens = [...printFull(t)].filter(ch => ch === "(").length;
    assert.equal(opens, c.lams + c.apps);
  }
});

test("print never uses more parens than printFull", () => {
  const rand = mulberry32(99);
  for (let i = 0; i < 500; i++) {
    const t = randomTerm(rand, { maxDepth: 7, names: ["x", "y", "z"] });
    const n = (s: string) => [...s].filter(ch => ch === "(").length;
    assert.ok(n(print(t)) <= n(printFull(t)));
  }
});

test("renderTree draws one line per node", () => {
  assert.equal(renderTree(App(I, Var("y"))), "@\n├── λx\n│   └── x\n└── y");
  assert.equal(renderTree(S).split("\n").length, size(S));
});

test("generator is deterministic", () => {
  const a = randomTerm(mulberry32(5), { maxDepth: 6, names: ["x", "y"] });
  const b = randomTerm(mulberry32(5), { maxDepth: 6, names: ["x", "y"] });
  assert.ok(equalSyntax(a, b));
});
