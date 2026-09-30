// parser.ts — tokens in, tree out. A recursive-descent parser: one function per grammar rule.
//
// The concrete grammar (P4.3), with both textbook conventions built in:
//
//   term  ::= item+                       a row of items, applied left to right: a b c = (a b) c
//   item  ::= atom
//           | "λ" IDENT+ "." term          a λ swallows everything to its right, so it can only be
//                                          the LAST item of a row: f λx. x g = f (λx. x g)
//   atom  ::= IDENT | "(" term ")"
//
// `λx y z. M` is shorthand for `λx. λy. λz. M` (one binder per λ node, Module 1).

import { App, Lam, Var, type Term } from "./term.ts";
import { tokenize, type Pos, type Token, type TokenKind } from "./lexer.ts";

export interface ParseError {
  readonly message: string;
  readonly start: Pos;
  readonly end: Pos;
}

export interface ParseResult {
  readonly term: Term | null;        // null exactly when errors is non-empty
  readonly errors: ParseError[];     // lexical errors, or the first syntax error
  readonly trace: string[];          // rule-by-rule log, filled only when { trace: true }
}

export interface ParseOptions {
  trace?: boolean;
}

// Thrown internally to unwind the recursion on the first syntax error; never escapes parse().
class SyntaxErrorSignal {
  readonly error: ParseError;
  constructor(error: ParseError) { this.error = error; }
}

const DESCRIBE: Record<TokenKind, string> = {
  lambda: "'λ'", dot: "'.'", lparen: "'('", rparen: "')'", ident: "a name", equals: "'='", eof: "end of input",
};
const describe = (t: Token) => (t.kind === "ident" ? `name '${t.text}'` : DESCRIBE[t.kind]);
const at = (p: Pos) => `${p.line}:${p.col}`;

export function parse(src: string, opts: ParseOptions = {}): ParseResult {
  const lexed = tokenize(src);
  const trace: string[] = [];
  if (lexed.errors.length > 0) return { term: null, errors: lexed.errors, trace };

  const toks = lexed.tokens;
  let i = 0;
  let depth = 0;
  const peek = () => toks[i];
  const next = () => toks[i++];
  const fail = (message: string, tok: Token = peek()): never => {
    throw new SyntaxErrorSignal({ message, start: tok.start, end: tok.kind === "eof" ? tok.start : tok.end });
  };
  const expect = (kind: TokenKind, what: string): Token => {
    if (peek().kind !== kind) fail(`expected ${DESCRIBE[kind]} ${what}, found ${describe(peek())}`);
    return next();
  };
  // Wraps a rule so that, when tracing, entering it logs one indented line.
  const rule = <T>(name: string, body: () => T): T => {
    if (opts.trace) trace.push(`${"  ".repeat(depth)}${name}  @${at(peek().start)}  next: ${describe(peek())}`);
    depth++;
    try { return body(); } finally { depth--; }
  };

  const startsItem = (k: TokenKind) => k === "ident" || k === "lparen" || k === "lambda";

  // term ::= item+   — fold the row to the left.
  function parseTerm(): Term {
    return rule("term", () => {
      if (!startsItem(peek().kind)) fail(`expected a term, found ${describe(peek())}`);
      let acc = parseItem();
      // A λ item consumes the rest of the row, so after one, startsItem is false and we stop.
      while (startsItem(peek().kind)) acc = App(acc, parseItem());
      return acc;
    });
  }

  function parseItem(): Term {
    return peek().kind === "lambda" ? parseLambda() : parseAtom();
  }

  // "λ" IDENT+ "." term
  function parseLambda(): Term {
    return rule("lambda", () => {
      next(); // λ
      const params: string[] = [];
      if (peek().kind !== "ident") fail(`expected a parameter name after 'λ', found ${describe(peek())}`);
      while (peek().kind === "ident") params.push(next().text);
      expect("dot", `after the parameter${params.length > 1 ? "s" : ""} of 'λ${params.join(" ")}'`);
      const body = parseTerm();
      return params.reduceRight<Term>((b, p) => Lam(p, b), body);
    });
  }

  // IDENT | "(" term ")"
  function parseAtom(): Term {
    return rule("atom", () => {
      const t = peek();
      if (t.kind === "ident") { next(); return Var(t.text); }
      if (t.kind === "lparen") {
        next();
        const inner = parseTerm();
        if (peek().kind !== "rparen") fail(`expected ')' to close the '(' at ${at(t.start)}, found ${describe(peek())}`);
        next();
        return inner;
      }
      return fail(`expected a name or '(', found ${describe(t)}`);
    });
  }

  try {
    const term = parseTerm();
    if (peek().kind !== "eof") fail(`unexpected ${describe(peek())} after a complete term`);
    return { term, errors: [], trace };
  } catch (e) {
    if (e instanceof SyntaxErrorSignal) return { term: null, errors: [e.error], trace };
    throw e;
  }
}

// For code (tests, later modules, demos) that knows its input is valid: return the term or throw.
export function parseOrThrow(src: string): Term {
  const r = parse(src);
  if (!r.term) {
    const e = r.errors[0];
    throw new Error(`parse error at ${at(e.start)}: ${e.message}\n  in: ${src}`);
  }
  return r.term;
}
