# Module 12: Definitions, Prelude & REPL · DECISIONS

Module 12 adds `src/defs.ts` (definitions as macros, simultaneous substitution, program reading), `src/repl.ts`
(a pure REPL), `repl-cli.ts` (terminal front end), `prelude.lam` (11 standard definitions) and `examples.lam`.
It extends the lexer with an `=` token. Tests: 144 total (14 new), all passing.

Categories: **(a)** forced by the spec · **(b)** forced by an external contract · **(c)** our convention.

---

## Definitions are macros
- **`name = term` stores the term with every previously defined name already expanded. Evaluation expands the remaining names, then reduces. (c), with a consequence that is (a).** The alternative is to extend the calculus with constants and δ-rules, or `let`. We want to show definitions add *nothing*: a program with definitions is literally a raw term in disguise. The test "definitions add no power" checks that, on 500 random programs, evaluating with names gives the same status, step count and result as expanding by hand.
- **Recursive definitions are refused. (a)** Macro expansion of `fact = … fact …` never terminates. The error message points to Module 15's fixed-point combinators, which are how recursion is done in the pure calculus.
- **Static expansion: redefining a name doesn't change terms defined earlier. (c)** When `b` was defined using `a`, it captured `a`'s *then* meaning. We warn on redefinition. Dynamic lookup would make earlier definitions change meaning behind your back, which is exactly the bug of dynamic scope (Track H5).
- **Free names in a definition that aren't defined stay free. (c)** `getY = λk. k y` is allowed. `y` is just a free variable.

## `substMany`: simultaneous, capture-avoiding substitution
- **All names are replaced at once, and replacements are not re-scanned. (a)** Sequential substitution goes wrong when one replacement mentions another name: `{x ↦ y, y ↦ x}` must *swap* (`x y` → `y x`), and two sequential substitutions can't do that (tested).
- **Capture avoidance mirrors Module 5's rule, generalized to a map. (a)** Under `λp`, if any replacement for a name free in the body mentions `p`, rename `p` fresh. Checked against Module 5's `subst` on 2000 random single-name cases, and on the named example `λy. getY` (which must not capture `getY`'s free `y`).

## Reading programs
- **One statement per line. An indented line continues the previous one. (c)** This allows long definitions without introducing `;`. Haskell-like layout, minimal.
- **`=` becomes a token (`equals`) in the lexer. (a)** Otherwise `name = term` can't be recognized. The parser describes it (`'='`) and rejects it inside terms. The carried Module 2/3 tests are unchanged and pass.
- **Statement kinds: definition, expression, `:command`, error. (c)** Errors are values, as in Modules 2–3.

## The REPL
- **`execLine(session, line) → { session, output }` is pure. (c)** No I/O and no mutation (tested: the old session is unchanged). The terminal CLI and the browser Lab are both thin loops around it, so they behave identically, and tests drive whole sessions via `runScript`.
- **Default strategy: normal order, fuel 10,000. (c)** Normal order is complete (Module 9), so a REPL user gets an answer whenever one exists, and fuel keeps `Omega` safe.
- **Result naming (`= I`). (c)** After evaluating, the result is compared (up to α) with each definition's normal form, most recent first. It's cheap for a small prelude and makes output readable (`S K K` → `λz. z   = I`).
- **Commands:** `:defs :show :expand :strategy :fuel :trace :forms :db :reset :help`. **(c)** Each exposes an earlier module's machinery (strategies, Module 9; forms, Module 11; de Bruijn, Module 6).

## The prelude
- **I, K, KI, S, B, C, W, M, Omega, twice, apply. (b)** These are the standard combinator names of combinatory logic (Curry's B, C, W, K, S, I), plus `M` (the "mockingbird" `λx. x x`, Smullyan's name) and `Omega = M M`. ASCII names are used because the lexer's identifiers are ASCII (Module 2), so `Ω` becomes `Omega`.
- **`prelude.lam` is a file, read by the CLI and imported raw by the Lab. (c)** One source of truth. Module 13 adds booleans and pairs to it.

---

## Decisions We Made

| Decision | Category | Could have been |
|---|---|---|
| Definitions as macros, expanded before reduction | (c) | constants + δ-rules, `let` |
| Refuse recursive definitions | (a) | loop forever |
| Static expansion + redefinition warning | (c) | dynamic lookup |
| Simultaneous `substMany` | (a) | sequential `subst` (can't swap) |
| Line-based statements with indentation continuation | (c) | `;` separators |
| `=` as a lexer token | (a) | — |
| Pure `execLine` | (c) | a REPL that does I/O |
| Normal order + fuel by default | (c) | call-by-value |
| Name results after definitions | (c) | print raw terms only |
| ASCII prelude names | (a) given Module 2 | Unicode identifiers |

## What We Proved

Checked by `npm test` (144 tests, all passing) and quoted from `npm run demo`:

1. **Definitions add no power:** 500/500 random programs give the same status, step count and result with names as with hand expansion.
2. **The prelude behaves:** `S K K a` → `a` (5 steps), `S K K` → `λz. z = I`, `B f g x` → `f (g x)`, `C K a b` → `b`, `twice twice f x` → `f (f (f (f x)))`.
3. **Recursion needs more than definitions:** `fact = λn. fact n` is refused.
4. **Simultaneous substitution swaps:** `substMany(x y, {x ↦ y, y ↦ x}) = y x`. It agrees with Module 5's `subst` on 2000 random cases.
5. **Composition multiplies:** `thrice twice f x` applies `f` 8 = 2³ times, `twice thrice f x` 9 = 3² times, and `thrice thrice f x` 27 = 3³ times. Previewing Church numerals (Module 14).
