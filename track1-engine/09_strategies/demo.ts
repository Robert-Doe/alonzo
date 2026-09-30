// Module 9 demo — run: npm run demo
// Every output quoted in tutorial.html is copied from this program's actual output.
import {
  parseOrThrow as P, run, STRATEGIES, normalOrder, applicativeOrder, formatTrace, describeStatus, print, size,
  alphaEquivalent, mulberry32, randomTerm, App, Lam,
} from "./src/index.ts";

console.log("== The race: five strategies, fuel = 50 ==");
for (const src of ["(λx. y) ((λx. x x) (λx. x x))", "(λx. x x) ((λy. y) z)", "(λx. λy. y) ((λz. z) a)", "λx. (λy. y) x", "x ((λa. a) b)"]) {
  console.log(`\n${src}`);
  for (const s of STRATEGIES) {
    const r = run(P(src), s, { fuel: 50 });
    console.log(`  ${s.name.padEnd(18)} ${describeStatus(r).padEnd(66)} ${print(r.result)}`);
  }
}

console.log("\n== Traces ([…] = the redex about to fire) ==");
console.log("normal order on (λx. x x) ((λy. y) z):");
console.log(formatTrace(run(P("(λx. x x) ((λy. y) z)"), normalOrder)));
console.log("applicative order on the same term:");
console.log(formatTrace(run(P("(λx. x x) ((λy. y) z)"), applicativeOrder)));
console.log("applicative order on (λx. y) Ω, first 3 steps:");
console.log(formatTrace(run(P("(λx. y) ((λx. x x) (λx. x x))"), applicativeOrder, { fuel: 3 })));

console.log("\n== Growth: (λx. x x x) (λx. x x x) under normal order ==");
const g = run(P("(λx. x x x) (λx. x x x)"), normalOrder, { fuel: 6 });
console.log("  sizes:", [g.start, ...g.steps.map(s => s.after)].map(size).join(" → "));

console.log("\n== Standardization, observed on 2000 random terms ==");
const rand = mulberry32(91);
let both = 0, onlyNormal = 0, neither = 0, disagree = 0;
for (let i = 0; i < 2000; i++) {
  const t = randomTerm(rand, { maxDepth: 7, names: ["x", "y", "z"] });
  const a = run(t, applicativeOrder, { fuel: 200, maxSize: 1000, keepTrace: false });
  const n = run(t, normalOrder, { fuel: 2000, maxSize: 1000, keepTrace: false });
  if (a.status === "done" && n.status === "done") { both++; if (!alphaEquivalent(a.result, n.result)) disagree++; }
  else if (n.status === "done") onlyNormal++;
  else if (a.status !== "done") neither++;
}
console.log(`  both reach a normal form:            ${both}  (different normal forms: ${disagree})`);
console.log(`  only normal order reaches one:       ${onlyNormal}`);
console.log(`  neither (within the limits):         ${neither}`);
console.log(`  only applicative order reaches one:  ${2000 - both - onlyNormal - neither}`);

console.log("\n== Planted divergence: (λd. t) Ω for 500 random terms t ==");
const rand2 = mulberry32(93);
const OMEGA = P("(λx. x x) (λx. x x)");
let nOk = 0, aOk = 0, tNormalizes = 0;
for (let i = 0; i < 500; i++) {
  const t = randomTerm(rand2, { maxDepth: 6, names: ["x", "y", "z"] });
  const wrapped = App(Lam("d", t), OMEGA);
  if (run(t, normalOrder, { fuel: 500, maxSize: 1000, keepTrace: false }).status === "done") tNormalizes++;
  if (run(wrapped, normalOrder, { fuel: 500, maxSize: 1000, keepTrace: false }).status === "done") nOk++;
  if (run(wrapped, applicativeOrder, { fuel: 500, maxSize: 1000, keepTrace: false }).status === "done") aOk++;
}
console.log(`  t itself has a normal form:          ${tNormalizes}`);
console.log(`  normal order normalizes (λd. t) Ω:   ${nOk}`);
console.log(`  applicative order normalizes it:     ${aOk}`);
