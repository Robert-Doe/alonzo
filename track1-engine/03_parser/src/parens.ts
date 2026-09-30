// parens.ts — which parentheses in a piece of text actually matter?
//
// For each matched ( ) pair, delete just that pair and re-parse. If the result is still the
// same tree, the pair was redundant. If the tree changes, or the text no longer parses, the
// pair was necessary. This is how we check Module 1's claim that print() emits only
// necessary parentheses: run it on print(t) and expect every pair to be necessary.

import { equalSyntax } from "./term.ts";
import { print } from "./print.ts";
import { parse } from "./parser.ts";
import { tokenize } from "./lexer.ts";

export interface ParenPair {
  readonly open: number;     // string offset of '('
  readonly close: number;    // string offset of the matching ')'
  readonly necessary: boolean;
  readonly without: string;  // the text with this one pair removed
  readonly effect: string;   // human-readable: what removing it does
}

export function analyzeParens(src: string): ParenPair[] | null {
  const original = parse(src).term;
  if (!original) return null;
  // Match pairs from tokens (not raw characters), so parentheses inside comments are ignored.
  const stack: number[] = [];
  const pairs: [number, number][] = [];
  for (const t of tokenize(src).tokens) {
    if (t.kind === "lparen") stack.push(t.start.offset);
    if (t.kind === "rparen") pairs.push([stack.pop()!, t.start.offset]);
  }
  pairs.sort((a, b) => a[0] - b[0]);
  return pairs.map(([open, close]) => {
    const without = src.slice(0, open) + " " + src.slice(open + 1, close) + " " + src.slice(close + 1);
    const r = parse(without);
    const same = r.term !== null && equalSyntax(r.term, original);
    const effect = same ? "removing it gives the same tree"
      : r.term === null ? `removing it breaks parsing (${r.errors[0].message})`
      : `removing it changes the tree to ${print(r.term)}`;
    return { open, close, necessary: !same, without: without.replace(/\s+/g, " ").trim(), effect };
  });
}
