// Module 11 demo — run: npm run demo
// Every output quoted in tutorial.html is copied from this program's actual output.
import {
  parseOrThrow as P, classifyForms, toWHNF, toHNF, toBetaNF, toBetaEtaNF, etaExpand, stepAt, describeStatus, print,
  mulberry32, randomTerm,
} from "./src/index.ts";

const yes = (b: boolean) => (b ? "  ✓  " : "  ·  ");
console.log("== The normal-form zoo ==");
console.log("term                          βη-NF  β-NF   HNF   WHNF  value");
for (const src of ["f", "λx. f x", "x ((λa. a) b)", "λx. (λy. y) x", "λx. (λy. y y) (λy. y y)", "(λx. x) y"]) {
  const c = classifyForms(P(src));
  console.log(`${src.padEnd(30)}${yes(c.betaEtaNormal)} ${yes(c.betaNormal)}${yes(c.hnf)} ${yes(c.whnf)}${yes(c.value)}`);
}

console.log("\n== One term, four normalizers: (λx. λy. x y) (λz. (λw. w) z) ==");
const t = P("(λx. λy. x y) (λz. (λw. w) z)");
for (const [name, r] of [["to WHNF (call-by-name)", toWHNF(t)], ["to HNF (head reduction)", toHNF(t)], ["to β-NF (normal order)", toBetaNF(t)], ["to βη-NF (normal order, β and η)", toBetaEtaNF(t)]] as const) {
  console.log(`  ${name.padEnd(34)} ${print(r.result).padEnd(28)} ${r.stepCount} step(s)`);
}

console.log("\n== η both ways ==");
console.log("  λx. f x  →η ", print(stepAt(P("λx. f x"), [], "eta").reduct));
console.log("  expand f:     ", print(etaExpand(P("f"))));
console.log("  expand f x:   ", print(etaExpand(P("f x"))), "  (fresh name: x is taken)");

console.log("\n== λx. Ω: a value with no head normal form ==");
const lo = P("λx. (λy. y y) (λy. y y)");
console.log("  to WHNF:", describeStatus(toWHNF(lo)));
console.log("  to HNF: ", describeStatus(toHNF(lo, { fuel: 100 })));

console.log("\n== How random terms spread over the zoo (3000 terms) ==");
const rand = mulberry32(110);
const count = { betaEtaNormal: 0, betaNormal: 0, hnf: 0, whnf: 0, value: 0, none: 0 };
for (let i = 0; i < 3000; i++) {
  const c = classifyForms(randomTerm(rand, { maxDepth: 7, names: ["x", "y", "z"] }));
  if (c.betaEtaNormal) count.betaEtaNormal++;
  if (c.betaNormal) count.betaNormal++;
  if (c.hnf) count.hnf++;
  if (c.whnf) count.whnf++; else count.none++;
  if (c.value) count.value++;
}
console.log(`  βη-NF ${count.betaEtaNormal} ⊆ β-NF ${count.betaNormal} ⊆ HNF ${count.hnf} ⊆ WHNF ${count.whnf};  values ${count.value};  not even WHNF ${count.none}`);
