// subst.ts — M[x := N]: replace the free occurrences of x in M with the term N.
//
// Substitution is the engine of computation: β-reduction (Module 8) is
//   (λx. M) N  →  M[x := N]
// so getting it wrong silently changes what programs compute.
//
// Two versions live here on purpose:
//   substNaive    the obvious recursion. It respects shadowing, but can CAPTURE free variables of N.
//   subst         Curry's capture-avoiding definition: rename an obstructing binder to a fresh name first.

import { App, Lam, Var, type Term } from "./term.ts";
import { freeVars } from "./alpha.ts";

// A name based on `base` that is not in `avoid`: x → x1, x2, …; x1 → x2, …; f' → f'1, …
// Trailing digits are replaced rather than appended, so repeated freshening stays short.
export function freshName(base: string, avoid: Set<string>): string {
  if (!avoid.has(base)) return base;
  const stem = base.replace(/\d+$/, "");
  for (let i = 1; ; i++) {
    const candidate = `${stem}${i}`;
    if (!avoid.has(candidate)) return candidate;
  }
}

// ── the wrong one (kept for demonstration and tests) ──────────────────────────
export function substNaive(m: Term, x: string, n: Term): Term {
  switch (m.kind) {
    case "var": return m.name === x ? n : m;
    case "app": return App(substNaive(m.fn, x, n), substNaive(m.arg, x, n));
    case "lam":
      if (m.param === x) return m;                          // x is shadowed: nothing to replace below
      return Lam(m.param, substNaive(m.body, x, n));        // BUG: if m.param is free in n, it gets captured
  }
}

// ── the right one ──────────────────────────────────────────────────────────────
//
//   x[x := N]      = N
//   y[x := N]      = y                                   (y ≠ x)
//   (P Q)[x := N]  = P[x := N] Q[x := N]
//   (λx. P)[x := N] = λx. P                               (x is shadowed)
//   (λy. P)[x := N] = λy. P[x := N]                       if y ∉ FV(N) or x ∉ FV(P)
//   (λy. P)[x := N] = λz. P[y := z][x := N]               otherwise, z fresh
//
// The last line is the whole trick: before pushing N under λy, if N mentions a free y
// (which λy would capture), rename the binder to a name nobody is using.

export interface SubstLog {
  renames: { from: string; to: string }[];   // every binder renamed to avoid capture, in order
}

export function subst(m: Term, x: string, n: Term, log?: SubstLog): Term {
  const fvN = freeVars(n);
  function go(m: Term): Term {
    switch (m.kind) {
      case "var": return m.name === x ? n : m;
      case "app": {
        const fn = go(m.fn), arg = go(m.arg);
        return fn === m.fn && arg === m.arg ? m : App(fn, arg);   // share unchanged subtrees
      }
      case "lam": {
        if (m.param === x) return m;
        const fvBody = freeVars(m.body);
        if (!fvBody.has(x)) return m;                             // nothing to substitute below: share
        if (!fvN.has(m.param)) return Lam(m.param, go(m.body));   // no capture possible
        // Capture danger: rename the binder to z, which is free in neither N nor the body, and isn't x.
        const avoid = new Set([...fvN, ...fvBody, x]);
        const z = freshName(m.param, avoid);
        log?.renames.push({ from: m.param, to: z });
        return Lam(z, go(subst(m.body, m.param, Var(z), log)));
      }
    }
  }
  return go(m);
}
