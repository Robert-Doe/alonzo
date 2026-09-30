// alpha.ts — names and what they refer to.
//
// This is the first module about MEANING rather than syntax:
//   freeVars      which names in a term refer to something outside it
//   occurrences   for each variable use: is it free, or which λ binds it?
//   alphaEquivalent   "same term up to renaming bound variables" (λx.x ≡ λy.y)
//   renameBinder  α-conversion of one λ, refusing any rename that would change the meaning
//   canonicalize  rename every binder to a fixed scheme, giving a second, independent α-test

import { App, Lam, Var, type Term } from "./term.ts";

// A path is the route from the root to a node: which child to take at each step.
// fn/arg are the two children of an application; body is the one child of an abstraction.
// The root's path is []. Module 7 uses paths to name redexes.
export type Step = "fn" | "arg" | "body";
export type Path = readonly Step[];

export const pathToString = (p: Path): string => (p.length === 0 ? "ε" : p.join("."));

// ── free and bound variables ───────────────────────────────────────────────────
//
//   FV(x)     = { x }
//   FV(λx. M) = FV(M) − { x }
//   FV(M N)   = FV(M) ∪ FV(N)

export function freeVars(t: Term): Set<string> {
  switch (t.kind) {
    case "var": return new Set([t.name]);
    case "lam": {
      const s = freeVars(t.body);
      s.delete(t.param);
      return s;
    }
    case "app": {
      const s = freeVars(t.fn);
      for (const v of freeVars(t.arg)) s.add(v);
      return s;
    }
  }
}

// Names that appear as a binder (the x in λx) anywhere in the term.
export function binderNames(t: Term): Set<string> {
  const out = new Set<string>();
  (function go(u: Term): void {
    if (u.kind === "lam") { out.add(u.param); go(u.body); }
    else if (u.kind === "app") { go(u.fn); go(u.arg); }
  })(t);
  return out;
}

export const isClosed = (t: Term): boolean => freeVars(t).size === 0;

export const sorted = (s: Set<string>): string[] => [...s].sort();

// ── every occurrence, with its binding site ───────────────────────────────────

export interface Occurrence {
  readonly name: string;
  readonly path: Path;               // where this use of the name is
  readonly binder: Path | null;      // path of the λ that binds it, or null if free
}

export function occurrences(t: Term): Occurrence[] {
  const out: Occurrence[] = [];
  // scope: innermost binder last. Looking up from the end finds the NEAREST enclosing λ (shadowing, P2.3).
  function go(u: Term, path: Step[], scope: { name: string; at: Path }[]): void {
    switch (u.kind) {
      case "var": {
        let binder: Path | null = null;
        for (let i = scope.length - 1; i >= 0; i--) if (scope[i].name === u.name) { binder = scope[i].at; break; }
        out.push({ name: u.name, path: [...path], binder });
        return;
      }
      case "lam":
        go(u.body, [...path, "body"], [...scope, { name: u.param, at: [...path] }]);
        return;
      case "app":
        go(u.fn, [...path, "fn"], scope);
        go(u.arg, [...path, "arg"], scope);
        return;
    }
  }
  go(t, [], []);
  return out;
}

// ── α-equivalence ──────────────────────────────────────────────────────────────
//
// Walk both trees together, keeping a stack of binder names for each side. A variable on
// each side is looked up by position: "how many binders out is my λ?" Two bound variables
// match if they point the same distance out; two free variables match if they have the same
// name. (That distance is exactly the de Bruijn index of Module 6.)

export function alphaEquivalent(a: Term, b: Term): boolean {
  function distance(name: string, scope: string[]): number {
    for (let i = scope.length - 1; i >= 0; i--) if (scope[i] === name) return scope.length - 1 - i;
    return -1; // free
  }
  function go(a: Term, b: Term, sa: string[], sb: string[]): boolean {
    switch (a.kind) {
      case "var": {
        if (b.kind !== "var") return false;
        const da = distance(a.name, sa), db = distance(b.name, sb);
        return da === db && (da !== -1 || a.name === b.name);
      }
      case "lam":
        return b.kind === "lam" && go(a.body, b.body, [...sa, a.param], [...sb, b.param]);
      case "app":
        return b.kind === "app" && go(a.fn, b.fn, sa, sb) && go(a.arg, b.arg, sa, sb);
    }
  }
  return go(a, b, [], []);
}

// ── α-conversion of a single binder ───────────────────────────────────────────
//
// λx. M  →α  λy. M{x ↦ y}   is allowed only if it cannot change which λ any occurrence refers to:
//   (1) y is not free in M        — else that outside y would be captured by the new λy
//   (2) no free x in M sits under an inner λy — else the renamed x would be captured by that λy

export type RenameResult =
  | { readonly ok: true; readonly term: Term }
  | { readonly ok: false; readonly reason: string };

export function renameBinder(t: Term, newName: string): RenameResult {
  if (t.kind !== "lam") return { ok: false, reason: "only an abstraction λx. M has a binder to rename" };
  const x = t.param, y = newName;
  if (x === y) return { ok: true, term: t };
  if (freeVars(t.body).has(y)) {
    return { ok: false, reason: `'${y}' is free in the body, so the new λ${y} would capture it` };
  }
  // Rename free occurrences of x in the body to y, watching for an inner λy above one of them.
  let captured = false;
  function go(u: Term, underY: boolean): Term {
    switch (u.kind) {
      case "var":
        if (u.name !== x) return u;
        if (underY) captured = true;
        return Var(y);
      case "lam":
        if (u.param === x) return u;             // x is shadowed below here: those x's aren't ours
        return Lam(u.param, go(u.body, underY || u.param === y));
      case "app":
        return App(go(u.fn, underY), go(u.arg, underY));
    }
  }
  const body = go(t.body, false);
  if (captured) {
    return { ok: false, reason: `an occurrence of ${x} inside an inner λ${y} would become '${y}' and be captured by that inner λ${y}` };
  }
  return { ok: true, term: Lam(y, body) };
}

// ── canonical form: an independent route to α-equivalence ─────────────────────
//
// Rename every binder, in pre-order, to v0, v1, v2, ... (skipping any name that is free in the
// term). All binders become distinct from each other and from the free variables, which is
// Barendregt's variable convention. Two terms are α-equivalent exactly when their canonical
// forms are syntactically identical.

export function canonicalize(t: Term): Term {
  const free = freeVars(t);
  let n = 0;
  const fresh = (): string => {
    let name: string;
    do { name = `v${n++}`; } while (free.has(name));
    return name;
  };
  function go(u: Term, env: Map<string, string>): Term {
    switch (u.kind) {
      case "var": return Var(env.get(u.name) ?? u.name);
      case "lam": {
        const v = fresh();
        const inner = new Map(env);
        inner.set(u.param, v);
        return Lam(v, go(u.body, inner));
      }
      case "app": {
        const fn = go(u.fn, env);           // pre-order: number the function side first
        return App(fn, go(u.arg, env));
      }
    }
  }
  return go(t, new Map());
}
