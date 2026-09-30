// Carried over from Module 11 (regression): these must keep passing in every later module.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseOrThrow as P, classifyForms, isBetaEtaNormal, isBetaNormal, isHNF, isWHNF, isValue, isNeutral, etaExpand,
  toWHNF, toHNF, toBetaNF, toBetaEtaNF, stepAt, alphaEquivalent, print, mulberry32, randomTerm,
  reductionGraph, confluenceReport,
} from "../src/index.ts";

test("the zoo: each example is in one form but not the next", () => {
  const zoo: [string, (keyof ReturnType<typeof classifyForms>)[]][] = [
    ["f", ["betaEtaNormal", "betaNormal", "hnf", "whnf", "value", "neutral"]],
    ["λx. f x", ["betaNormal", "hnf", "whnf", "value"]],                         // β-normal, not βη-normal
    ["x ((λa. a) b)", ["hnf", "whnf", "neutral"]],                                // HNF, not β-normal
    ["λx. (λy. y) x", ["whnf", "value"]],                                         // WHNF, not HNF
    ["(λx. x) y", []],                                                            // not even WHNF
  ];
  for (const [src, flags] of zoo) {
    const c = classifyForms(P(src));
    for (const [k, v] of Object.entries(c)) assert.equal(v, flags.includes(k as never), `${src}: ${k}`);
  }
});

test("inclusions hold on 3000 random terms: βη-NF ⊆ β-NF ⊆ HNF ⊆ WHNF, and value ⊆ WHNF", () => {
  const rand = mulberry32(110);
  for (let i = 0; i < 3000; i++) {
    const t = randomTerm(rand, { maxDepth: 7, names: ["x", "y", "z"] });
    const c = classifyForms(t);
    if (c.betaEtaNormal) assert.ok(c.betaNormal, print(t));
    if (c.betaNormal) assert.ok(c.hnf, print(t));
    if (c.hnf) assert.ok(c.whnf, print(t));
    if (c.value) assert.ok(c.whnf, print(t));
    if (c.neutral) assert.ok(c.whnf, print(t));
  }
});

test("η-reduction and η-expansion", () => {
  assert.equal(print(stepAt(P("λx. f x"), [], "eta").reduct), "f");
  assert.throws(() => stepAt(P("λx. x x"), [], "eta"));                       // x free in the function part
  assert.equal(print(etaExpand(P("f"))), "λx. f x");
  assert.equal(print(etaExpand(P("f x"))), "λx1. f x x1");                    // fresh name avoids the free x
});

test("βη-normalization finds more equalities than β alone (extensionality)", () => {
  const a = P("λz. (λx. f x) z"), b = P("f");
  assert.ok(!alphaEquivalent(toBetaNF(a).result, toBetaNF(b).result));      // β: λz. f z  vs  f
  assert.ok(alphaEquivalent(toBetaEtaNF(a).result, toBetaEtaNF(b).result)); // βη: f = f
  assert.equal(print(toBetaEtaNF(P("(λx. λy. x y) f")).result), "f");
});

test("each normalizer stops exactly at its form", () => {
  const rand = mulberry32(111);
  for (let i = 0; i < 1000; i++) {
    const t = randomTerm(rand, { maxDepth: 6, names: ["x", "y", "z"] });
    const o = { fuel: 200, maxSize: 1000, keepTrace: false };
    const w = toWHNF(t, o), h = toHNF(t, o), n = toBetaNF(t, o), e = toBetaEtaNF(t, o);
    if (w.status === "done") assert.ok(isWHNF(w.result));
    if (h.status === "done") assert.ok(isHNF(h.result));
    if (n.status === "done") assert.ok(isBetaNormal(n.result));
    if (e.status === "done") assert.ok(isBetaEtaNormal(e.result));
  }
});

test("λx. Ω is a value and in WHNF, but has no head normal form", () => {
  const t = P("λx. (λy. y y) (λy. y y)");
  assert.ok(isValue(t) && isWHNF(t) && !isHNF(t));
  assert.equal(toWHNF(t).stepCount, 0);
  assert.equal(toHNF(t, { fuel: 100 }).status, "out-of-fuel");
});

test("neutral terms: a variable at the head, forever", () => {
  assert.ok(isNeutral(P("x")) && isNeutral(P("x ((λa. a) b)")) && !isNeutral(P("λx. x")) && !isNeutral(P("(λx. x) y")));
});

test("βη normal forms are unique too (βη-confluence observed on 800 random terms)", () => {
  const rand = mulberry32(112);
  for (let i = 0; i < 800; i++) {
    const t = randomTerm(rand, { maxDepth: 6, names: ["x", "y", "z"] });
    const e = toBetaEtaNF(t, { fuel: 300, maxSize: 1000, keepTrace: false });
    const viaBetaFirst = toBetaNF(t, { fuel: 300, maxSize: 1000, keepTrace: false });
    if (e.status === "done" && viaBetaFirst.status === "done") {
      const thenEta = toBetaEtaNF(viaBetaFirst.result, { fuel: 300 });
      assert.ok(alphaEquivalent(e.result, thenEta.result), print(t));    // β first then η = interleaved
    }
  }
});

test("Module 9's run now honors the redex kind a strategy returns (η steps)", () => {
  const r = toBetaEtaNF(P("λx. f x"));
  assert.equal(r.stepCount, 1); assert.equal(print(r.result), "f");
  assert.ok(confluenceReport(reductionGraph(P("(λx. x) y"))).normalForms.length === 1);
  assert.ok(isHNF(P("λx. x")));
});
