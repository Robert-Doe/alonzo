// print.ts — turning a tree back into text.
//
// The textbook conventions (P4.3) decide where parentheses are REQUIRED:
//   (1) application is left-associative:  f a b  means (f a) b
//   (2) a λ-body extends as far right as possible:  λx. x y  means λx. (x y)
//
// print() emits a parenthesis only when leaving it out would make those conventions
// read the text as a different tree. printFull() puts parentheses around every compound
// node. It is noisy but impossible to misread, which makes it useful for teaching and debugging.

import type { Term } from "./term.ts";

export interface PrintOptions {
  // "λ" for display. "\\" for plain ASCII (terminals, files, the parser's alternative spelling).
  lambda?: "λ" | "\\";
}

export function print(t: Term, opts: PrintOptions = {}): string {
  const L = opts.lambda ?? "λ";

  // `trailing` is true when nothing follows this term before the enclosing ')' or the end
  // of the text. Only a λ cares: its body would swallow anything that follows it.
  function go(t: Term, trailing: boolean): string {
    switch (t.kind) {
      case "var":
        return t.name;
      case "lam": {
        const s = `${L}${t.param}. ${go(t.body, true)}`;
        return trailing ? s : `(${s})`;
      }
      case "app": {
        // Function position: something (the argument) always follows, so trailing = false.
        // An application here needs no parens (convention 1), but a λ does (convention 2).
        const fn = go(t.fn, false);
        // Argument position: an application needs parens, otherwise convention 1 would
        // regroup `f (g x)` as `(f g) x`. A λ needs parens only if something follows.
        const arg = t.arg.kind === "app" ? `(${go(t.arg, true)})` : go(t.arg, trailing);
        return `${fn} ${arg}`;
      }
    }
  }
  return go(t, true);
}

export function printFull(t: Term, opts: PrintOptions = {}): string {
  const L = opts.lambda ?? "λ";
  switch (t.kind) {
    case "var": return t.name;
    case "lam": return `(${L}${t.param}. ${printFull(t.body, opts)})`;
    case "app": return `(${printFull(t.fn, opts)} ${printFull(t.arg, opts)})`;
  }
}

// show() prints the constructor calls that would rebuild the tree: the exact data, no notation.
export function show(t: Term): string {
  switch (t.kind) {
    case "var": return `Var(${JSON.stringify(t.name)})`;
    case "lam": return `Lam(${JSON.stringify(t.param)}, ${show(t.body)})`;
    case "app": return `App(${show(t.fn)}, ${show(t.arg)})`;
  }
}
