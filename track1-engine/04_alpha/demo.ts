// Module 4 demo — run: npm run demo
// Every output quoted in tutorial.html is copied from this program's actual output.
import {
  parseOrThrow as P, freeVars, isClosed, sorted, occurrences, pathToString, alphaEquivalent,
  renameBinder, canonicalize, equalSyntax, print, mulberry32, randomTerm,
} from "./src/index.ts";

console.log("== Free variables ==");
for (const s of ["λx. x", "λx. x y", "(λx. x) x", "λx. λy. x y z", "λx y z. x z (y z)"]) {
  const t = P(s);
  console.log(`${s.padEnd(20)} FV = {${sorted(freeVars(t)).join(", ")}}${isClosed(t) ? "   (closed)" : ""}`);
}

console.log("\n== Who binds whom: (λx. λx. x y) x ==");
for (const o of occurrences(P("(λx. λx. x y) x"))) {
  console.log(`  ${o.name} at ${pathToString(o.path).padEnd(18)} ${o.binder ? "bound by the λ at " + pathToString(o.binder) : "FREE"}`);
}

console.log("\n== α-equivalence ==");
for (const [a, b] of [["λx. x", "λy. y"], ["λx. λy. x y", "λy. λx. y x"], ["λx. λx. x", "λa. λb. a"], ["λx. y", "λy. y"]]) {
  console.log(`${a.padEnd(14)} ≡α ${b.padEnd(14)} ? ${alphaEquivalent(P(a), P(b))}`);
}

console.log("\n== Renaming one binder ==");
for (const [s, y] of [["λx. λz. x z", "y"], ["λx. x y", "y"], ["λx. λy. x", "y"], ["λx. λy. λx. x", "y"]]) {
  const r = renameBinder(P(s), y);
  console.log(`${s.padEnd(16)} rename x→${y}:  ${r.ok ? "OK  " + print(r.term) : "REFUSED: " + r.reason}`);
}

console.log("\n== Canonical forms (every binder distinct: v0, v1, …) ==");
for (const s of ["λx. λx. x", "(λx. x) λx. x", "λy. λx. y x", "λx. v0"]) {
  console.log(`${s.padEnd(16)} → ${print(canonicalize(P(s)))}`);
}

console.log("\n== Two independent α-tests agree ==");
const rand = mulberry32(4);
let agree = 0, equivalent = 0;
for (let i = 0; i < 3000; i++) {
  const a = randomTerm(rand, { maxDepth: 5, names: ["x", "y"] }), b = randomTerm(rand, { maxDepth: 5, names: ["x", "y"] });
  const w = alphaEquivalent(a, b), c = equalSyntax(canonicalize(a), canonicalize(b));
  if (w === c) agree++;
  if (w) equivalent++;
}
console.log(`agree on ${agree}/3000 random pairs (${equivalent} of them α-equivalent)`);
