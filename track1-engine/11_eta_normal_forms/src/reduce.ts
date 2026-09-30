// reduce.ts — one computation step.
//
// The β-rule contracts one redex:            (λx. M) N  →β  M[x := N]
// The η-rule removes a forwarding λ:         λx. M x    →η  M            (x ∉ FV(M))
//
// A step may happen ANYWHERE inside a term. Textbooks say this with congruence rules (P7.3):
//
//        M → M'              N → N'              M → M'
//   ─────────────  (app-L)  ─────────────  (app-R)  ─────────────  (ξ)
//    M N → M' N              M N → M N'          λx. M → λx. M'
//
// Equivalently: a step is "C[R] → C[R']" where R is a redex, R' its contractum, and C[□] is a
// CONTEXT — the whole term with a hole where the redex was. Here contexts are real data, one
// constructor per congruence rule, so "decompose, contract, plug" is literally the definition.

import { App, Lam, Var, type Term } from "./term.ts";
import { subst, type SubstLog } from "./subst.ts";
import { print } from "./print.ts";
import { isBetaRedex, isEtaRedex, findRedexes, type RedexKind } from "./redex.ts";
import { pathToString, type Path, type Step } from "./alpha.ts";
import { substTop, DApp, DLam, type DTerm } from "./debruijn.ts";

// ── contexts: a term with exactly one hole ─────────────────────────────────────
export type Ctx =
  | { readonly kind: "hole" }
  | { readonly kind: "appL"; readonly ctx: Ctx; readonly arg: Term }     // C N     (the hole is in the function)
  | { readonly kind: "appR"; readonly fn: Term; readonly ctx: Ctx }      // M C     (the hole is in the argument)
  | { readonly kind: "lam"; readonly param: string; readonly ctx: Ctx }; // λx. C   (the hole is under a binder)

export const HOLE: Ctx = { kind: "hole" };

// Split t at path into (context, focus) with plug(context, focus) === t.
export function decompose(t: Term, path: Path): { ctx: Ctx; focus: Term } {
  if (path.length === 0) return { ctx: HOLE, focus: t };
  const [step, ...rest] = path;
  if (step === "fn" && t.kind === "app") { const d = decompose(t.fn, rest); return { ctx: { kind: "appL", ctx: d.ctx, arg: t.arg }, focus: d.focus }; }
  if (step === "arg" && t.kind === "app") { const d = decompose(t.arg, rest); return { ctx: { kind: "appR", fn: t.fn, ctx: d.ctx }, focus: d.focus }; }
  if (step === "body" && t.kind === "lam") { const d = decompose(t.body, rest); return { ctx: { kind: "lam", param: t.param, ctx: d.ctx }, focus: d.focus }; }
  throw new Error(`path ${pathToString(path)} does not exist in ${print(t)}`);
}

// Fill the hole. NOTE: plugging is NOT capture-avoiding, and must not be — a context's binders
// are SUPPOSED to capture: in λx. □, plugging x gives λx. x. That is exactly how a redex under
// a λ sees that λ's variable.
export function plug(c: Ctx, t: Term): Term {
  switch (c.kind) {
    case "hole": return t;
    case "appL": return App(plug(c.ctx, t), c.arg);
    case "appR": return App(c.fn, plug(c.ctx, t));
    case "lam": return Lam(c.param, plug(c.ctx, t));
  }
}

// The congruence rules a step at this path uses, from the outside in, ending with the axiom.
export function ruleChain(c: Ctx, kind: RedexKind = "beta"): string[] {
  const out: string[] = [];
  for (let u = c; u.kind !== "hole"; u = u.ctx) out.push(u.kind === "appL" ? "app-L" : u.kind === "appR" ? "app-R" : "ξ");
  out.push(kind === "beta" ? "β" : "η");
  return out;
}

export function printCtx(c: Ctx): string {
  // Plug a placeholder name, print, then draw the hole. "__" is a legal identifier the parser never produces from λ-text you'd write.
  return print(plug(c, Var("__"))).replace(/\b__\b/, "□");
}

// ── contraction: the rule itself, at the root of a redex ───────────────────────
export function contract(r: Term, log?: SubstLog): Term {
  if (isBetaRedex(r) && r.kind === "app" && r.fn.kind === "lam") return subst(r.fn.body, r.fn.param, r.arg, log);
  if (isEtaRedex(r) && r.kind === "lam" && r.body.kind === "app") return r.body.fn;
  throw new Error(`${print(r)} is not a redex`);
}

export interface StepResult {
  readonly path: Path;
  readonly kind: RedexKind;
  readonly ctx: Ctx;
  readonly redex: Term;
  readonly contractum: Term;
  readonly reduct: Term;            // the whole new term: plug(ctx, contractum)
  readonly renames: SubstLog["renames"];
}

// One step at a given path: decompose, contract, plug.
export function stepAt(t: Term, path: Path, kind?: RedexKind): StepResult {
  const { ctx, focus } = decompose(t, path);
  if (!kind && !isBetaRedex(focus) && !isEtaRedex(focus)) throw new Error(`no redex at ${pathToString(path)}: ${print(focus)}`);
  const k: RedexKind = kind ?? (isBetaRedex(focus) ? "beta" : "eta");
  if (k === "beta" && !isBetaRedex(focus)) throw new Error(`no β-redex at ${pathToString(path)}: ${print(focus)}`);
  if (k === "eta" && !isEtaRedex(focus)) throw new Error(`no η-redex at ${pathToString(path)}: ${print(focus)}`);
  const log: SubstLog = { renames: [] };
  const contractum = contract(focus, log);
  return { path, kind: k, ctx, redex: focus, contractum, reduct: plug(ctx, contractum), renames: log.renames };
}

// The one-step reduction relation from t: every term reachable in exactly one step.
export function oneStepReducts(t: Term, kinds: readonly RedexKind[] = ["beta"]): StepResult[] {
  return findRedexes(t, kinds).map(r => stepAt(t, r.path, r.kind));
}

// ── the same step on nameless terms (for cross-checking) ──────────────────────
export function stepAtDB(d: DTerm, path: Path): DTerm {
  if (path.length === 0) {
    if (d.kind === "app" && d.fn.kind === "lam") return substTop(d.fn.body, d.arg);
    throw new Error("no β-redex here");
  }
  const [step, ...rest]: readonly Step[] = path;
  if (step === "fn" && d.kind === "app") return DApp(stepAtDB(d.fn, rest), d.arg);
  if (step === "arg" && d.kind === "app") return DApp(d.fn, stepAtDB(d.arg, rest));
  if (step === "body" && d.kind === "lam") return DLam(stepAtDB(d.body, rest), d.hint);
  throw new Error("path does not exist");
}
