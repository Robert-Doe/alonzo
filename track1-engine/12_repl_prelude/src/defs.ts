// defs.ts — named definitions as MACROS.
//
//   I = λx. x
//   K = λx y. x
//   S K K a            ← evaluated after expansion to (λx y z. x z (y z)) (λx y. x) (λx y. x) a
//
// A definition is not a new feature of the calculus. Before evaluation, every defined name is replaced by its
// (already expanded) body. That's the whole mechanism, and it is why definitions add NO power: anything
// you compute with them, you could compute by writing the expansion out by hand. Consequence: a definition
// may not mention itself. `fact = λn. … fact …` would expand forever. Recursion needs a fixed-point
// combinator instead (Module 15).

import { App, Lam, Var, isIdent, type Term } from "./term.ts";
import { freeVars } from "./alpha.ts";
import { freshName } from "./subst.ts";
import { parse, type ParseError } from "./parser.ts";
import { tokenize } from "./lexer.ts";

export interface Definition {
  readonly name: string;
  readonly source: Term;     // as written
  readonly body: Term;       // fully expanded (no defined names left free, except ones defined LATER — see below)
}

export type Defs = ReadonlyMap<string, Definition>;

// ── simultaneous, capture-avoiding substitution ───────────────────────────────
// Replace every free occurrence of each key of `map` at once. Bodies inserted are NOT themselves re-scanned,
// so a body's free names can never be expanded twice or captured by a later substitution.
export function substMany(t: Term, map: ReadonlyMap<string, Term>): Term {
  if (map.size === 0) return t;
  switch (t.kind) {
    case "var": return map.get(t.name) ?? t;
    case "app": return App(substMany(t.fn, map), substMany(t.arg, map));
    case "lam": {
      const inner = new Map(map);
      inner.delete(t.param);                                  // shadowed below this binder
      if (inner.size === 0) return t;
      // Would inserting any replacement under λparam capture one of its free variables?
      const fvBody = freeVars(t.body);
      const danger = [...inner].some(([name, rep]) => fvBody.has(name) && freeVars(rep).has(t.param));
      if (!danger) return Lam(t.param, substMany(t.body, inner));
      const avoid = new Set([...fvBody, ...[...inner.values()].flatMap(r => [...freeVars(r)]), ...inner.keys()]);
      const z = freshName(t.param, avoid);
      const renamedBody = substMany(t.body, new Map([[t.param, Var(z)]]));
      return Lam(z, substMany(renamedBody, inner));
    }
  }
}

// Expand every defined name that occurs free in t.
export function expand(t: Term, defs: Defs): Term {
  const used = new Map<string, Term>();
  for (const v of freeVars(t)) { const d = defs.get(v); if (d) used.set(v, d.body); }
  return substMany(t, used);
}

// ── adding a definition ────────────────────────────────────────────────────────
export type DefineResult =
  | { readonly ok: true; readonly defs: Defs; readonly warning?: string }
  | { readonly ok: false; readonly error: string };

export function define(defs: Defs, name: string, source: Term): DefineResult {
  if (!isIdent(name)) return { ok: false, error: `'${name}' is not a valid name` };
  if (freeVars(source).has(name)) {
    return { ok: false, error: `'${name}' mentions itself. Definitions are macros, so this would expand forever. Use a fixed-point combinator for recursion (Module 15).` };
  }
  const body = expand(source, defs);
  const next = new Map(defs);
  const warning = defs.has(name) ? `redefined '${name}' (terms already defined keep the OLD meaning: they were expanded when defined)` : undefined;
  next.set(name, { name, source, body });
  return warning ? { ok: true, defs: next, warning } : { ok: true, defs: next };
}

// ── reading a program: definitions and expressions, one per line ──────────────
// A line starting with whitespace continues the previous statement, so long definitions can wrap.
// `--` comments work as in Module 2.
export type Statement =
  | { readonly kind: "def"; readonly name: string; readonly term: Term; readonly line: number }
  | { readonly kind: "expr"; readonly term: Term; readonly line: number }
  | { readonly kind: "command"; readonly text: string; readonly line: number }
  | { readonly kind: "error"; readonly message: string; readonly line: number; readonly text: string };

export function splitStatements(src: string): { text: string; line: number }[] {
  const out: { text: string; line: number }[] = [];
  src.split(/\r?\n/).forEach((raw, i) => {
    const noComment = raw.replace(/--.*$/, "");
    if (noComment.trim() === "") return;
    if (/^\s/.test(raw) && out.length > 0 && !out[out.length - 1].text.startsWith(":")) out[out.length - 1].text += " " + noComment.trim();
    else out.push({ text: noComment.trim(), line: i + 1 });
  });
  return out;
}

export function parseStatement(text: string, line = 1): Statement {
  if (text.startsWith(":")) return { kind: "command", text, line };
  const toks = tokenize(text).tokens;
  if (toks.length >= 2 && toks[0].kind === "ident" && toks[1].kind === "equals") {
    const rest = text.slice(toks[1].end.offset);
    const r = parse(rest);
    if (!r.term) return { kind: "error", message: describeError(r.errors[0], toks[1].end.offset), line, text };
    return { kind: "def", name: toks[0].text, term: r.term, line };
  }
  const r = parse(text);
  if (!r.term) return { kind: "error", message: describeError(r.errors[0], 0), line, text };
  return { kind: "expr", term: r.term, line };
}

function describeError(e: ParseError, shift: number): string {
  return `column ${e.start.col + shift}: ${e.message}`;
}

// Load a whole file of definitions (a prelude). Expressions in it are ignored; errors are collected.
export function loadDefinitions(src: string, defs: Defs = new Map()): { defs: Defs; errors: string[]; warnings: string[]; count: number } {
  let cur = defs;
  const errors: string[] = [], warnings: string[] = [];
  let count = 0;
  for (const { text, line } of splitStatements(src)) {
    const st = parseStatement(text, line);
    if (st.kind === "error") errors.push(`line ${line}: ${st.message}`);
    else if (st.kind === "def") {
      const r = define(cur, st.name, st.term);
      if (!r.ok) errors.push(`line ${line}: ${r.error}`);
      else { cur = r.defs; count++; if (r.warning) warnings.push(`line ${line}: ${r.warning}`); }
    }
  }
  return { defs: cur, errors, warnings, count };
}
