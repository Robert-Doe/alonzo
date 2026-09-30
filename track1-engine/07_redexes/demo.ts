// Module 7 demo — run: npm run demo
// Every output quoted in tutorial.html is copied from this program's actual output.
import {
  parseOrThrow as P, classifyRedexes, markAt, pathToString, isBetaNormal, headRedex, mulberry32, randomTerm, findRedexes,
} from "./src/index.ts";

function report(src: string): void {
  const t = P(src);
  const cs = classifyRedexes(t);
  console.log(`\n${src}   ${cs.length === 0 ? "(no redexes)" : ""}${isBetaNormal(t) ? "  → β-normal form" : ""}`);
  for (const r of cs) {
    const tags = [r.leftmostOutermost && "leftmost-outermost", r.leftmostInnermost && "leftmost-innermost",
      r.head && "head", r.weakHead && "weak-head"].filter(Boolean).join(", ");
    console.log(`  ${r.kind === "beta" ? "β" : "η"} at ${pathToString(r.path).padEnd(10)} ${markAt(t, r.path).padEnd(34)} ${tags}`);
  }
}

console.log("== Finding and classifying redexes ([…] marks the redex) ==");
report("(λx. x x) ((λy. y) z)");
report("(λx. y) ((λx. x x) (λx. x x))");
report("λx. (λy. y) x z");
report("x ((λa. a) b) ((λc. c) d)");
report("(λf. f) (λx. g x)");
report("λx y z. x z (y z)");

console.log("\n== How many redexes do random terms have? (2000 terms) ==");
const rand = mulberry32(7);
const hist = new Map<number, number>();
let withHead = 0;
for (let i = 0; i < 2000; i++) {
  const t = randomTerm(rand, { maxDepth: 7, names: ["x", "y", "z"] });
  const n = findRedexes(t).length;
  hist.set(n, (hist.get(n) ?? 0) + 1);
  if (headRedex(t)) withHead++;
}
for (const n of [...hist.keys()].sort((a, b) => a - b)) console.log(`  ${String(n).padStart(2)} redexes: ${hist.get(n)} terms`);
console.log(`  terms with a head redex: ${withHead}`);
