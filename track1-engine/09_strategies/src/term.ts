// term.ts — the λ-term abstract syntax tree.
//
// The whole λ-calculus has exactly three kinds of term:
//
//   M, N ::= x        variable      { kind: "var", name }
//          | λx. M    abstraction   { kind: "lam", param, body }
//          | M N      application   { kind: "app", fn, arg }
//
// Terms are immutable. Every later module builds new trees instead of editing old ones,
// which is also what makes it safe for two trees to share a subtree.

export type Term =
  | { readonly kind: "var"; readonly name: string }
  | { readonly kind: "lam"; readonly param: string; readonly body: Term }
  | { readonly kind: "app"; readonly fn: Term; readonly arg: Term };

// A variable name: a letter or underscore, then letters, digits, underscores or primes (x, x1, f', acc_2).
// The printer relies on this. A name can never contain a space, '.', '(', ')' or 'λ',
// so printing never produces text that reads as something else.
const IDENT = /^[A-Za-z_][A-Za-z0-9_']*$/;

export function isIdent(name: string): boolean {
  return IDENT.test(name);
}

function checkName(name: string, role: string): void {
  if (!isIdent(name)) throw new Error(`invalid ${role} name ${JSON.stringify(name)}`);
}

// ── constructors ──────────────────────────────────────────────────────────────

export function Var(name: string): Term {
  checkName(name, "variable");
  return { kind: "var", name };
}

export function Lam(param: string, body: Term): Term {
  checkName(param, "parameter");
  return { kind: "lam", param, body };
}

export function App(fn: Term, arg: Term): Term {
  return { kind: "app", fn, arg };
}

// apps(f, a, b, c) = ((f a) b) c. Application groups from the left (currying, P1.4).
export function apps(head: Term, ...args: Term[]): Term {
  return args.reduce<Term>((acc, a) => App(acc, a), head);
}

// lams(["x", "y"], M) = λx. λy. M. Each λ binds one name; nesting to the right.
export function lams(params: string[], body: Term): Term {
  return params.reduceRight<Term>((acc, p) => Lam(p, acc), body);
}

// ── measurements (one case per node kind: the pattern every module reuses) ────

export function size(t: Term): number {
  switch (t.kind) {
    case "var": return 1;
    case "lam": return 1 + size(t.body);
    case "app": return 1 + size(t.fn) + size(t.arg);
  }
}

// Depth counts nodes on the longest root-to-leaf path. A lone variable has depth 1.
export function depth(t: Term): number {
  switch (t.kind) {
    case "var": return 1;
    case "lam": return 1 + depth(t.body);
    case "app": return 1 + Math.max(depth(t.fn), depth(t.arg));
  }
}

export interface Counts { vars: number; lams: number; apps: number }

export function counts(t: Term): Counts {
  switch (t.kind) {
    case "var": return { vars: 1, lams: 0, apps: 0 };
    case "lam": {
      const b = counts(t.body);
      return { vars: b.vars, lams: b.lams + 1, apps: b.apps };
    }
    case "app": {
      const f = counts(t.fn), a = counts(t.arg);
      return { vars: f.vars + a.vars, lams: f.lams + a.lams, apps: f.apps + a.apps + 1 };
    }
  }
}

// Syntactic equality: same shape AND same names everywhere, bound names included.
// λx.x and λy.y are NOT equal here. Module 4 adds α-equivalence, which ignores bound names.
export function equalSyntax(a: Term, b: Term): boolean {
  if (a === b) return true;
  switch (a.kind) {
    case "var": return b.kind === "var" && a.name === b.name;
    case "lam": return b.kind === "lam" && a.param === b.param && equalSyntax(a.body, b.body);
    case "app": return b.kind === "app" && equalSyntax(a.fn, b.fn) && equalSyntax(a.arg, b.arg);
  }
}
