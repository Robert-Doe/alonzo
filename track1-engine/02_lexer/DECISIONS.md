# Module 2: Lexer · DECISIONS

Module 2 adds `src/lexer.ts`, which turns a string into a list of tokens with source positions and
reports bad input as located errors. Everything from Module 1 is carried over unchanged. Module 1's tests
now live in `tests/01_term_ast.test.ts` and still pass.

Categories: **(a)** forced by the spec/platform · **(b)** forced by an external contract · **(c)** our convention.

---

## Why a separate lexer at all?
- **Two passes: characters → tokens → tree. (c)** A parser could read characters directly (a *scannerless* parser). Splitting the work is the standard compiler structure (Aho et al., *Compilers*, ch. 3). Whitespace, comments, and "is `xy` one name or two?" get decided *once*, here, so Module 3's grammar can talk about clean tokens. For a language this small both approaches work. We split because Track 2's Alonzo-ML lexer will be much bigger.

## Token kinds
```ts
export type TokenKind = "lambda" | "dot" | "lparen" | "rparen" | "ident" | "eof";
```
- **Five real kinds. (a)** They are exactly the terminal symbols of the concrete grammar in P4.3: `λ`, `.`, `(`, `)`, identifiers. Nothing else can appear in a pure λ-term.
- **An explicit `eof` token. (c)** The parser can always look at "the next token" without checking array bounds, and "expected `)` but found end of input" becomes an ordinary token mismatch with a position. Many real lexers do this. Returning `undefined` at the end is the alternative.
- **Kinds as strings. (c)** Same reasoning as Module 1's `kind` tags.

## Two spellings of λ
- **`λ` (U+03BB) and `\`. (b)** `λ` is the notation of the literature. `\` is the ASCII convention used by Haskell and most λ tools, and it's what people type on keyboards without Greek. Both produce kind `lambda`. The token keeps the original `text`, so tools can echo exactly what the user wrote.

## Identifiers
- **`[A-Za-z_][A-Za-z0-9_']*`. (c), but chosen to match `isIdent` in `term.ts` exactly.** Consistency with the constructor is **forced (a)** once Module 1's rule exists: every name the printer can emit must lex back as one identifier. The test "every printed term lexes cleanly" checks this on 1000 random terms, in both λ spellings.
- **Maximal munch. (b)** The lexer consumes the *longest* run of identifier characters, so `λxy. x` has one binder named `xy`. This is the rule virtually every programming-language lexer uses (C, Java, JavaScript, Haskell). It **differs** from a common *textbook* convention where single letters are variables and `λxy.x` means `λx.λy.x`. We follow the programming convention so multi-letter names like `succ` and `acc_2` work. To get two binders, write `λx y. x` (Module 3 will accept that). This trade-off is the Brain Exercise.

## Numbers
- **A digit run is an error, with a special message. (c)** The pure λ-calculus has no numeric literals (a). We could have reported a generic "unexpected character '4'", but consuming the whole run and explaining *why* is friendlier and covers the full span `42`. Track 2 will turn digit runs into real literal tokens.

## Whitespace and comments
- **Space, tab, CR, LF are skipped. (c)** Whitespace has no meaning in λ-syntax except to separate adjacent identifiers (`x y` vs `xy`), and maximal munch already handles that.
- **`--` line comments. (c)** Borrowed from Haskell. Module 12's prelude files will need comments. `#` or `//` would work just as well, but `--` can't clash with any λ token.

## Positions
- **Every token and error carries `start` and `end`. (c)** Parse errors (Module 3) and type errors (Module 24) will point back to source text. Recording positions at the source is the only place it's cheap.
- **1-based line and column. (b)** The convention of compilers and editors (`file:line:col`), so positions can be pasted into an editor's "go to line."
- **Columns count Unicode code points. (c)** JavaScript strings are UTF-16, so `"😀".length === 2`. Counting code points makes one visible character one column (tested with an emoji). This still isn't perfect display width: tabs, combining marks and wide CJK characters would need a display-width library. `offset` stays in UTF-16 units **(a)** because it's used for `String.slice`.
- **`end` is exclusive (just past the token). (c)** Half-open ranges make `end - start = length` and adjacent tokens share a boundary without overlap.

## Error recovery
- **Report, skip one character (or the whole digit run), and continue. (c)** Stopping at the first error is simpler, but then the user fixes one typo, reruns, and meets the next. Continuing is safe here because every character is either part of a token, whitespace, or an error. There's no state to get confused. `tokenize` never throws.
- **Errors are data (`LexError[]`), not exceptions. (c)** Callers (the parser, the Lab) decide what to do. Module 1 threw on bad names because those are *programmer* bugs. These are *user* input problems.

## `formatError`
- **Message, source line, carets. (b)** The layout used by GCC, Clang and rustc, which learners will recognize. Carets span the error's width (`^^` under `42`).

---

## Tests as regression
- **`tests/01_term_ast.test.ts` is Module 1's `test.ts`, with the import path adjusted. (c)** Each module snapshot must still pass every earlier module's tests. `npm test` runs `test.ts` plus `tests/*.test.ts`. The pattern is quoted so every shell passes it through unchanged, and Node's test runner expands it itself (glob support in `--test` arguments, verified on Node 22.14 under Windows). That behaves the same on `cmd.exe`, which never expands globs, and on POSIX shells, which would otherwise expand it first. **(c)**

---

## Decisions We Made

| Decision | Category | Could have been |
|---|---|---|
| Separate lexer pass | (c) | scannerless parsing |
| Token kinds = grammar terminals | (a) | — |
| Explicit `eof` token | (c) | bounds checks in the parser |
| `λ` and `\` both accepted | (b) | only one spelling |
| Identifier rule identical to `isIdent` | (a) given Module 1 | — |
| Maximal munch (`xy` = one name) | (b) PL convention | textbook single-letter convention |
| Digit runs get an explanatory error | (c) | generic "unexpected character" |
| `--` comments | (c) | `#`, `//` |
| 1-based line:col | (b) | 0-based |
| Columns in code points, offsets in UTF-16 units | (c) / (a) | columns in UTF-16 units |
| Half-open `[start, end)` spans | (c) | inclusive end |
| Continue after errors; errors as data | (c) | throw on first error |

## What We Proved

Checked by `npm test` (27 tests: 14 new, 13 carried from Module 1, all passing) and quoted from `npm run demo`:

1. **Text becomes an ordered token stream with positions.** `(\x. x) y` produces `lparen lambda ident dot ident rparen ident eof` at columns 1, 2, 3, 4, 6, 7, 9, 10.
2. **Both λ spellings, arbitrary whitespace and comments give the same kinds.**
3. **Maximal munch.** `λxy. x` gives the tokens `λ`, `xy`, `.`, `x`: one binder, not two.
4. **Malformed input produces located errors, never a crash.** `λx. x + y` reports `1:7: unexpected character '+' (U+002B)` with a caret, and still returns the other 5 tokens and `eof`. `f 42` reports the full two-column literal.
5. **The lexer agrees with the printer.** For 1000 random terms, in both spellings, lexing `print(t)` gives zero errors, exactly `vars + lams` identifiers and exactly `lams` lambdas.
