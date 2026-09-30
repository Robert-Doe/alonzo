// spans.ts — print a term AND remember where every sub-term landed in the text.
//
// The Lab (and demo) highlight a redex inside the printed term, which needs "the characters that
// belong to the sub-term at path p". printWithSpans uses exactly the same rules as print() in
// print.ts; the tests check its text is identical to print(t) for thousands of random terms.
// A span excludes any parentheses the printer wrapped around that sub-term.

import type { Term } from "./term.ts";
import { pathToString, type Path, type Step } from "./alpha.ts";

export interface Spanned {
  readonly text: string;
  readonly spans: Map<string, { start: number; end: number }>;   // key: pathToString(path)
}

export function printWithSpans(t: Term, opts: { lambda?: "λ" | "\\" } = {}): Spanned {
  const L = opts.lambda ?? "λ";
  let text = "";
  const spans = new Map<string, { start: number; end: number }>();
  function go(u: Term, trailing: boolean, path: Step[]): void {
    switch (u.kind) {
      case "var": {
        const start = text.length; text += u.name;
        spans.set(pathToString(path), { start, end: text.length });
        return;
      }
      case "lam": {
        if (!trailing) text += "(";
        const start = text.length;
        text += `${L}${u.param}. `;
        go(u.body, true, [...path, "body"]);
        spans.set(pathToString(path), { start, end: text.length });
        if (!trailing) text += ")";
        return;
      }
      case "app": {
        const start = text.length;
        go(u.fn, false, [...path, "fn"]);
        text += " ";
        if (u.arg.kind === "app") { text += "("; go(u.arg, true, [...path, "arg"]); text += ")"; }
        else go(u.arg, trailing, [...path, "arg"]);
        spans.set(pathToString(path), { start, end: text.length });
        return;
      }
    }
  }
  go(t, true, []);
  return { text, spans };
}

export function spanOf(s: Spanned, path: Path): { start: number; end: number } {
  const sp = s.spans.get(pathToString(path));
  if (!sp) throw new Error(`no span for path ${pathToString(path)}`);
  return sp;
}

// "(λx. x x) [(λy. y) z]" — the printed term with one sub-term bracketed. Used by demos and traces.
export function markAt(t: Term, path: Path, open = "[", close = "]"): string {
  const s = printWithSpans(t);
  const { start, end } = spanOf(s, path);
  return s.text.slice(0, start) + open + s.text.slice(start, end) + close + s.text.slice(end);
}
