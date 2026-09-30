// Module 3 demo — run: npm run demo
// Every output quoted in tutorial.html is copied from this program's actual output.
import {
  parse, parseOrThrow, analyzeParens, print, printFull, show, renderTree, formatError, equalSyntax,
  mulberry32, randomTerm,
} from "./src/index.ts";

console.log("== Text → tree ==");
for (const src of ["f x y", "λx. x y", "(λx. x) y", "f λx. x g", "λx y z. x z (y z)"]) {
  const t = parseOrThrow(src);
  console.log(`${src.padEnd(20)} → ${printFull(t)}`);
}

console.log("\n== The tree for (λx. x) y, and how the parser got there ==");
const r = parse("(λx. x) y", { trace: true });
console.log(show(r.term!));
console.log(renderTree(r.term!));
console.log("trace:");
for (const line of r.trace) console.log("  " + line);

console.log("\n== Syntax errors ==");
for (const src of ["(λx. x", "λ. x", "λx x", "f )"]) {
  const res = parse(src);
  console.log(formatError(src, res.errors[0]));
}

console.log("\n== Which parentheses matter? ==");
const text = "((λx. x) (y z)) (λw. w)";
console.log(text);
for (const p of analyzeParens(text)!) {
  console.log(`  pair at ${String(p.open).padStart(2)}..${String(p.close).padEnd(2)} ${(p.necessary ? "NECESSARY" : "redundant").padEnd(9)}  ${p.effect}`);
}
console.log("print() of the same tree:", print(parseOrThrow(text)));

console.log("\n== Closing Module 1's open question ==");
const rand = mulberry32(3);
let roundTrips = 0;
for (let i = 0; i < 5000; i++) {
  const t = randomTerm(rand, { maxDepth: 8, names: ["x", "y", "z", "f'"] });
  if (equalSyntax(parseOrThrow(print(t)), t)) roundTrips++;
}
console.log(`parse(print(t)) = t for ${roundTrips}/5000 random terms`);
const rand2 = mulberry32(11);
let pairs = 0, necessary = 0;
for (let i = 0; i < 2000; i++) {
  for (const p of analyzeParens(print(randomTerm(rand2, { maxDepth: 7, names: ["x", "y", "z"] })))!) {
    pairs++;
    if (p.necessary) necessary++;
  }
}
console.log(`paren pairs emitted by print(): ${pairs}, necessary: ${necessary}`);
