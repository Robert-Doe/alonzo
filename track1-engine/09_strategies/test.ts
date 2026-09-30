// Module 9 tests — run: npm test   (this file + every earlier module's tests in tests/)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseOrThrow as P, run, normalOrder, applicativeOrder, callByName, callByValue, headReduction, STRATEGIES,
  strategyByName, formatTrace, describeStatus, isValue, print, alphaEquivalent, size, isBetaNormal,
  mulberry32, randomTerm, App, Lam,
} from "./src/index.ts";

const OMEGA = "((λx. x x) (λx. x x))";

test("(λx. y) Ω: normal order finishes in 1 step, applicative order never does", () => {
  const t = P(`(λx. y) ${OMEGA}`);
  const n = run(t, normalOrder, { fuel: 100 });
  assert.equal(n.status, "done"); assert.equal(n.stepCount, 1); assert.equal(print(n.result), "y");
  const a = run(t, applicativeOrder, { fuel: 100 });
  assert.equal(a.status, "out-of-fuel"); assert.equal(a.stepCount, 100);
  assert.equal(run(t, callByName, { fuel: 100 }).stepCount, 1);
  assert.equal(run(t, callByValue, { fuel: 100 }).status, "out-of-fuel");
});

test("Ω steps to itself (up to α) forever", () => {
  const r = run(P(OMEGA), normalOrder, { fuel: 5 });
  assert.equal(r.status, "out-of-fuel");
  for (const s of r.steps) assert.ok(alphaEquivalent(s.after, s.before));
});

test("duplication: normal order 3 steps, applicative 2", () => {
  const t = P("(λx. x x) ((λy. y) z)");
  assert.equal(run(t, normalOrder).stepCount, 3);
  assert.equal(run(t, applicativeOrder).stepCount, 2);
});

test("discarding: normal order 1 step, applicative 2", () => {
  const t = P("(λx. λy. y) ((λz. z) a)");
  assert.equal(run(t, normalOrder).stepCount, 1);
  assert.equal(run(t, applicativeOrder).stepCount, 2);
});

test("weak strategies never reduce under λ; head reduction stops at a variable head", () => {
  for (const s of [callByName, callByValue]) {
    const r = run(P("λx. (λy. y) x"), s);
    assert.equal(r.stepCount, 0); assert.equal(r.status, "done"); assert.equal(r.betaNormal, false);
  }
  assert.equal(print(run(P("λx. (λy. y) x"), headReduction).result), "λx. x");
  assert.equal(run(P("x ((λa. a) b)"), headReduction).stepCount, 0);
});

test("call-by-value evaluates the argument to a value before contracting", () => {
  const r = run(P("(λx. x x) ((λy. y) z)"), callByValue);
  assert.equal(pathsOf(r)[0], "arg");         // first step is inside the argument
  assert.ok(isValue(P("λx. x")) && isValue(P("x")) && !isValue(P("f x")));
});
function pathsOf(r: ReturnType<typeof run>): string[] { return r.steps.map(s => s.path.join(".") || "ε"); }

test("growth: (λx. x x x) (λx. x x x) gets bigger every step", () => {
  const r = run(P("(λx. x x x) (λx. x x x)"), normalOrder, { fuel: 20 });
  const sizes = r.steps.map(s => size(s.after));
  for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i] > sizes[i - 1]);
  assert.equal(run(P("(λx. x x x) (λx. x x x)"), normalOrder, { fuel: 10_000, maxSize: 500 }).status, "too-big");
});

test("trace formatting marks each redex", () => {
  const txt = formatTrace(run(P("(λx. x x) ((λy. y) z)"), normalOrder));
  assert.equal(txt, "   [(λx. x x) ((λy. y) z)]\n   [(λy. y) z] ((λy. y) z)\n   z ([(λy. y) z])\n→  z z");
  assert.match(describeStatus(run(P(OMEGA), normalOrder, { fuel: 3 })), /OUT OF FUEL after 3 steps/);
});

test("strategyByName", () => {
  assert.equal(strategyByName("cbv"), callByValue);
  assert.throws(() => strategyByName("nope"), /unknown strategy/);
  assert.equal(STRATEGIES.length, 5);
});

// ── the big empirical theorems ─────────────────────────────────────────────────
const corpus = (seed: number, n: number) => {
  const rand = mulberry32(seed);
  return Array.from({ length: n }, () => randomTerm(rand, { maxDepth: 7, names: ["x", "y", "z"] }));
};

test("UNIQUE NORMAL FORMS: every strategy that reaches β-normal form reaches the SAME one (2000 terms)", () => {
  for (const t of corpus(90, 2000)) {
    const nfs = STRATEGIES.map(s => run(t, s, { fuel: 200, maxSize: 1000, keepTrace: false })).filter(r => r.status === "done" && r.betaNormal).map(r => r.result);
    for (let i = 1; i < nfs.length; i++) assert.ok(alphaEquivalent(nfs[0], nfs[i]), print(t));
  }
});

test("STANDARDIZATION (observed): if applicative order finds a normal form, normal order finds it too (2000 terms)", () => {
  let both = 0, onlyNormal = 0;
  for (const t of corpus(91, 2000)) {
    const a = run(t, applicativeOrder, { fuel: 200, maxSize: 1000, keepTrace: false });
    const n = run(t, normalOrder, { fuel: 2000, maxSize: 1000, keepTrace: false });
    if (a.status === "done") { both++; assert.equal(n.status, "done", print(t)); assert.ok(alphaEquivalent(a.result, n.result)); }
    else if (n.status === "done") onlyNormal++;
  }
  assert.ok(both > 1000);
  void onlyNormal;
});

test("a 'done' full strategy result is β-normal; runs never exceed their fuel", () => {
  for (const t of corpus(92, 1000)) {
    for (const s of [normalOrder, applicativeOrder]) {
      const r = run(t, s, { fuel: 50, keepTrace: false });
      if (r.status === "done") assert.ok(isBetaNormal(r.result));
      assert.ok(r.stepCount <= 50);
    }
  }
});

test("planted divergence: (λd. t) Ω — normal order normalizes exactly when t does; applicative never (300 terms)", () => {
  const OMEGA_T = P(OMEGA);
  for (const t of corpus(94, 300)) {
    const wrapped = App(Lam("d", t), OMEGA_T);
    const tn = run(t, normalOrder, { fuel: 500, maxSize: 1000, keepTrace: false });
    const wn = run(wrapped, normalOrder, { fuel: 501, maxSize: 1000, keepTrace: false });
    if (tn.status === "done") { assert.equal(wn.status, "done"); assert.ok(alphaEquivalent(wn.result, tn.result)); }
    assert.equal(run(wrapped, applicativeOrder, { fuel: 100, keepTrace: false }).status, "out-of-fuel");
  }
});
