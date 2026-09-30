// Carried over from Module 5 (regression): these must keep passing in every later module.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseOrThrow as P, subst, substNaive, freshName, freeVars, binderNames, alphaEquivalent, canonicalize,
  print, sorted, mulberry32, randomTerm, type Term, type SubstLog,
} from "../src/index.ts";

const S = (m: string, x: string, n: string) => print(subst(P(m), x, P(n)));

test("the five easy equations", () => {
  assert.equal(S("x", "x", "λz. z"), "λz. z");                  // x[x:=N] = N
  assert.equal(S("y", "x", "λz. z"), "y");                      // y[x:=N] = y
  assert.equal(S("x x", "x", "f"), "f f");                      // application: both sides
  assert.equal(S("λx. x", "x", "f"), "λx. x");                  // shadowed: untouched
  assert.equal(S("λy. x y", "x", "f"), "λy. f y");              // no capture possible
});

test("THE capture example: (λy. x)[x := y]", () => {
  assert.equal(print(substNaive(P("λy. x"), "x", P("y"))), "λy. y");    // wrong: now the identity
  assert.equal(S("λy. x", "x", "y"), "λy1. y");                          // right: a constant function returning y
});

test("renaming only happens when it must", () => {
  const log: SubstLog = { renames: [] };
  subst(P("λy. x y"), "x", P("z"), log);
  assert.deepEqual(log.renames, []);
  subst(P("λy. x y"), "x", P("y"), log);
  assert.deepEqual(log.renames, [{ from: "y", to: "y1" }]);
});

test("fresh names avoid free variables of both N and the body", () => {
  // naming y1 would capture the body's own free y1; the engine must skip to y2
  assert.equal(S("λy. x y1", "x", "y"), "λy2. y y1");
});

test("nested renames: the renaming itself can require renaming", () => {
  const log: SubstLog = { renames: [] };
  const out = subst(P("λy. λy1. x y y1"), "x", P("y y1"), log);
  assert.ok(alphaEquivalent(out, P("λa. λb. (y y1) a b")), print(out));
  assert.ok(log.renames.length >= 2, JSON.stringify(log.renames));
});

test("unchanged subtrees are shared, not copied", () => {
  const m = P("(λz. z) x");
  const out = subst(m, "x", P("q"));
  assert.ok(out.kind === "app" && m.kind === "app" && out.fn === m.fn);
  assert.equal(subst(m, "nope", P("q")), m);
});

test("freshName", () => {
  assert.equal(freshName("x", new Set()), "x");
  assert.equal(freshName("x", new Set(["x"])), "x1");
  assert.equal(freshName("x", new Set(["x", "x1", "x2"])), "x3");
  assert.equal(freshName("x7", new Set(["x7"])), "x1");
  assert.equal(freshName("f'", new Set(["f'"])), "f'1");
});

// ── properties on random terms ─────────────────────────────────────────────────
const gen = (seed: number) => {
  const rand = mulberry32(seed);
  return () => randomTerm(rand, { maxDepth: 6, names: ["x", "y", "z"] });
};

test("FV law: FV(M[x:=N]) = (FV(M) − {x}) ∪ (FV(N) if x ∈ FV(M)), on 3000 random triples", () => {
  const g = gen(5);
  for (let i = 0; i < 3000; i++) {
    const m = g(), n = g();
    const expected = new Set([...freeVars(m)].filter(v => v !== "x"));
    if (freeVars(m).has("x")) for (const v of freeVars(n)) expected.add(v);
    assert.deepEqual(sorted(freeVars(subst(m, "x", n))), sorted(expected), `${print(m)} [x := ${print(n)}]`);
  }
});

test("naive substitution goes wrong ONLY when a binder of M is free in N (capture is the sole cause)", () => {
  const g = gen(6);
  let captures = 0, fvDetects = 0;
  for (let i = 0; i < 3000; i++) {
    const m = g(), n = g();
    const right = subst(m, "x", n), wrong = substNaive(m, "x", n);
    if (!alphaEquivalent(right, wrong)) {
      captures++;
      assert.ok([...binderNames(m)].some(b => freeVars(n).has(b)), `${print(m)} [x := ${print(n)}]`);
      if (sorted(freeVars(right)).join() !== sorted(freeVars(wrong)).join()) fvDetects++;
    }
  }
  assert.ok(captures > 100, `only ${captures} captures`);
  // Checking free variables alone does NOT catch every capture: a captured name may also occur free elsewhere.
  assert.ok(fvDetects < captures, `fv check caught ${fvDetects}/${captures}`);
});

test("when no binder of M is free in N, naive and correct agree", () => {
  const g = gen(7);
  let checked = 0;
  for (let i = 0; i < 3000; i++) {
    const m = g(), n = g();
    const clash = [...binderNames(m)].some(b => freeVars(n).has(b));
    if (!clash) { checked++; assert.ok(alphaEquivalent(subst(m, "x", n), substNaive(m, "x", n))); }
  }
  assert.ok(checked > 300);
});

test("substitution respects α: M ≡α M' ⇒ M[x:=N] ≡α M'[x:=N]", () => {
  const g = gen(9);
  for (let i = 0; i < 2000; i++) {
    const m = g(), n = g();
    assert.ok(alphaEquivalent(subst(m, "x", n), subst(canonicalize(m), "x", n)), print(m));
  }
});

test("SUBSTITUTION LEMMA: M[x:=N][y:=L] ≡α M[y:=L][x:=N[y:=L]]  (x ≠ y, x ∉ FV(L)), 3000 cases", () => {
  const g = gen(10);
  let tested = 0;
  for (let i = 0; i < 3000; i++) {
    const m = g(), n = g(), l: Term = g();
    if (freeVars(l).has("x")) continue;
    tested++;
    const lhs = subst(subst(m, "x", n), "y", l);
    const rhs = subst(subst(m, "y", l), "x", subst(n, "y", l));
    assert.ok(alphaEquivalent(lhs, rhs), `M=${print(m)} N=${print(n)} L=${print(l)}`);
  }
  assert.ok(tested > 1000);
});
