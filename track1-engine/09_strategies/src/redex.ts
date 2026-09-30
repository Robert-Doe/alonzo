// redex.ts — where in a term can a computation step happen?
//
// A REDEX (reducible expression) is a sub-term matching the left side of a rewrite rule (P6.1):
//
//   β-redex:  (λx. M) N            an abstraction applied to an argument
//   η-redex:  λx. M x              with x ∉ FV(M): a λ that only forwards its argument
//
// This module finds every redex by its path (Module 4), and classifies them by the position
// names every evaluation strategy is defined in terms of:
//
//   leftmost-outermost  the first redex in reading order; if two start together, the enclosing one
//   leftmost-innermost  among redexes that contain no other redex, the first in reading order
//   head redex          in λx1…xn. (λy. M) N1 … Nk, the redex (λy. M) N1
//   weak-head redex     the same, but only if the term does NOT start with λ
//
// A term with no β-redex is in β-normal form: nothing is left to compute.

import type { Term } from "./term.ts";
import { freeVars, pathToString, type Path, type Step } from "./alpha.ts";

export type RedexKind = "beta" | "eta";

export interface Redex {
  readonly kind: RedexKind;
  readonly path: Path;
  readonly term: Term;      // the redex sub-term itself
}

export function isBetaRedex(t: Term): boolean {
  return t.kind === "app" && t.fn.kind === "lam";
}

export function isEtaRedex(t: Term): boolean {
  return t.kind === "lam" && t.body.kind === "app" && t.body.arg.kind === "var"
    && t.body.arg.name === t.param && !freeVars(t.body.fn).has(t.param);
}

// Follow a path down from the root. Throws if the path doesn't exist in this term.
export function subtermAt(t: Term, path: Path): Term {
  let u = t;
  for (const step of path) {
    if (step === "body" && u.kind === "lam") u = u.body;
    else if (step === "fn" && u.kind === "app") u = u.fn;
    else if (step === "arg" && u.kind === "app") u = u.arg;
    else throw new Error(`path ${pathToString(path)} does not exist in this term (stuck at '${step}')`);
  }
  return u;
}

// All redexes in PRE-ORDER: a node before its children, function part before argument.
// Pre-order is exactly reading order of where each redex starts, with outer before inner.
export function findRedexes(t: Term, kinds: readonly RedexKind[] = ["beta"]): Redex[] {
  const out: Redex[] = [];
  const wantBeta = kinds.includes("beta"), wantEta = kinds.includes("eta");
  (function go(u: Term, path: Step[]): void {
    if (wantBeta && isBetaRedex(u)) out.push({ kind: "beta", path: [...path], term: u });
    if (wantEta && isEtaRedex(u)) out.push({ kind: "eta", path: [...path], term: u });
    if (u.kind === "lam") go(u.body, [...path, "body"]);
    else if (u.kind === "app") { go(u.fn, [...path, "fn"]); go(u.arg, [...path, "arg"]); }
  })(t, []);
  return out;
}

export const isPrefix = (p: Path, q: Path): boolean => p.length <= q.length && p.every((s, i) => s === q[i]);
export const samePath = (p: Path, q: Path): boolean => p.length === q.length && isPrefix(p, q);

export function isBetaNormal(t: Term): boolean {
  return findRedexes(t).length === 0;
}

// ── the named positions ────────────────────────────────────────────────────────

export function leftmostOutermost(t: Term, kinds: readonly RedexKind[] = ["beta"]): Redex | null {
  return findRedexes(t, kinds)[0] ?? null;
}

export function leftmostInnermost(t: Term, kinds: readonly RedexKind[] = ["beta"]): Redex | null {
  const all = findRedexes(t, kinds);
  // innermost: no OTHER redex lies strictly inside it
  return all.find(r => !all.some(s => s !== r && s.path.length > r.path.length && isPrefix(r.path, s.path))) ?? null;
}

// The head redex: skip the leading λs, then go down the function spine to the head.
// If the innermost application on the spine has a λ in function position, that is the head redex.
export function headRedex(t: Term): Redex | null {
  const path: Step[] = [];
  let u = t;
  while (u.kind === "lam") { path.push("body"); u = u.body; }
  return spineRedex(u, path);
}

// Weak head: the same, but a term that starts with λ has no weak-head redex (we never reduce under λ).
export function weakHeadRedex(t: Term): Redex | null {
  return t.kind === "lam" ? null : spineRedex(t, []);
}

// Walk down the fn-spine (M N1 N2 … = ((M N1) N2) …). The DEEPEST application on the spine is the one
// that applies the head M; it's a redex exactly when M is a λ. Going down, that's the first app whose
// fn is a λ, because above it every fn is again an application.
function spineRedex(u: Term, path: Step[]): Redex | null {
  while (u.kind === "app") {
    if (u.fn.kind === "lam") return { kind: "beta", path: [...path], term: u };
    path.push("fn");
    u = u.fn;
  }
  return null;
}

// ── classification, for reports and the Lab ───────────────────────────────────

export interface ClassifiedRedex extends Redex {
  readonly leftmostOutermost: boolean;
  readonly leftmostInnermost: boolean;
  readonly head: boolean;
  readonly weakHead: boolean;
  readonly depthUnderLambda: number;    // how many λ's enclose it (0 = not under any binder)
}

export function classifyRedexes(t: Term, kinds: readonly RedexKind[] = ["beta", "eta"]): ClassifiedRedex[] {
  const betas = kinds.includes("beta");
  const lo = betas ? leftmostOutermost(t) : null, li = betas ? leftmostInnermost(t) : null;
  const hd = headRedex(t), wh = weakHeadRedex(t);
  const is = (r: Redex, x: Redex | null) => x !== null && r.kind === x.kind && samePath(r.path, x.path);
  return findRedexes(t, kinds).map(r => ({
    ...r,
    leftmostOutermost: is(r, lo),
    leftmostInnermost: is(r, li),
    head: is(r, hd),
    weakHead: is(r, wh),
    depthUnderLambda: r.path.filter(s => s === "body").length,
  }));
}
