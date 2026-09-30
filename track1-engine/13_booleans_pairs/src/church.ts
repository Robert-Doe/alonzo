// church.ts — reading and writing data that is made of functions.
//
// Church booleans:   true = λt f. t     false = λt f. f        (a boolean IS a choice)
// Church pairs:      pair a b = λs. s a b                       (a pair IS a function waiting for a selector)
//
// The calculus itself never "knows" something is a boolean. These helpers are the bridge to the host
// language: ENCODE a TypeScript value as a term, and DECODE a term (after normalizing it) back, which
// fails honestly if the normal form isn't one of the expected shapes.

import { App, Lam, Var, apps, type Term } from "./term.ts";
import { alphaEquivalent } from "./alpha.ts";
import { print } from "./print.ts";
import { run, normalOrder, type RunOptions, type RunResult } from "./strategy.ts";
import { expand, type Defs } from "./defs.ts";

export const TRUE: Term = Lam("t", Lam("f", Var("t")));
export const FALSE: Term = Lam("t", Lam("f", Var("f")));

export const encodeBool = (b: boolean): Term => (b ? TRUE : FALSE);

export function normalize(t: Term, opts: RunOptions = {}): RunResult {
  return run(t, normalOrder, { fuel: 5000, maxSize: 20000, keepTrace: false, ...opts });
}

// Decode: normalize, then compare with the two boolean normal forms (up to α).
export function decodeBool(t: Term, opts?: RunOptions): boolean | null {
  const r = normalize(t, opts);
  if (r.status !== "done") return null;
  if (alphaEquivalent(r.result, TRUE)) return true;
  if (alphaEquivalent(r.result, FALSE)) return false;
  return null;
}

// Decode a pair by asking it for its components: p true and p false, each normalized.
export function decodePair(t: Term, opts?: RunOptions): [Term, Term] | null {
  const a = normalize(App(t, TRUE), opts), b = normalize(App(t, FALSE), opts);
  if (a.status !== "done" || b.status !== "done") return null;
  return [a.result, b.result];
}

// Evaluate an n-ary boolean operator (a term, usually a defined name expanded) on every input combination.
export interface TruthRow { readonly inputs: boolean[]; readonly output: boolean | null; readonly steps: number }

export function truthTable(op: Term, arity: number, defs?: Defs): TruthRow[] {
  const rows: TruthRow[] = [];
  const f = defs ? expand(op, defs) : op;
  for (let mask = 0; mask < 1 << arity; mask++) {
    const inputs = Array.from({ length: arity }, (_, i) => ((mask >> (arity - 1 - i)) & 1) === 1);
    const r = normalize(apps(f, ...inputs.map(encodeBool)));
    const out = r.status === "done" ? (alphaEquivalent(r.result, TRUE) ? true : alphaEquivalent(r.result, FALSE) ? false : null) : null;
    rows.push({ inputs, output: out, steps: r.stepCount });
  }
  return rows;
}

export function formatTruthTable(name: string, rows: TruthRow[]): string {
  const show = (b: boolean | null) => (b === null ? "??" : b ? "T" : "F");
  return rows.map(r => `  ${name} ${r.inputs.map(show).join(" ")}  =  ${show(r.output)}    (${r.steps} steps)`).join("\n");
}

export function describe(t: Term): string {
  const b = decodeBool(t);
  if (b !== null) return b ? "true" : "false";
  return print(normalize(t).result);
}
