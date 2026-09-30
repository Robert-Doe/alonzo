// Module 10 demo — run: npm run demo
// Every output quoted in tutorial.html is copied from this program's actual output.
import {
  parseOrThrow as P, reductionGraph, confluenceReport, reachability, residuals, develop, describeNode, oneStepReducts,
  alphaKey, print, pathToString, freeVars, sorted, markAt, mulberry32, randomTerm,
} from "./src/index.ts";

function graph(src: string): void {
  const g = reductionGraph(P(src));
  console.log(`\n${src}`);
  for (const n of g.nodes) console.log("  " + describeNode(n));
  for (const e of g.edges) console.log(`    #${e.from} → #${e.to}   (redex at ${pathToString(e.path)})`);
  const r = confluenceReport(g);
  console.log(`  forks: ${r.forks}, rejoined: ${r.joined}, normal forms: {${r.normalForms.map(t => print(t)).join(", ")}}${g.truncated ? "  (TRUNCATED)" : ""}`);
}

console.log("== Reduction graphs (α-equivalent terms merged) ==");
graph("(λx. x x) ((λy. y) z)");
graph("(λx. y) ((λx. x x) (λx. x x))");
graph("(λx. x x) (λx. x x)");

console.log("\n== Residuals: what happens to redex R when S fires ==");
for (const [src, s, r, what] of [
  ["(λx. x x) ((λy. y) z)", [], ["arg"], "copied"],
  ["(λx. y) ((λz. z) a)", [], ["arg"], "erased"],
  ["(λx. (λy. x y) x) z", [], ["fn", "body"], "kept (modified)"],
  ["(λf. f ((λz. z) b)) (λw. w)", [], ["fn", "body", "arg"], "kept; plus a CREATED redex"],
] as const) {
  const out = residuals(P(src), s, r);
  console.log(`  ${markAt(P(src), r)}   fire S at ${pathToString(s)}  →  ${out.reduct ? print(out.reduct) : ""}`);
  console.log(`      residuals of R at: [${out.residuals.map(pathToString).join(", ")}]   (${what})`);
}

console.log("\n== Complete development M* (Takahashi) ==");
for (const src of ["(λx. x x) ((λy. y) z)", "(λx. x a) (λy. y)", "(λx. λy. x) ((λa. a) b) ((λc. c) d)"]) {
  console.log(`  (${src})*  =  ${print(develop(P(src)))}`);
}
const m = P("(λx. x x) ((λy. y) z)");
console.log(`  triangle for M = ${print(m)}, M* = ${print(develop(m))}:`);
for (const n of oneStepReducts(m)) {
  const g = reductionGraph(n.reduct);
  const ctx = sorted(freeVars(m));
  const hit = [...reachability(g)[0]].some(i => alphaKey(g.nodes[i].term, ctx) === alphaKey(develop(m), ctx));
  console.log(`    M → ${print(n.reduct).padEnd(24)} which reaches M*: ${hit}`);
}

console.log("\n== Church–Rosser on 1500 random terms ==");
const rand = mulberry32(100);
let complete = 0, forks = 0, joined = 0, multiNF = 0, withNF = 0, truncated = 0;
for (let i = 0; i < 1500; i++) {
  const g = reductionGraph(randomTerm(rand, { maxDepth: 7, names: ["x", "y", "z"] }), { maxNodes: 150, maxSize: 200 });
  if (g.truncated) { truncated++; continue; }
  complete++;
  const r = confluenceReport(g);
  forks += r.forks; joined += r.joined;
  if (r.normalForms.length > 1) multiNF++;
  if (r.normalForms.length === 1) withNF++;
}
console.log(`  complete graphs: ${complete}  (truncated, skipped: ${truncated})`);
console.log(`  forks: ${forks}, rejoined: ${joined}`);
console.log(`  graphs with exactly one normal form: ${withNF}; with more than one: ${multiNF}`);
