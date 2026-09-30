// Module 12 demo — run: npm run demo
// Every output quoted in tutorial.html is copied from this program's actual output.
import { readFileSync } from "node:fs";
import { newSession, runScript, define, expand, substMany, subst, run, normalOrder, alphaEquivalent, print, isClosed, mulberry32, randomTerm, parseOrThrow as P, Var, type Defs, type Term } from "./src/index.ts";

const prelude = readFileSync(new URL("./prelude.lam", import.meta.url), "utf8");
const { session, output } = newSession(prelude);
console.log("== Start-up ==");
console.log(output.join("\n"));

console.log("\n== A REPL session (examples.lam) ==");
console.log(runScript(session, readFileSync(new URL("./examples.lam", import.meta.url), "utf8")).transcript.join("\n"));

console.log("\n== Simultaneous substitution: swap x and y ==");
console.log("  substMany(x y, {x ↦ y, y ↦ x}) =", print(substMany(P("x y"), new Map<string, Term>([["x", Var("y")], ["y", Var("x")]]))));

console.log("\n== Definitions add no power (500 random programs) ==");
const rand = mulberry32(121);
let same = 0;
for (let i = 0; i < 500; i++) {
  let defs: Defs = new Map();
  for (const name of ["f", "g", "h"]) {
    let body: Term;
    do body = randomTerm(rand, { maxDepth: 4, names: ["x", "y"] }); while (!isClosed(body));
    const r = define(defs, name, body);
    if (r.ok) defs = r.defs;
  }
  const e = randomTerm(rand, { maxDepth: 4, names: ["f", "g", "h", "x"] });
  const a = run(expand(e, defs), normalOrder, { fuel: 300, maxSize: 2000, keepTrace: false });
  let manual = e;
  for (const [n, d] of defs) manual = subst(manual, n, d.body);
  const b = run(manual, normalOrder, { fuel: 300, maxSize: 2000, keepTrace: false });
  if (a.status === b.status && a.stepCount === b.stepCount && (a.status !== "done" || alphaEquivalent(a.result, b.result))) same++;
}
console.log(`  same status, same step count, same result: ${same}/500`);
