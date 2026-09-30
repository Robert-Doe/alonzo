// Module 6 demo — run: npm run demo
// Every output quoted in tutorial.html is copied from this program's actual output.
import {
  parseOrThrow as P, toDeBruijn, fromDeBruijn, printDB, parseDB, equalDB, shift, substTop, substTopNoShift,
  defaultContext, DVar, alphaEquivalent, print, mulberry32, randomTerm,
} from "./src/index.ts";

console.log("== Named → nameless ==");
for (const s of ["λx. x", "λx. λy. x", "λx. λy. y", "λx y z. x z (y z)", "λx. λy. x (λz. z x)", "(λx. x) y", "λx. x b a"]) {
  const t = P(s), ctx = defaultContext(t);
  console.log(`${s.padEnd(22)} → ${printDB(toDeBruijn(t, ctx)).padEnd(20)} ${ctx.length ? "Γ = [" + ctx.join(", ") + "]" : ""}`);
}

console.log("\n== α-equivalent terms become identical ==");
for (const [a, b] of [["λx. λy. x y", "λa. λb. a b"], ["λx. λx. x", "λa. λb. a"]]) {
  const da = toDeBruijn(P(a)), db = toDeBruijn(P(b));
  console.log(`${a.padEnd(12)} ${printDB(da).padEnd(10)} | ${b.padEnd(12)} ${printDB(db).padEnd(10)} identical: ${equalDB(da, db)}`);
}

console.log("\n== Back to names (hints freshened) ==");
console.log(printDB(parseDB("λx. λx. 1"), { hints: true }), "→", print(fromDeBruijn(parseDB("λx. λx. 1"))));

console.log("\n== Shifting ==");
console.log("shift(+2, cutoff 0, λ. 0 1) =", printDB(shift(2, 0, parseDB("λ. 0 1"))), "  (the bound 0 stays; the free 1 moves)");

console.log("\n== Substitution without names: (λy. x)[x := y] ==");
// Under Γ = [y], the body of λx. λy. x is λ. 1 ... converted with x as the innermost binder:
const body = parseDB("λy. 1"), arg = DVar(0);   // hint "y" = the original binder name
console.log("body (under λx) =", printDB(body), "  argument y =", printDB(arg));
console.log("substTop        =", printDB(substTop(body, arg)), "  → back to names:", print(fromDeBruijn(substTop(body, arg), ["y"])));
console.log("without shifting=", printDB(substTopNoShift(body, arg)), "  → back to names:", print(fromDeBruijn(substTopNoShift(body, arg), ["y"])));

console.log("\n== Round trip on random terms ==");
const rand = mulberry32(12);
let ok = 0;
for (let i = 0; i < 3000; i++) {
  const t = randomTerm(rand, { maxDepth: 7, names: ["x", "y", "z"] }), ctx = defaultContext(t);
  if (alphaEquivalent(fromDeBruijn(toDeBruijn(t, ctx), ctx), t)) ok++;
}
console.log(`fromDeBruijn(toDeBruijn(t)) ≡α t for ${ok}/3000`);
