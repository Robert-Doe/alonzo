// Module 1 demo — run: npm run demo
// Every output quoted in tutorial.html is copied from this program's actual output.
import {
  Var, App, print, printFull, show, renderTree, size, depth, counts,
  mulberry32, randomTerm, I, K, S, omega, Omega, parenCases,
} from "./src/index.ts";

console.log("== The classic terms ==");
for (const [name, t] of [["I", I], ["K", K], ["S", S], ["ω", omega], ["Ω", Omega]] as const) {
  console.log(`${name.padEnd(2)} = ${print(t)}`);
}

console.log("\n== One term, four views: (λx. x) y ==");
const t = App(I, Var("y"));
console.log("print     :", print(t));
console.log("printFull :", printFull(t));
console.log("ASCII     :", print(t, { lambda: "\\" }));
console.log("show      :", show(t));
console.log(renderTree(t));

console.log("\n== The S combinator as a tree ==");
console.log(renderTree(S));
console.log(`size=${size(S)} depth=${depth(S)} counts=${JSON.stringify(counts(S))}`);

console.log("\n== Parenthesization rules ==");
for (const { name, term } of parenCases) {
  console.log(`${print(term).padEnd(22)} ${printFull(term).padEnd(30)} ${name}`);
}

console.log("\n== P5.2 check: vars = apps + 1 on 2000 random terms ==");
const rand = mulberry32(42);
let ok = 0;
for (let i = 0; i < 2000; i++) {
  const c = counts(randomTerm(rand, { maxDepth: 8, names: ["x", "y"] }));
  if (c.vars === c.apps + 1) ok++;
}
console.log(`${ok}/2000 terms satisfy the property`);
