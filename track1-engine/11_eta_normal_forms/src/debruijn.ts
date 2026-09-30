// debruijn.ts — nameless terms (N. G. de Bruijn, 1972).
//
// Replace every variable by a NUMBER: how many λs you must cross, going outward, to reach its
// binder. The binder itself no longer needs a name.
//
//   λx. x            →  λ. 0
//   λx. λy. x        →  λ. λ. 1
//   λx. λy. x (λz. z x)  →  λ. λ. 1 (λ. 0 2)     ← the same x is 1 in one place and 2 in another
//
// Free variables are numbered past the binders using a naming context Γ (a list of names):
// under d binders, the free variable Γ[i] has index d + i. This is the scheme of Pierce, TAPL ch. 6.
//
// Payoff: α-equivalent terms become IDENTICAL trees, and substitution never needs fresh names.
// Price: substitution must SHIFT indices when a term moves under or out from binders.

import { App, Lam, Var, type Term } from "./term.ts";
import { freeVars, sorted } from "./alpha.ts";
import { freshName } from "./subst.ts";

export type DTerm =
  | { readonly kind: "var"; readonly index: number }
  | { readonly kind: "lam"; readonly body: DTerm; readonly hint: string }   // hint: original name, display only
  | { readonly kind: "app"; readonly fn: DTerm; readonly arg: DTerm };

export const DVar = (index: number): DTerm => ({ kind: "var", index });
export const DLam = (body: DTerm, hint = "x"): DTerm => ({ kind: "lam", body, hint });
export const DApp = (fn: DTerm, arg: DTerm): DTerm => ({ kind: "app", fn, arg });

// The default naming context: the term's free variables, alphabetically.
export const defaultContext = (t: Term): string[] => sorted(freeVars(t));

// ── named → nameless ───────────────────────────────────────────────────────────
export function toDeBruijn(t: Term, ctx: string[] = defaultContext(t)): DTerm {
  // scope[0] is the INNERMOST binder, so a bound variable's index is just its position.
  function go(u: Term, scope: string[]): DTerm {
    switch (u.kind) {
      case "var": {
        const i = scope.indexOf(u.name);
        if (i >= 0) return DVar(i);
        const j = ctx.indexOf(u.name);
        if (j < 0) throw new Error(`free variable '${u.name}' is not in the naming context [${ctx.join(", ")}]`);
        return DVar(scope.length + j);
      }
      case "lam": return DLam(go(u.body, [u.param, ...scope]), u.param);
      case "app": return DApp(go(u.fn, scope), go(u.arg, scope));
    }
  }
  return go(t, []);
}

// ── nameless → named ───────────────────────────────────────────────────────────
// Binder names come from the hints, freshened so no binder captures a context name or an outer binder.
export function fromDeBruijn(d: DTerm, ctx: string[] = []): Term {
  function go(u: DTerm, scope: string[]): Term {
    switch (u.kind) {
      case "var":
        if (u.index < scope.length) return Var(scope[u.index]);
        if (u.index - scope.length < ctx.length) return Var(ctx[u.index - scope.length]);
        throw new Error(`index ${u.index} points past every binder and the context`);
      case "lam": {
        const name = freshName(u.hint, new Set([...scope, ...ctx]));
        return Lam(name, go(u.body, [name, ...scope]));
      }
      case "app": return App(go(u.fn, scope), go(u.arg, scope));
    }
  }
  return go(d, []);
}

// ── printing: λ. λ. 1 (λ. 0 2) ────────────────────────────────────────────────
// Same parenthesization rules as print.ts (Module 1), with numbers for variables and bare λ's.
export function printDB(d: DTerm, opts: { hints?: boolean } = {}): string {
  function go(u: DTerm, trailing: boolean): string {
    switch (u.kind) {
      case "var": return String(u.index);
      case "lam": {
        const s = `λ${opts.hints ? u.hint : ""}. ${go(u.body, true)}`;
        return trailing ? s : `(${s})`;
      }
      case "app": {
        const fn = go(u.fn, false);
        const arg = u.arg.kind === "app" ? `(${go(u.arg, true)})` : go(u.arg, trailing);
        return `${fn} ${arg}`;
      }
    }
  }
  return go(d, true);
}

// Plain structural equality. Hints are ignored: they're display-only.
export function equalDB(a: DTerm, b: DTerm): boolean {
  if (a === b) return true;
  switch (a.kind) {
    case "var": return b.kind === "var" && a.index === b.index;
    case "lam": return b.kind === "lam" && equalDB(a.body, b.body);
    case "app": return b.kind === "app" && equalDB(a.fn, b.fn) && equalDB(a.arg, b.arg);
  }
}

// ── shifting and substitution (TAPL §6.2) ──────────────────────────────────────
//
// shift(d, c, t): add d to every index ≥ c in t. The cutoff c counts binders passed:
// indices below c point at binders INSIDE t and must not move.
export function shift(d: number, c: number, t: DTerm): DTerm {
  switch (t.kind) {
    case "var": return t.index >= c ? DVar(t.index + d) : t;
    case "lam": return DLam(shift(d, c + 1, t.body), t.hint);
    case "app": return DApp(shift(d, c, t.fn), shift(d, c, t.arg));
  }
}

// substDB(j, s, t) = t[j := s]. Each time we go under a λ, the target index j and the free
// indices of s both move up by one, because one more binder now sits between them and their
// original meaning.
export function substDB(j: number, s: DTerm, t: DTerm): DTerm {
  switch (t.kind) {
    case "var": return t.index === j ? s : t;
    case "lam": return DLam(substDB(j + 1, shift(1, 0, s), t.body), t.hint);
    case "app": return DApp(substDB(j, s, t.fn), substDB(j, s, t.arg));
  }
}

// The substitution that β-reduction needs: given the BODY of λ. body and an argument s,
// replace index 0 by s, then remove the now-vanished binder (every other free index drops by one).
//   (λ. body) s  →  shift(-1, 0, substDB(0, shift(1, 0, s), body))
export function substTop(body: DTerm, s: DTerm): DTerm {
  return shift(-1, 0, substDB(0, shift(1, 0, s), body));
}

// The classic bug, kept for comparison: forget to shift s when going under a binder.
export function substDBNoShift(j: number, s: DTerm, t: DTerm): DTerm {
  switch (t.kind) {
    case "var": return t.index === j ? s : t;
    case "lam": return DLam(substDBNoShift(j + 1, s, t.body), t.hint);   // BUG: s not shifted
    case "app": return DApp(substDBNoShift(j, s, t.fn), substDBNoShift(j, s, t.arg));
  }
}
export function substTopNoShift(body: DTerm, s: DTerm): DTerm {
  return shift(-1, 0, substDBNoShift(0, shift(1, 0, s), body));
}

// ── reading nameless text back: "λ. λ. 1 (λ. 0 2)" ─────────────────────────────
// Same grammar as Module 3 (term ::= item+; item ::= atom | λ[name]. term; atom ::= NUMBER | (term)),
// with numbers in place of names. An optional name after λ is kept as the display hint.
// Small and self-contained on purpose: Module 2's lexer rejects digits, as the pure named calculus should.
export function parseDB(src: string): DTerm {
  let i = 0;
  const ws = () => { while (i < src.length && /\s/.test(src[i])) i++; };
  const fail = (msg: string): never => { throw new Error(`${msg} at column ${i + 1} in: ${src}`); };
  const startsItem = () => { ws(); return i < src.length && /[0-9(λ\\]/.test(src[i]); };
  function term(): DTerm {
    if (!startsItem()) fail("expected a term");
    let acc = item();
    while (startsItem()) acc = DApp(acc, item());
    return acc;
  }
  function item(): DTerm {
    ws();
    if (src[i] === "λ" || src[i] === "\\") {
      i++; ws();
      const m = /^[A-Za-z_][A-Za-z0-9_']*/.exec(src.slice(i));
      const hint = m ? m[0] : "x";
      if (m) i += m[0].length;
      ws();
      if (src[i] !== ".") fail("expected '.'");
      i++;
      return DLam(term(), hint);
    }
    if (src[i] === "(") {
      i++;
      const inner = term();
      ws();
      if (src[i] !== ")") fail("expected ')'");
      i++;
      return inner;
    }
    const m = /^[0-9]+/.exec(src.slice(i));
    if (!m) return fail("expected an index, '(' or 'λ'");
    i += m[0].length;
    return DVar(Number(m[0]));
  }
  const t = term();
  ws();
  if (i < src.length) fail("unexpected text after a complete term");
  return t;
}
