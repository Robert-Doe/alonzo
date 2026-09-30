// Module 5 demo — run: npm run demo
// Every output quoted in tutorial.html is copied from this program's actual output.
import {
  parseOrThrow as P, subst, substNaive, freeVars, binderNames, alphaEquivalent, print, sorted,
  mulberry32, randomTerm, type SubstLog,
} from "./src/index.ts";

function show(m: string, x: string, n: string): void {
  const log: SubstLog = { renames: [] };
  const right = subst(P(m), x, P(n), log);
  const wrong = substNaive(P(m), x, P(n));
  console.log(`(${m})[${x} := ${n}]`);
  console.log(`  naive   : ${print(wrong).padEnd(22)} FV = {${sorted(freeVars(wrong)).join(", ")}}`);
  console.log(`  correct : ${print(right).padEnd(22)} FV = {${sorted(freeVars(right)).join(", ")}}` +
    (log.renames.length ? `   renamed ${log.renames.map(r => r.from + "→" + r.to).join(", ")}` : ""));
  console.log(`  same meaning? ${alphaEquivalent(right, wrong)}`);
}

console.log("== When naive substitution is fine ==");
show("λy. x y", "x", "f");
show("λx. x", "x", "f");

console.log("\n== Capture ==");
show("λy. x", "x", "y");
show("λy. x y", "x", "y z");
show("λy. x y1", "x", "y");

console.log("\n== How often does naive substitution go wrong? ==");
const rand = mulberry32(6);
const g = () => randomTerm(rand, { maxDepth: 6, names: ["x", "y", "z"] });
let wrong = 0, clash = 0, fvCaught = 0;
for (let i = 0; i < 3000; i++) {
  const m = g(), n = g();
  const r = subst(m, "x", n), w = substNaive(m, "x", n);
  if ([...binderNames(m)].some(b => freeVars(n).has(b))) clash++;
  if (!alphaEquivalent(r, w)) {
    wrong++;
    if (sorted(freeVars(r)).join() !== sorted(freeVars(w)).join()) fvCaught++;
  }
}
console.log(`random M[x := N], 3000 trials:`);
console.log(`  a binder of M is free in N (capture possible): ${clash}`);
console.log(`  naive result has a different meaning:          ${wrong}`);
console.log(`  ...of which a free-variable check would notice: ${fvCaught}`);
