// lexer.ts — characters in, tokens out.
//
// The λ-calculus needs only five kinds of token (plus an end marker):
//
//   LAMBDA  λ or \        DOT  .        LPAREN  (        RPAREN  )
//   IDENT   x, f', acc_2  (same rule as isIdent in term.ts)
//   EQUALS  =      (Module 12: definitions  name = term)
//   EOF     end of input  (always the last token, so the parser never runs off the end)
//
// Whitespace and comments are skipped. Every token records where it came from, so later
// stages can point at the exact spot of a problem. Bad characters are reported as located
// errors and skipped, and lexing continues, so one typo doesn't hide the next.

export type TokenKind = "lambda" | "dot" | "lparen" | "rparen" | "ident" | "equals" | "eof";

export interface Pos {
  readonly offset: number; // index into the source string (UTF-16 code units, for slicing)
  readonly line: number;   // 1-based
  readonly col: number;    // 1-based, counted in Unicode code points
}

export interface Token {
  readonly kind: TokenKind;
  readonly text: string;   // exact source text ("λ" or "\\" for lambda, "" for eof)
  readonly start: Pos;
  readonly end: Pos;       // position just after the token
}

export interface LexError {
  readonly message: string;
  readonly start: Pos;
  readonly end: Pos;
}

export interface LexResult {
  readonly tokens: Token[];
  readonly errors: LexError[];
}

const isIdentStart = (c: string) => /[A-Za-z_]/.test(c);
const isIdentPart = (c: string) => /[A-Za-z0-9_']/.test(c);
const isDigit = (c: string) => c >= "0" && c <= "9";
const isSpace = (c: string) => c === " " || c === "\t" || c === "\r" || c === "\n";

export function tokenize(src: string): LexResult {
  const tokens: Token[] = [];
  const errors: LexError[] = [];
  let offset = 0, line = 1, col = 1;

  const pos = (): Pos => ({ offset, line, col });
  // The current character as a whole code point (one or two UTF-16 units), or "" at the end.
  const peek = (): string => {
    const cp = src.codePointAt(offset);
    return cp === undefined ? "" : String.fromCodePoint(cp);
  };
  const advance = (): string => {
    const c = peek();
    offset += c.length;
    if (c === "\n") { line++; col = 1; } else { col++; }
    return c;
  };

  while (offset < src.length) {
    const c = peek();
    const start = pos();

    if (isSpace(c)) { advance(); continue; }

    // Line comment: "--" up to (not including) the end of the line.
    if (c === "-" && src[offset + 1] === "-") {
      while (offset < src.length && peek() !== "\n") advance();
      continue;
    }

    if (c === "λ" || c === "\\") { advance(); tokens.push({ kind: "lambda", text: c, start, end: pos() }); continue; }
    if (c === ".") { advance(); tokens.push({ kind: "dot", text: c, start, end: pos() }); continue; }
    if (c === "(") { advance(); tokens.push({ kind: "lparen", text: c, start, end: pos() }); continue; }
    if (c === ")") { advance(); tokens.push({ kind: "rparen", text: c, start, end: pos() }); continue; }
    if (c === "=") { advance(); tokens.push({ kind: "equals", text: c, start, end: pos() }); continue; }

    if (isIdentStart(c)) {
      // Maximal munch: keep consuming while the next character can continue a name.
      // "xy" is ONE identifier, not x followed by y.
      while (offset < src.length && isIdentPart(peek())) advance();
      tokens.push({ kind: "ident", text: src.slice(start.offset, offset), start, end: pos() });
      continue;
    }

    if (isDigit(c)) {
      // Consume the whole run so the error covers "42", not just "4".
      while (offset < src.length && isIdentPart(peek())) advance();
      const text = src.slice(start.offset, offset);
      errors.push({ message: `numeric literal '${text}' is not part of the pure λ-calculus (numbers are built from functions in Module 14)`, start, end: pos() });
      continue;
    }

    advance();
    errors.push({ message: `unexpected character '${c}' (U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")})`, start, end: pos() });
  }

  tokens.push({ kind: "eof", text: "", start: pos(), end: pos() });
  return { tokens, errors };
}

// ── diagnostics ────────────────────────────────────────────────────────────────

// Render an error the way compilers do: message, the offending source line, and carets under the span.
//
//   1:7: unexpected character '+' (U+002B)
//     λx. x + y
//           ^
export function formatError(src: string, err: { message: string; start: Pos; end: Pos }): string {
  const lineText = src.split("\n")[err.start.line - 1] ?? "";
  const width = Math.max(1, err.end.line === err.start.line ? err.end.col - err.start.col : 1);
  const caret = " ".repeat(err.start.col - 1) + "^".repeat(width);
  return `${err.start.line}:${err.start.col}: ${err.message}\n  ${lineText.replace(/\r$/, "")}\n  ${caret}`;
}

export function formatToken(t: Token): string {
  const where = `${t.start.line}:${t.start.col}`;
  return `${where.padEnd(6)} ${t.kind.padEnd(7)} ${t.kind === "eof" ? "" : JSON.stringify(t.text)}`;
}
