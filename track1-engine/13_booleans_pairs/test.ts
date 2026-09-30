// Module 13 tests — run: npm test   (this file + every earlier module's tests in tests/)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseOrThrow as P, loadDefinitions, newSession, runScript, truthTable, decodeBool, decodePair, encodeBool, expand,
  TRUE, FALSE, K, alphaEquivalent, print, run, callByValue, normalOrder, define, type Defs,
} from "./src/index.ts";

const PRELUDE = readFileSync(new URL("./prelude.lam", import.meta.url), "utf8");
const defs: Defs = loadDefinitions(PRELUDE).defs;
const E = (s: string) => expand(P(s), defs);
const table = (op: string, n: number) => truthTable(P(op), n, defs).map(r => r.output);

test("prelude now has 22 definitions and loads cleanly", () => {
  const r = loadDefinitions(PRELUDE);
  assert.deepEqual(r.errors, []); assert.deepEqual(r.warnings, []); assert.equal(r.count, 22);
});

test("true and false are exactly K and KI", () => {
  assert.ok(alphaEquivalent(TRUE, K));
  assert.ok(alphaEquivalent(FALSE, P("λx y. y")));
});

test("truth tables, all verified by reduction", () => {
  assert.deepEqual(table("not", 1), [true, false]);
  assert.deepEqual(table("and", 2), [false, false, false, true]);
  assert.deepEqual(table("or", 2), [false, true, true, true]);
  assert.deepEqual(table("xor", 2), [false, true, true, false]);
  assert.deepEqual(table("λp q. not (and p q)", 2), [true, true, true, false]);     // nand, composed
});

test("if is the identity on booleans: the boolean does the choosing", () => {
  assert.equal(print(run(E("if true a b"), normalOrder).result), "a");
  assert.equal(print(run(E("if false a b"), normalOrder).result), "b");
  assert.equal(print(run(E("true a b"), normalOrder).result), "a");                // no 'if' needed at all
});

test("pairs: fst, snd, swap, nesting", () => {
  assert.equal(print(run(E("fst (pair a b)"), normalOrder).result), "a");
  assert.equal(print(run(E("snd (pair a b)"), normalOrder).result), "b");
  const sw = decodePair(E("swap (pair a b)"))!;
  assert.deepEqual(sw.map(t => print(t)), ["b", "a"]);
  assert.equal(print(run(E("fst (snd (pair a (pair b c)))"), normalOrder).result), "b");
});

test("decoders are honest: non-booleans decode to null", () => {
  assert.equal(decodeBool(E("and true true")), true);
  assert.equal(decodeBool(E("pair a b")), null);
  assert.equal(decodeBool(E("Omega"), { fuel: 50 }), null);
  assert.ok(alphaEquivalent(encodeBool(true), TRUE));
});

test("if must be lazy: normal order ignores the untaken branch, call-by-value doesn't", () => {
  assert.equal(print(run(E("if true a Omega"), normalOrder).result), "a");
  assert.equal(run(E("if true a Omega"), callByValue, { fuel: 100 }).status, "out-of-fuel");
  // the fix every strict language uses: delay both branches behind λ ("thunks"), then force the chosen one
  const thunked = run(E("if true (λd. a) (λd. Omega) I"), callByValue, { fuel: 100 });
  assert.equal(thunked.status, "done"); assert.equal(print(thunked.result), "a");
});

test("two definitions of not agree on booleans but are different terms", () => {
  const r = define(defs, "not2", P("λb t f. b f t"));
  assert.ok(r.ok);
  assert.deepEqual(truthTable(P("not2"), 1, r.defs).map(x => x.output), [true, false]);
  assert.ok(!alphaEquivalent(E("not"), expand(P("not2"), r.defs)));
});

test("boolean operators on a NON-boolean give garbage, not an error", () => {
  const out = run(E("not (λx. x)"), normalOrder).result;             // λx. x isn't a boolean
  assert.equal(decodeBool(out), null);
});

test("the REPL names boolean results", () => {
  const s = newSession(PRELUDE).session;
  const t = runScript(s, "not true\nor false true").transcript.join("\n");
  assert.match(t, /= false/); assert.match(t, /= true/);
});
