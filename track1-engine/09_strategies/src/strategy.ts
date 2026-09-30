// strategy.ts — choosing the redex, and running until done.
//
// A STRATEGY is a function from a term to the redex it wants contracted next (or null: "I'm done").
// Running = repeat { pick, step } until the strategy says done, or the fuel runs out.
//
//   normal order        leftmost-outermost redex, anywhere (even under λ)
//   applicative order   leftmost-innermost redex, anywhere
//   call-by-name        the weak-head redex only: never under λ, never inside arguments → stops at WHNF
//   call-by-value       Plotkin's CBV: evaluate function, then argument, to VALUES (λ or variable), then contract;
//                       never under λ
//   head reduction      the head redex only → stops at head normal form
//
// Because the λ-calculus can loop forever, every run takes FUEL: a maximum number of steps. Running out of
// fuel is a result, not a crash — the only honest answer a program can give about a term that might never stop.

import type { Term } from "./term.ts";
import { size } from "./term.ts";
import { print } from "./print.ts";
import type { Path, Step } from "./alpha.ts";
import { leftmostOutermost, leftmostInnermost, headRedex, weakHeadRedex, isBetaNormal, type Redex } from "./redex.ts";
import { stepAt } from "./reduce.ts";
import { markAt } from "./spans.ts";

export interface Strategy {
  readonly name: string;
  readonly short: string;
  readonly pick: (t: Term) => Redex | null;
}

// CBV values: abstractions and variables (open terms are allowed, so a variable counts as a value).
export const isValue = (t: Term): boolean => t.kind === "lam" || t.kind === "var";

function cbvPick(u: Term, path: Step[]): Redex | null {
  if (u.kind !== "app") return null;                                   // a value: nothing to do (never go under λ)
  if (!isValue(u.fn)) return cbvPick(u.fn, [...path, "fn"]);            // E ::= E N   — function first
  if (!isValue(u.arg)) return cbvPick(u.arg, [...path, "arg"]);         //    |  V E   — then the argument
  return u.fn.kind === "lam" ? { kind: "beta", path, term: u } : null;  // (λx. M) V → M[x := V];  x V is stuck
}

export const normalOrder: Strategy = { name: "normal order", short: "normal", pick: t => leftmostOutermost(t) };
export const applicativeOrder: Strategy = { name: "applicative order", short: "applicative", pick: t => leftmostInnermost(t) };
export const callByName: Strategy = { name: "call-by-name", short: "cbn", pick: t => weakHeadRedex(t) };
export const callByValue: Strategy = { name: "call-by-value", short: "cbv", pick: t => cbvPick(t, []) };
export const headReduction: Strategy = { name: "head reduction", short: "head", pick: t => headRedex(t) };

export const STRATEGIES: readonly Strategy[] = [normalOrder, applicativeOrder, callByName, callByValue, headReduction];

export function strategyByName(s: string): Strategy {
  const found = STRATEGIES.find(x => x.short === s || x.name === s);
  if (!found) throw new Error(`unknown strategy '${s}' (try: ${STRATEGIES.map(x => x.short).join(", ")})`);
  return found;
}

// ── running ────────────────────────────────────────────────────────────────────

export interface TraceStep {
  readonly path: Path;       // where the redex was, in the term BEFORE this step
  readonly before: Term;
  readonly after: Term;
}

export type Status =
  | "done"          // the strategy found nothing more to do
  | "out-of-fuel"   // stopped after `fuel` steps: maybe it loops, maybe it just needed more
  | "too-big";      // the term grew past `maxSize` nodes

export interface RunResult {
  readonly strategy: string;
  readonly start: Term;
  readonly result: Term;
  readonly steps: TraceStep[];     // empty when keepTrace is false
  readonly stepCount: number;
  readonly status: Status;
  readonly betaNormal: boolean;   // is the final term in β-normal form? ("done" under CBN/CBV/head need not be)
}

export interface RunOptions {
  fuel?: number;       // default 1000 steps
  maxSize?: number;    // default 20000 nodes
  keepTrace?: boolean; // default true; false keeps memory flat for long runs
}

export function run(t: Term, strategy: Strategy, opts: RunOptions = {}): RunResult {
  const fuel = opts.fuel ?? 1000, maxSize = opts.maxSize ?? 20000, keep = opts.keepTrace ?? true;
  const steps: TraceStep[] = [];
  let cur = t, n = 0;
  let status: Status = "done";
  for (;;) {
    const r = strategy.pick(cur);
    if (!r) { status = "done"; break; }
    if (n >= fuel) { status = "out-of-fuel"; break; }
    const next = stepAt(cur, r.path, "beta").reduct;
    if (keep) steps.push({ path: r.path, before: cur, after: next });
    cur = next;
    n++;
    if (size(cur) > maxSize) { status = "too-big"; break; }
  }
  return { strategy: strategy.name, start: t, result: cur, steps, stepCount: n, status, betaNormal: isBetaNormal(cur) };
}

// Human-readable trace: each line shows the term with the redex about to fire in [brackets].
export function formatTrace(r: RunResult, maxLines = 30): string {
  const lines: string[] = [];
  const shown = r.steps.slice(0, maxLines);
  for (const s of shown) lines.push(`   ${markAt(s.before, s.path)}`);
  if (r.steps.length > maxLines) lines.push(`   … ${r.steps.length - maxLines} more steps …`);
  lines.push(`→  ${print(r.result)}`);
  return lines.join("\n");
}

export function describeStatus(r: RunResult): string {
  const n = r.stepCount;
  switch (r.status) {
    case "done": return `${n} step${n === 1 ? "" : "s"}${r.betaNormal ? ", β-normal form" : ", stopped (not β-normal: this strategy doesn't reduce there)"}`;
    case "out-of-fuel": return `OUT OF FUEL after ${n} steps`;
    case "too-big": return `TOO BIG after ${n} steps (term exceeded the size limit)`;
  }
}
