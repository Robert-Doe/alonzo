// Module 13 demo — run: npm run demo
// Every output quoted in tutorial.html is copied from this program's actual output.
import { readFileSync } from "node:fs";
import { loadDefinitions, newSession, runScript, truthTable, formatTruthTable, parseOrThrow as P } from "./src/index.ts";

const prelude = readFileSync(new URL("./prelude.lam", import.meta.url), "utf8");
const { defs } = loadDefinitions(prelude);

console.log("== Truth tables, every row computed by β-reduction ==");
for (const [op, n] of [["not", 1], ["and", 2], ["or", 2], ["xor", 2]] as const) {
  console.log(`${op}:`);
  console.log(formatTruthTable(op, truthTable(P(op), n, defs)));
}

console.log("\n== In the REPL ==");
const { session } = newSession(prelude);
console.log(runScript(session, [
  "true a b", "if false a b", "not true", "and true (or false true)",
  "fst (pair a b)", "swap (pair a b)", "fst (snd (pair a (pair b c)))",
  ":expand fst (pair a b)",
].join("\n")).transcript.join("\n"));

console.log("\n== Why if must be lazy ==");
console.log(runScript(session, [
  "if true a Omega",
  ":strategy cbv", ":fuel 200",
  "if true a Omega",
  "if true (λd. a) (λd. Omega) I",
].join("\n")).transcript.join("\n"));
