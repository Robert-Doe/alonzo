// Carried over from Module 10 (regression): these must keep passing in every later module.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseOrThrow as P, reductionGraph, confluenceReport, reachability, residuals, develop, alphaKey, oneStepReducts,
  findRedexes, subtermAt, isBetaRedex, alphaEquivalent, print, pathToString, freeVars, sorted, mulberry32, randomTerm,
  type Term,
} from "../src/index.ts";

test("the reduction graph of (λx. x x) ((λy. y) z): 6 nodes, 7 edges, one normal form", () => {
  const g = reductionGraph(P("(λx. x x) ((λy. y) z)"));
  assert.equal(g.nodes.length, 6); assert.equal(g.edges.length, 7); assert.equal(g.truncated, false);
  const r = confluenceReport(g);
  assert.deepEqual(r.normalForms.map(t => print(t)), ["z z"]);
  assert.equal(r.forks, r.joined);
});

test("Ω is a one-node loop; (λx. y) Ω has a loop AND a way out", () => {
  const o = reductionGraph(P("(λx. x x) (λx. x x)"));
  assert.equal(o.nodes.length, 1); assert.deepEqual(o.edges.map(e => [e.from, e.to]), [[0, 0]]);
  const k = reductionGraph(P("(λx. y) ((λx. x x) (λx. x x))"));
  assert.deepEqual(k.edges.map(e => [e.from, e.to, pathToString(e.path)]), [[0, 1, "ε"], [0, 0, "arg"]]);
  assert.equal(confluenceReport(k).nodesCutOffFromNF, 0);
});

test("α-equivalent reducts are merged into one node", () => {
  const g = reductionGraph(P("(λx. x x) (λx. x x)"));
  assert.equal(g.nodes.length, 1);           // Ω → Ω (renamed or not) stays one node
});

test("CHURCH–ROSSER, observed: on 1500 random terms with complete graphs, every fork rejoins and the normal form is unique", () => {
  const rand = mulberry32(100);
  let complete = 0, forks = 0;
  for (let i = 0; i < 1500; i++) {
    const t = randomTerm(rand, { maxDepth: 7, names: ["x", "y", "z"] });
    const g = reductionGraph(t, { maxNodes: 150, maxSize: 200 });
    if (g.truncated) continue;
    complete++;
    const r = confluenceReport(g);
    assert.equal(r.joined, r.forks, print(t));
    assert.ok(r.normalForms.length <= 1, `${print(t)} has ${r.normalForms.length} normal forms`);
    if (r.normalForms.length === 1) assert.equal(r.nodesCutOffFromNF, 0, print(t));
    forks += r.forks;
  }
  assert.ok(complete > 1000 && forks > 500, `complete=${complete} forks=${forks}`);
});

test("residuals: copied, erased, kept — and created redexes are not residuals", () => {
  const dup = residuals(P("(λx. x x) ((λy. y) z)"), [], ["arg"]);
  assert.equal(print(dup.reduct), "(λy. y) z ((λy. y) z)");
  assert.deepEqual(dup.residuals.map(pathToString), ["fn", "arg"]);                 // copied twice
  assert.deepEqual(residuals(P("(λx. y) ((λz. z) a)"), [], ["arg"]).residuals, []); // erased
  const created = residuals(P("(λf. f ((λz. z) b)) (λw. w)"), [], ["fn", "body", "arg"]);
  assert.equal(print(created.reduct), "(λw. w) ((λz. z) b)");
  assert.deepEqual(created.residuals.map(pathToString), ["arg"]);                   // the new redex at ε is CREATED
  const kept = residuals(P("(λx. (λy. x y) x) z"), [], ["fn", "body"]);
  assert.deepEqual(kept.residuals.map(pathToString), ["ε"]);                        // kept, with z substituted in
});

test("residuals are always redexes, and there are none of the fired redex itself (random pairs)", () => {
  const rand = mulberry32(101);
  let pairs = 0;
  for (let i = 0; i < 1500; i++) {
    const t = randomTerm(rand, { maxDepth: 7, names: ["x", "y", "z"] });
    const rs = findRedexes(t);
    for (const s of rs) for (const r of rs) {
      pairs++;
      const out = residuals(t, s.path, r.path);
      for (const p of out.residuals) assert.ok(isBetaRedex(subtermAt(out.reduct, p)));
      if (pathToString(s.path) === pathToString(r.path)) assert.deepEqual(out.residuals, []);
    }
  }
  assert.ok(pairs > 1000);
});

test("complete development contracts all ORIGINAL redexes but not created ones", () => {
  assert.equal(print(develop(P("(λx. x x) ((λy. y) z)"))), "z z");
  assert.equal(print(develop(P("(λx. x a) (λy. y)"))), "(λy. y) a");           // the created redex survives
  assert.equal(print(develop(P("λx. y"))), "λx. y");
});

test("TRIANGLE PROPERTY (Takahashi), observed: every one-step reduct N of M reaches M* (1500 random terms)", () => {
  const rand = mulberry32(102);
  let checked = 0;
  for (let i = 0; i < 1500; i++) {
    const m = randomTerm(rand, { maxDepth: 6, names: ["x", "y", "z"] });
    const star = develop(m);
    const ctx = sorted(freeVars(m));
    const target = alphaKey(star, ctx);
    for (const n of oneStepReducts(m)) {
      const g = reductionGraph(n.reduct, { maxNodes: 200, maxSize: 200 });
      const reach = reachability(g)[0];
      const found = [...reach].some(id => alphaKey(g.nodes[id].term, ctx) === target);
      if (!g.truncated) { checked++; assert.ok(found, `M=${print(m)}  N=${print(n.reduct)}  M*=${print(star)}`); }
    }
  }
  assert.ok(checked > 300, `only ${checked} checked`);
});

test("reachability includes the node itself", () => {
  const g = reductionGraph(P("x"));
  assert.deepEqual([...reachability(g)[0]], [0]);
  const t: Term = P("λa. a");
  assert.ok(alphaEquivalent(g.nodes[0].term, P("x")) && alphaEquivalent(t, t));
});
