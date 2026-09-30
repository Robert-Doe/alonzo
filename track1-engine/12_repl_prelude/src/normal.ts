// normal.ts — the zoo of "finished" terms, and η as a full reduction rule.
//
// "Done" depends on who's asking. From strictest to loosest:
//
//   βη-normal form   no β-redex and no η-redex anywhere                       f
//   β-normal form    no β-redex anywhere                                       λx. f x
//   head normal form (HNF)   λx1…xn. y M1 … Mk — a VARIABLE at the head        x ((λa. a) b)
//   weak head normal form (WHNF)   a λ, or y M1 … Mk (head variable)           λx. (λy. y) x
//   value (call-by-value)    a λ or a variable                                λx. (λy. y) x,  x
//
// Each form contains the ones above it: βη-NF ⊆ β-NF ⊆ HNF ⊆ WHNF, and values ⊆ WHNF.
// η (λx. M x → M when x ∉ FV(M)) is EXTENSIONALITY (P1.1): a function that only forwards its
// argument to M behaves exactly like M.

import type { Term } from "./term.ts";
import { App, Lam, Var } from "./term.ts";
import { freeVars } from "./alpha.ts";
import { freshName } from "./subst.ts";
import { findRedexes, headRedex, weakHeadRedex, isBetaNormal, leftmostOutermost } from "./redex.ts";
import { run, normalOrder, callByName, headReduction, isValue, type Strategy, type RunResult, type RunOptions } from "./strategy.ts";

// ── the five predicates ────────────────────────────────────────────────────────
export const isBetaEtaNormal = (t: Term): boolean => findRedexes(t, ["beta", "eta"]).length === 0;
export { isBetaNormal, isValue };
export const isHNF = (t: Term): boolean => headRedex(t) === null;
export const isWHNF = (t: Term): boolean => weakHeadRedex(t) === null;

// A NEUTRAL term is stuck forever at its head: a variable applied to arguments (y M1 … Mk, k ≥ 0).
export function isNeutral(t: Term): boolean {
  let u = t;
  while (u.kind === "app") u = u.fn;
  return u.kind === "var";
}

export interface FormReport {
  readonly betaEtaNormal: boolean;
  readonly betaNormal: boolean;
  readonly hnf: boolean;
  readonly whnf: boolean;
  readonly value: boolean;
  readonly neutral: boolean;
}

export function classifyForms(t: Term): FormReport {
  return { betaEtaNormal: isBetaEtaNormal(t), betaNormal: isBetaNormal(t), hnf: isHNF(t), whnf: isWHNF(t), value: isValue(t), neutral: isNeutral(t) };
}

// ── η in both directions ───────────────────────────────────────────────────────
// η-expansion: M ↦ λx. M x with x fresh (not free in M). Always meaning-preserving for functions.
export function etaExpand(t: Term, base = "x"): Term {
  const x = freshName(base, freeVars(t));
  return Lam(x, App(t, Var(x)));
}

// ── normalizers: run the right strategy to the right form ──────────────────────
// βη normal order: leftmost-outermost redex of EITHER kind.
export const normalOrderBetaEta: Strategy = { name: "normal order (βη)", short: "normal-eta", pick: t => leftmostOutermost(t, ["beta", "eta"]) };

export const toWHNF = (t: Term, o?: RunOptions): RunResult => run(t, callByName, o);
export const toHNF = (t: Term, o?: RunOptions): RunResult => run(t, headReduction, o);
export const toBetaNF = (t: Term, o?: RunOptions): RunResult => run(t, normalOrder, o);
export const toBetaEtaNF = (t: Term, o?: RunOptions): RunResult => run(t, normalOrderBetaEta, o);
