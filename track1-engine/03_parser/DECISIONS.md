# Module 3: Parser · DECISIONS

Module 3 adds `src/parser.ts` (tokens → `Term`, with located errors and an optional rule trace) and
`src/parens.ts` (which parentheses in a text carry meaning). Everything from Modules 1–2 is unchanged.
Their tests are in `tests/` and pass: 41 total (14 new).

Categories: **(a)** forced by the spec/platform · **(b)** forced by an external contract · **(c)** our convention.

---

## The grammar
```
term  ::= item+
item  ::= atom | "λ" IDENT+ "." term
atom  ::= IDENT | "(" term ")"
```
- **Two conventions baked into the grammar. (b)** Application is left-associative, and a λ-body extends as far right as possible. These are the textbook contract from P4.3. The printer (Module 1) assumes exactly these conventions, and the parser must agree or round-tripping fails.
- **A λ may appear as the *last* item of a row without parentheses. (a), given Module 1.** Module 1's printer emits `f λx. x` (no parens on a trailing λ argument). Whatever the printer emits, the parser must accept, and the round-trip test enforces this. Real languages differ here. Standard Haskell 2010 requires `map (\x -> x)` or `map $ \x -> x`, and GHC's `BlockArguments` extension allows the bare form. A grammar that required `f (λx. x)` would be simpler and equally valid on its own, but it would break our printer's contract.
- **Why the λ must be last. (a)** Its body is a `term`, which consumes items until `)` or the end. Nothing can follow a λ inside the same row, so `f λx. x g` is `f (λx. x g)`. That's convention 2, not a parser quirk.
- **`λx y z. M` shorthand. (b)** It is universal in the literature and in Barendregt's notation. It becomes nested `Lam`s via `reduceRight`, the same as `lams()` in Module 1.

## Recursive descent
- **One function per rule: `parseTerm`, `parseItem`, `parseLambda`, `parseAtom`. (c)** The alternatives are a parser generator (yacc/ANTLR), Pratt parsing, or a hand-written LR parser. For a three-rule grammar, recursive descent is the clearest choice: the code *is* the grammar. See the sibling course `a-finity/everything_parsing` for the other techniques.
- **`item+` is a `while` loop with a left fold, not the rule `term ::= term item`. (a)** A left-recursive rule written as recursive descent calls `parseTerm` again before consuming anything, so it recurses forever. The loop builds the same left-nested tree: `acc = App(acc, next)`.
- **One token of lookahead (`peek()`). (a)** Every decision (`λ` vs name vs `(` vs stop) is made by looking at the next token's kind. The grammar is LL(1). No backtracking is ever needed.

## Errors
- **Stop at the first syntax error. (c)** The lexer continues after errors (Module 2) because it has no state to get confused. A parser does: after a missing `)`, it can't know where the programmer *meant* the group to end, so later "errors" are often phantom consequences of the first. Real compilers use *panic-mode recovery* (skip to a synchronizing token such as `;`), but a λ-term has no statement separators to synchronize on. For single expressions, one precise error beats several guesses.
- **Internal exception class `SyntaxErrorSignal`, caught in `parse()`. (c)** It unwinds the whole recursion in one step, where checking return values at every call would take many. It never escapes: `parse()` returns `{ term: null, errors }`, just as the lexer does. It isn't a subclass of `Error` because it's control flow, not a bug. No stack trace is needed.
- **Lexical errors are returned as-is, and the parser doesn't run. (c)** Parsing a token list with holes in it would produce misleading secondary errors.
- **Messages name the expected and found tokens, and the opening `(`'s position. (c)** "`expected ')' to close the '(' at 1:1, found end of input`" is modelled on rustc and Clang. The opening position matters because the fix usually belongs *there*.
- **`λx x` reports "expected '.' after the parameters of 'λx x'". (a)** The message is a consequence of the grammar, not a special case. After `λ`, *every* name is a parameter until the `.`, so the parser can't know the second `x` was meant as the body. Echoing the parameters it collected shows the user how it read the text.
- **Errors at end of input have `start = end`. (c)** There's no character to underline, so the caret goes just past the last character.

## `parseOrThrow`
- **A throwing convenience wrapper. (c)** Tests, demos and later modules parse known-good strings constantly. Unpacking `{ term, errors }` each time would bury the code. It throws a normal `Error` with the located message because a failure there *is* a programmer bug.

## Tracing
- **`{ trace: true }` logs each rule entered, indented by depth. (c)** It exists for learning: the Lab shows it, and it makes the call stack of recursive descent visible. It costs nothing when off. The `rule()` wrapper keeps the tracing out of the grammar functions' logic.

## `parens.ts`
- **Necessity is tested by deleting one pair and re-parsing. (c)** It's an *experimental* definition: "necessary" means removal changes the tree or breaks parsing. That's exactly the property Module 1 claimed for `print()`, tested with the parser as the judge. A static rule-based analysis would re-implement the printer's logic and prove nothing.
- **Pairs are matched on tokens, not raw characters. (a)** A `(` inside a `-- comment` isn't a parenthesis.
- **Removal replaces each paren with a space. (a)** `(f)(x)` without spaces must not become `fx`, which is a single identifier under maximal munch.
- **Redundancy is judged one pair at a time. (c)** This is deliberate, and it's the Brain Exercise. Two pairs can each be redundant alone but not together. The Lab can remove several pairs jointly to show it.

---

## Decisions We Made

| Decision | Category | Could have been |
|---|---|---|
| Left-assoc application, λ extends right | (b) textbook contract | — |
| Trailing λ allowed without parens | (a) given Module 1's printer | require `f (λx. x)` everywhere |
| Multi-binder `λx y. M` | (b) | one binder per λ in the source too |
| Recursive descent, one function per rule | (c) | Pratt, LR, parser generator |
| Loop + left fold instead of left recursion | (a) | — |
| One-token lookahead (LL(1)) | (a) grammar property | — |
| Stop at first syntax error | (c) | panic-mode recovery |
| Internal signal exception, never escapes | (c) | result-passing at every call |
| Messages name expected/found and the opening `(` | (c) | "syntax error" |
| `parseOrThrow` for known-good input | (c) | always unpack results |
| Optional rule trace | (c) | — |
| Paren necessity = delete-and-reparse | (c) | static analysis |

## What We Proved

Checked by `npm test` (41 tests, all passing) and quoted from `npm run demo`:

1. **Text becomes Module 1's trees, and both conventions hold.** `f x y` gives `((f x) y)`, `λx. x y` gives `(λx. (x y))`, and `f λx. x g` gives `(f (λx. (x g)))`.
2. **The printer is unambiguous on every term we tried.** `parse(print(t)) = t` for **5000/5000** random terms, in both λ spellings, and for `printFull` too. This closes the question Module 1 left open. It's strong evidence, not a proof. The proof is a structural induction over the three cases in `print.ts`, one case per row of the parenthesis table.
3. **The printer is minimal.** Across 2000 random terms, `print()` emitted **3831** paren pairs, and deleting any single one changed the tree or broke parsing: **3831/3831 necessary**.
4. **Structural mistakes produce located, specific errors.** For example, `(λx. x` gives `1:7: expected ')' to close the '(' at 1:1, found end of input`.
5. **Redundancy isn't compositional.** In `(f (λx. x)) ((λy. y) z)`, pairs #1 and #2 are each redundant alone, but removing both gives `f λx. x ((λy. y) z)`, a different tree.
