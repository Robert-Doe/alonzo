// Module 8 tests — run: npm test   (this file + every earlier module's tests in tests/)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseOrThrow as P, decompose, plug, contract, stepAt, oneStepReducts, stepAtDB, ruleChain, printCtx, HOLE,
  findRedexes, subtermAt, toDeBruijn, equalDB, defaultContext, alphaEquivalent, equalSyntax, freeVars, print,
  pathToString, mulberry32, randomTerm, Var, canonicalize,
} from "./src/index.ts";

test("contract: the β-rule and the η-rule at the root", () => {
  assert.equal(print(contract(P("(λx. x x) y"))), "y y");
  assert.equal(print(contract(P("(λx. λy. x) a"))), "λy. a");
  assert.equal(print(contract(P("λx. f x"))), "f");
  assert.throws(() => contract(P("f x")), /is not a redex/);
});

test("β uses capture-avoiding substitution", () => {
  const r = stepAt(P("λz. (λx. λz. x z) z"), ["body"]);
  assert.equal(print(r.reduct), "λz. λz1. z z1");                // naive would give λz. λz. z z
  assert.deepEqual(r.renames, [{ from: "z", to: "z1" }]);
});

test("decompose / plug are inverses (3000 random terms, every path to every redex)", () => {
  const rand = mulberry32(80);
  for (let i = 0; i < 3000; i++) {
    const t = randomTerm(rand, { maxDepth: 7, names: ["x", "y", "z"] });
    for (const r of findRedexes(t, ["beta", "eta"])) {
      const { ctx, focus } = decompose(t, r.path);
      assert.ok(focus === subtermAt(t, r.path));
      assert.ok(equalSyntax(plug(ctx, focus), t));
    }
  }
});

test("plugging DOES capture (that's the point of a context)", () => {
  const { ctx } = decompose(P("λx. y"), ["body"]);
  assert.equal(print(plug(ctx, Var("x"))), "λx. x");
});

test("contexts print with a hole; rule chains mirror the congruence rules", () => {
  const r = stepAt(P("λx. (λy. y) x z"), ["body", "fn"]);
  assert.equal(printCtx(r.ctx), "λx. □ z");
  assert.deepEqual(ruleChain(r.ctx), ["ξ", "app-L", "β"]);
  assert.deepEqual(ruleChain(HOLE, "eta"), ["η"]);
  assert.deepEqual(ruleChain(stepAt(P("f ((λx. x) y)"), ["arg"]).ctx), ["app-R", "β"]);
});

test("stepAt refuses a path that is not a redex", () => {
  assert.throws(() => stepAt(P("f ((λx. x) y)"), []), /no redex at ε/);
  assert.throws(() => stepAt(P("λx. f x"), [], "beta"), /no β-redex at ε/);
  assert.throws(() => stepAt(P("f x"), ["fn", "fn"]), /does not exist/);
});

test("one-step reducts: one per redex, and nothing else changes", () => {
  const rs = oneStepReducts(P("(λx. x x) ((λy. y) z)"));
  assert.deepEqual(rs.map(r => print(r.reduct)), ["(λy. y) z ((λy. y) z)", "(λx. x x) z"]);
  assert.deepEqual(oneStepReducts(P("λx. x")), []);
});

test("CROSS-CHECK: named β-step ≡ de Bruijn β-step at every redex of 3000 random terms", () => {
  const rand = mulberry32(81);
  let steps = 0;
  for (let i = 0; i < 3000; i++) {
    const t = randomTerm(rand, { maxDepth: 7, names: ["x", "y", "z"] });
    const ctx = defaultContext(t);
    for (const r of findRedexes(t)) {
      steps++;
      const named = stepAt(t, r.path).reduct;
      const nameless = stepAtDB(toDeBruijn(t, ctx), r.path);
      assert.ok(equalDB(toDeBruijn(named, ctx), nameless), `${print(t)} @ ${pathToString(r.path)}`);
    }
  }
  assert.ok(steps > 2000, `only ${steps} steps checked`);
});

test("a step never creates new free variables (3000 random terms)", () => {
  const rand = mulberry32(82);
  for (let i = 0; i < 3000; i++) {
    const t = randomTerm(rand, { maxDepth: 7, names: ["x", "y", "z"] });
    const fv = freeVars(t);
    for (const r of oneStepReducts(t, ["beta", "eta"])) for (const v of freeVars(r.reduct)) assert.ok(fv.has(v), `${print(t)} → ${print(r.reduct)}`);
  }
});

test("a step is compatible with α: α-equivalent terms step to α-equivalent reducts", () => {
  const rand = mulberry32(83);
  for (let i = 0; i < 1000; i++) {
    const t = randomTerm(rand, { maxDepth: 6, names: ["x", "y", "z"] });
    const u = canonicalize(t);   // same shape, every binder renamed
    for (const r of findRedexes(t)) assert.ok(alphaEquivalent(stepAt(t, r.path).reduct, stepAt(u, r.path).reduct));
  }
});
