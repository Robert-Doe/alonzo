// Module 8 demo — run: npm run demo
// Every output quoted in tutorial.html is copied from this program's actual output.
import {
  parseOrThrow as P, stepAt, oneStepReducts, printCtx, ruleChain, print, pathToString, markAt,
  findRedexes, toDeBruijn, stepAtDB, equalDB, defaultContext, mulberry32, randomTerm,
} from "./src/index.ts";

function show(src: string, path: string[]): void {
  const t = P(src);
  const r = stepAt(t, path as never);
  console.log(`\n${markAt(t, r.path)}`);
  console.log(`  context    C[□] = ${printCtx(r.ctx)}`);
  console.log(`  redex           = ${print(r.redex)}`);
  console.log(`  contractum      = ${print(r.contractum)}${r.renames.length ? "   (renamed " + r.renames.map(x => x.from + "→" + x.to).join(", ") + " to avoid capture)" : ""}`);
  console.log(`  reduct  C[…]    = ${print(r.reduct)}`);
  console.log(`  rules used      : ${ruleChain(r.ctx, r.kind).join(" ∘ ")}`);
}

console.log("== Decompose, contract, plug ==");
show("(λx. x x) ((λy. y) z)", []);
show("(λx. x x) ((λy. y) z)", ["arg"]);
show("λx. (λy. y) x z", ["body", "fn"]);
show("λz. (λx. λz. x z) z", ["body"]);
show("(λf. f) (λx. g x)", ["arg"]);

console.log("\n== The one-step relation: every reduct of one term ==");
const t = P("(λx. x x) ((λy. y) z)");
for (const r of oneStepReducts(t)) console.log(`  ${print(t)}  →β  ${print(r.reduct)}      (redex at ${pathToString(r.path)})`);

console.log("\n== Cross-check against de Bruijn β ==");
const rand = mulberry32(81);
let steps = 0, agree = 0;
for (let i = 0; i < 3000; i++) {
  const u = randomTerm(rand, { maxDepth: 7, names: ["x", "y", "z"] });
  const g = defaultContext(u);
  for (const r of findRedexes(u)) {
    steps++;
    if (equalDB(toDeBruijn(stepAt(u, r.path).reduct, g), stepAtDB(toDeBruijn(u, g), r.path))) agree++;
  }
}
console.log(`named and nameless β-steps agree on ${agree}/${steps} steps`);
