// Module 4 tests — run: npm test   (this file + every earlier module's tests in tests/)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseOrThrow as P, freeVars, binderNames, isClosed, sorted, occurrences, pathToString,
  alphaEquivalent, renameBinder, canonicalize, equalSyntax, print, mulberry32, randomTerm,
  type Term,
} from "./src/index.ts";

const fv = (s: string) => sorted(freeVars(P(s)));

test("free variables follow the three equations", () => {
  assert.deepEqual(fv("x"), ["x"]);
  assert.deepEqual(fv("λx. x"), []);
  assert.deepEqual(fv("λx. y"), ["y"]);
  assert.deepEqual(fv("λx. x y"), ["y"]);
  assert.deepEqual(fv("(λx. x) x"), ["x"]);               // same name, one bound use, one free use
  assert.deepEqual(fv("λx. λy. x y z"), ["z"]);
});

test("closed terms (combinators)", () => {
  for (const s of ["λx. x", "λx y. x", "λx y z. x z (y z)", "(λx. x x) λx. x x"]) assert.ok(isClosed(P(s)), s);
  assert.equal(isClosed(P("λx. y")), false);
});

test("binder names", () => {
  assert.deepEqual(sorted(binderNames(P("λx. (λy. x) λx. z"))), ["x", "y"]);
});

test("occurrences: each use points at its nearest enclosing binder", () => {
  const occ = occurrences(P("λx. λx. x"));
  assert.equal(occ.length, 1);
  assert.equal(pathToString(occ[0].binder!), "body");       // the INNER λ (shadowing)
  const occ2 = occurrences(P("(λx. x) x"));
  assert.deepEqual(occ2.map(o => [pathToString(o.path), o.binder && pathToString(o.binder)]), [["fn.body", "fn"], ["arg", null]]);
});

test("α-equivalence: bound names don't matter, free names do", () => {
  const yes: [string, string][] = [
    ["λx. x", "λy. y"],
    ["λx y. x", "λa b. a"],
    ["λx. λy. x y", "λy. λx. y x"],
    ["λx. λx. x", "λa. λb. b"],
    ["λx. y", "λz. y"],
  ];
  const no: [string, string][] = [
    ["λx. y", "λx. z"],                 // different free variables
    ["λx y. x", "λx y. y"],             // K vs K*: returns first vs second argument
    ["λx. λx. x", "λa. λb. a"],         // inner vs outer binder
    ["λx. y", "λy. y"],                 // free y vs bound y
    ["x", "y"],
  ];
  for (const [a, b] of yes) assert.ok(alphaEquivalent(P(a), P(b)), `${a} ≡ ${b}`);
  for (const [a, b] of no) assert.ok(!alphaEquivalent(P(a), P(b)), `${a} ≢ ${b}`);
});

test("renameBinder: allowed renames produce α-equivalent terms", () => {
  const r = renameBinder(P("λx. λz. x z"), "y");
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(print(r.term), "λy. λz. y z");
    assert.ok(alphaEquivalent(r.term, P("λx. λz. x z")));
  }
});

test("renameBinder refuses both kinds of capture", () => {
  const c1 = renameBinder(P("λx. x y"), "y");                 // outside y would be captured
  assert.ok(!c1.ok && /free in the body/.test(c1.reason));
  const c2 = renameBinder(P("λx. λy. x"), "y");               // x would be captured by inner λy
  assert.ok(!c2.ok && /captured by that inner λy/.test(c2.reason));
  const c3 = renameBinder(P("λx. λy. y"), "y");               // no free x under λy: allowed
  assert.ok(c3.ok);
  const c4 = renameBinder(P("λx. λy. λx. x"), "y");           // inner x is shadowed: not ours, allowed
  assert.ok(c4.ok);
});

test("canonicalize gives Barendregt's variable convention", () => {
  assert.equal(print(canonicalize(P("λx. λx. x"))), "λv0. λv1. v1");
  assert.equal(print(canonicalize(P("(λx. x) λx. x"))), "(λv0. v0) λv1. v1");
  assert.equal(print(canonicalize(P("λx. v0"))), "λv1. v0");     // skips the free v0
});

// Two independent algorithms must agree: the scope-distance walk and the canonical-form compare.
test("CROSS-CHECK: alphaEquivalent(a,b) ⇔ canonical forms identical (3000 random pairs)", () => {
  const rand = mulberry32(4);
  let equivalentPairs = 0;
  for (let i = 0; i < 3000; i++) {
    const a = randomTerm(rand, { maxDepth: 5, names: ["x", "y"] });
    const b = randomTerm(rand, { maxDepth: 5, names: ["x", "y"] });
    const viaWalk = alphaEquivalent(a, b);
    const viaCanon = equalSyntax(canonicalize(a), canonicalize(b));
    assert.equal(viaWalk, viaCanon, `${print(a)}  vs  ${print(b)}`);
    if (viaWalk) equivalentPairs++;
  }
  assert.ok(equivalentPairs > 50, `too few equivalent pairs (${equivalentPairs}) to be a meaningful test`);
});

test("α-equivalence is an equivalence relation, and preserves free variables (1000 terms)", () => {
  const rand = mulberry32(8);
  const pool: Term[] = [];
  for (let i = 0; i < 1000; i++) pool.push(randomTerm(rand, { maxDepth: 6, names: ["x", "y", "z"] }));
  for (let i = 0; i < pool.length; i++) {
    const t = pool[i], c = canonicalize(t);
    assert.ok(alphaEquivalent(t, t));                              // reflexive
    assert.ok(alphaEquivalent(t, c) && alphaEquivalent(c, t));     // symmetric (on a known-equivalent pair)
    assert.deepEqual(sorted(freeVars(c)), sorted(freeVars(t)));    // renaming binders never changes FV
  }
});

test("every successful renameBinder on random terms is α-equivalent to the original", () => {
  const rand = mulberry32(21);
  let ok = 0, refused = 0;
  for (let i = 0; i < 3000; i++) {
    const t = randomTerm(rand, { maxDepth: 6, names: ["x", "y", "z"] });
    if (t.kind !== "lam") continue;
    for (const n of ["x", "y", "z", "w"]) {
      const r = renameBinder(t, n);
      if (r.ok) { ok++; assert.ok(alphaEquivalent(r.term, t), `${print(t)} → ${print(r.term)}`); }
      else refused++;
    }
  }
  assert.ok(ok > 500 && refused > 50, `ok=${ok} refused=${refused}`);
});

test("a refused rename really would have changed the meaning", () => {
  // Do the rename naively (textual replace of the binder and its free x's) and show it is NOT α-equivalent.
  const naive = (t: Term, y: string): Term => {
    if (t.kind !== "lam") throw new Error();
    const x = t.param;
    const sub = (u: Term): Term =>
      u.kind === "var" ? (u.name === x ? { kind: "var", name: y } : u)
      : u.kind === "lam" ? (u.param === x ? u : { kind: "lam", param: u.param, body: sub(u.body) })
      : { kind: "app", fn: sub(u.fn), arg: sub(u.arg) };
    return { kind: "lam", param: y, body: sub(t.body) };
  };
  const rand = mulberry32(33);
  let checked = 0;
  for (let i = 0; i < 3000; i++) {
    const t = randomTerm(rand, { maxDepth: 6, names: ["x", "y", "z"] });
    if (t.kind !== "lam") continue;
    for (const n of ["x", "y", "z"]) {
      if (!renameBinder(t, n).ok) {
        checked++;
        assert.ok(!alphaEquivalent(naive(t, n), t), `naive rename of ${print(t)} to ${n} was harmless?`);
      }
    }
  }
  assert.ok(checked > 50);
});
