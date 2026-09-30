// Module 6 tests — run: npm test   (this file + every earlier module's tests in tests/)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseOrThrow as P, toDeBruijn, fromDeBruijn, printDB, parseDB, equalDB, shift, substDB, substTop,
  substTopNoShift, defaultContext, DVar, DLam, DApp, alphaEquivalent, canonicalize, equalSyntax, subst,
  print, freeVars, mulberry32, randomTerm, type Term, type DTerm,
} from "./src/index.ts";

const DB = (s: string) => printDB(toDeBruijn(P(s)));

test("classic conversions", () => {
  assert.equal(DB("λx. x"), "λ. 0");
  assert.equal(DB("λx. λy. x"), "λ. λ. 1");
  assert.equal(DB("λx. λy. y"), "λ. λ. 0");
  assert.equal(DB("λx y z. x z (y z)"), "λ. λ. λ. 2 0 (1 0)");
  assert.equal(DB("(λx. x x) (λx. x x)"), "(λ. 0 0) λ. 0 0");
});

test("the same variable can get different indices; the same index can mean different variables", () => {
  assert.equal(DB("λx. λy. x (λz. z x)"), "λ. λ. 1 λ. 0 2");   // x is 1, then 2
  assert.equal(DB("(λx. x) y"), "(λ. 0) 0");                   // 0 is x, then the free y
});

test("free variables are numbered past the binders via the naming context", () => {
  assert.deepEqual(defaultContext(P("λx. x b a")), ["a", "b"]);
  assert.equal(DB("λx. x b a"), "λ. 0 2 1");                    // a=0, b=1 in Γ; +1 under one λ
  assert.equal(printDB(toDeBruijn(P("λx. x b a"), ["b", "a"])), "λ. 0 1 2");
  assert.throws(() => toDeBruijn(P("y"), []), /not in the naming context/);
});

test("α-equivalent terms become IDENTICAL nameless terms", () => {
  assert.ok(equalDB(toDeBruijn(P("λx. λy. x y")), toDeBruijn(P("λa. λb. a b"))));
  assert.ok(!equalDB(toDeBruijn(P("λx. λx. x")), toDeBruijn(P("λa. λb. a"))));
});

test("THIRD α-test agrees with Module 4's two (3000 random pairs, shared context)", () => {
  const rand = mulberry32(4);
  for (let i = 0; i < 3000; i++) {
    const a = randomTerm(rand, { maxDepth: 5, names: ["x", "y"] }), b = randomTerm(rand, { maxDepth: 5, names: ["x", "y"] });
    const ctx = ["x", "y"];
    const viaDB = equalDB(toDeBruijn(a, ctx), toDeBruijn(b, ctx));
    assert.equal(viaDB, alphaEquivalent(a, b), `${print(a)} vs ${print(b)}`);
    assert.equal(viaDB, equalSyntax(canonicalize(a), canonicalize(b)));
  }
});

test("round trip: fromDeBruijn(toDeBruijn(t)) ≡α t (3000 random terms)", () => {
  const rand = mulberry32(12);
  for (let i = 0; i < 3000; i++) {
    const t = randomTerm(rand, { maxDepth: 7, names: ["x", "y", "z"] });
    const ctx = defaultContext(t);
    const back = fromDeBruijn(toDeBruijn(t, ctx), ctx);
    assert.ok(alphaEquivalent(back, t), `${print(t)} → ${print(back)}`);
  }
});

test("fromDeBruijn freshens hint names so nothing is captured", () => {
  // λ. λ. 1 with both hints "x": must not print as λx. λx. x (which would mean λ. λ. 0)
  const d = DLam(DLam(DVar(1), "x"), "x");
  const t = fromDeBruijn(d);
  assert.equal(print(t), "λx. λx1. x");
  assert.ok(equalDB(toDeBruijn(t), d));
});

test("printDB / parseDB round trip, including ASCII backslash and optional hints", () => {
  for (const s of ["λ. 0", "λ. λ. 1 λ. 0 2", "(λ. 0 0) λ. 0 0", "λ. λ. λ. 2 0 (1 0)"]) assert.equal(printDB(parseDB(s)), s);
  assert.equal(printDB(parseDB("\\. \\. 1 (\\. 0 2)")), "λ. λ. 1 λ. 0 2");
  assert.equal(printDB(parseDB("λx. λy. 1")), "λ. λ. 1");
  assert.equal(printDB(parseDB("λx. λy. 1"), { hints: true }), "λx. λy. 1");
  assert.throws(() => parseDB("λ 0"), /expected '\.'/);
});

test("shift moves only indices at or above the cutoff", () => {
  // λ. 0 1  (0 is bound inside, 1 is free): shifting by 2 moves only the free one
  assert.equal(printDB(shift(2, 0, parseDB("λ. 0 1"))), "λ. 0 3");
  assert.equal(printDB(shift(1, 0, parseDB("0 1"))), "1 2");
  assert.equal(printDB(shift(-1, 1, parseDB("0 1 2"))), "0 0 1");
});

test("substDB shifts the replacement under each binder", () => {
  // (λ. 1)[0 := 5] : under the λ, target 0 becomes 1 and the replacement 5 becomes 6
  assert.equal(printDB(substDB(0, DVar(5), parseDB("λ. 1"))), "λ. 6");
});

// The big cross-check: de Bruijn substitution computes the same thing as Module 5's named subst.
test("CROSS-CHECK vs Module 5: body[x := N] via substTop ≡ via named subst (3000 random pairs)", () => {
  const rand = mulberry32(13);
  const g = () => randomTerm(rand, { maxDepth: 6, names: ["x", "y", "z"] });
  for (let i = 0; i < 3000; i++) {
    const body = g(), n = g();
    // One context naming every free variable on either side. (N may itself mention a free x;
    // inside λx. body, the context's x is shadowed, exactly as in the named term.)
    const ctx = [...new Set([...freeVars(body), ...freeVars(n)])].sort();
    const named = subst(body, "x", n);
    // body lives under the (removed) binder x, so convert it with x as the innermost name.
    const bodyDB = toDeBruijn(P(`λx. ${print(body)}`), ctx);
    if (bodyDB.kind !== "lam") throw new Error("expected a λ");
    const viaDB: DTerm = substTop(bodyDB.body, toDeBruijn(n, ctx));
    assert.ok(equalDB(viaDB, toDeBruijn(named, ctx)), `${print(body)} [x := ${print(n)}]`);
  }
});

test("forgetting to shift is the de Bruijn version of capture", () => {
  // body: λ. 1  (under x: "λy. x")     argument: free variable at index 0 (say, y)
  const body = parseDB("λ. 1"), arg = DVar(0);
  assert.equal(printDB(substTop(body, arg)), "λ. 1");       // correct: still points OUTSIDE (the free y)
  assert.equal(printDB(substTopNoShift(body, arg)), "λ. 0"); // bug: now points at its own λ: the identity
  // …which is exactly (λy. x)[x := y] from Module 5.
  const named: Term = subst(P("λy. x"), "x", P("y"));
  assert.equal(print(named), "λy1. y");
});
