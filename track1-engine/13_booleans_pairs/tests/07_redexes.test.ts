// Carried over from Module 7 (regression): these must keep passing in every later module.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseOrThrow as P, findRedexes, isBetaRedex, isEtaRedex, subtermAt, leftmostOutermost, leftmostInnermost,
  headRedex, weakHeadRedex, classifyRedexes, isBetaNormal, isPrefix, printWithSpans, spanOf, markAt,
  pathToString, print, equalSyntax, alphaEquivalent, mulberry32, randomTerm,
} from "../src/index.ts";

const paths = (s: string, kinds: ("beta" | "eta")[] = ["beta"]) => findRedexes(P(s), kinds).map(r => pathToString(r.path));

test("β-redex and η-redex shapes", () => {
  assert.ok(isBetaRedex(P("(λx. x) y")));
  assert.ok(!isBetaRedex(P("f y")) && !isBetaRedex(P("λx. x")));
  assert.ok(isEtaRedex(P("λx. f x")));
  assert.ok(!isEtaRedex(P("λx. x x")));          // x is free in the function part: not η
  assert.ok(!isEtaRedex(P("λx. f y")));          // doesn't forward its own argument
});

test("every redex is found, in pre-order (reading order, outer before inner)", () => {
  assert.deepEqual(paths("(λx. x x) ((λy. y) z)"), ["ε", "arg"]);
  assert.deepEqual(paths("x ((λa. a) b) ((λc. c) d)"), ["fn.arg", "arg"]);
  assert.deepEqual(paths("λx. f x", ["beta", "eta"]), ["ε"]);
  assert.deepEqual(paths("λx y. x"), []);
});

test("normal form = no β-redex", () => {
  for (const s of ["x", "λx. x", "λx y z. x z (y z)", "x (λy. y)"]) assert.ok(isBetaNormal(P(s)), s);
  for (const s of ["(λx. x) y", "λz. (λx. x) z", "(λx. x x) λx. x x"]) assert.ok(!isBetaNormal(P(s)), s);
});

test("leftmost-outermost vs leftmost-innermost", () => {
  const t = P("(λx. y) ((λx. x x) (λx. x x))");
  assert.equal(pathToString(leftmostOutermost(t)!.path), "ε");
  assert.equal(pathToString(leftmostInnermost(t)!.path), "arg");     // Ω itself: contains no other redex
  const u = P("((λa. a) b) ((λc. c) d)");
  assert.equal(pathToString(leftmostInnermost(u)!.path), "fn");
});

test("head and weak-head redexes", () => {
  assert.equal(pathToString(headRedex(P("λx. (λy. y) x z"))!.path), "body.fn");
  assert.equal(weakHeadRedex(P("λx. (λy. y) x z")), null);            // starts with λ: no weak-head redex
  assert.equal(pathToString(weakHeadRedex(P("(λy. y) a b"))!.path), "fn");
  assert.equal(headRedex(P("x ((λa. a) b)")), null);                  // head is a variable: head normal form
});

test("the head redex, when it exists, is always the leftmost-outermost redex", () => {
  const rand = mulberry32(70);
  for (let i = 0; i < 3000; i++) {
    const t = randomTerm(rand, { maxDepth: 7, names: ["x", "y", "z"] });
    const h = headRedex(t), lo = leftmostOutermost(t);
    if (h) assert.equal(pathToString(h.path), pathToString(lo!.path), print(t));
  }
});

test("classification flags", () => {
  const cs = classifyRedexes(P("(λx. x x) ((λy. y) z)"));
  assert.deepEqual(cs.map(c => [pathToString(c.path), c.leftmostOutermost, c.leftmostInnermost, c.head, c.weakHead]),
    [["ε", true, false, true, true], ["arg", false, true, false, false]]);
  assert.equal(classifyRedexes(P("λa. λb. (λx. x) a"))[0].depthUnderLambda, 2);
});

test("subtermAt follows paths and rejects impossible ones", () => {
  const t = P("λx. (λy. y) x");
  assert.equal(print(subtermAt(t, ["body", "fn"])), "λy. y");
  assert.throws(() => subtermAt(t, ["fn"]), /does not exist/);
});

test("the redex list is exactly the set of sub-terms of the shape (λx. M) N (2000 random terms)", () => {
  const rand = mulberry32(71);
  for (let i = 0; i < 2000; i++) {
    const t = randomTerm(rand, { maxDepth: 7, names: ["x", "y"] });
    for (const r of findRedexes(t, ["beta", "eta"])) {
      const u = subtermAt(t, r.path);
      assert.ok(u === r.term);
      assert.ok(r.kind === "beta" ? isBetaRedex(u) : isEtaRedex(u));
    }
    assert.equal(isBetaNormal(t), findRedexes(t).length === 0);
  }
});

test("printWithSpans produces exactly print(t), and every span re-parses to its sub-term (2000 random terms)", () => {
  const rand = mulberry32(72);
  for (let i = 0; i < 2000; i++) {
    const t = randomTerm(rand, { maxDepth: 7, names: ["x", "y", "z"] });
    const s = printWithSpans(t);
    assert.equal(s.text, print(t));
    for (const r of findRedexes(t)) {
      const { start, end } = spanOf(s, r.path);
      assert.ok(alphaEquivalent(P(s.text.slice(start, end)), r.term), `${s.text} @ ${pathToString(r.path)}`);
    }
  }
});

test("markAt brackets a sub-term in the printed text", () => {
  assert.equal(markAt(P("(λx. x x) ((λy. y) z)"), ["arg"]), "(λx. x x) ([(λy. y) z])");
  assert.equal(markAt(P("λx. f x"), []), "[λx. f x]");
});

test("isPrefix", () => {
  assert.ok(isPrefix([], ["fn"]) && isPrefix(["fn"], ["fn", "arg"]) && !isPrefix(["arg"], ["fn"]));
  assert.ok(equalSyntax(P("x"), P("x")));
});
