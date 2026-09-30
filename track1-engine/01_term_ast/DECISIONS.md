# Module 1: Term AST & Printer · DECISIONS

Module 1 defines the data structure every later module operates on: the λ-term tree. It also defines the
printer that turns a tree back into textbook notation. There is no parser yet (that's Module 3), so every
term here is built with constructor calls.

Every non-obvious choice below is tagged with one of three categories:

- **(a) Forced by the spec.** The λ-calculus itself (Church 1936; Barendregt 1984, ch. 2) or the platform (Node, TypeScript) leaves no choice.
- **(b) Forced by an external contract.** Notation conventions every textbook and paper uses, Node's test-runner API, and so on.
- **(c) Our convention.** A choice made for safety or clarity. Another consistent choice would also have worked.

---

## `src/term.ts`

### The type
```ts
export type Term =
  | { readonly kind: "var"; readonly name: string }
  | { readonly kind: "lam"; readonly param: string; readonly body: Term }
  | { readonly kind: "app"; readonly fn: Term; readonly arg: Term };
```
- **Exactly three variants. (a)** The grammar `M ::= x | λx.M | M N` has three productions. Nothing else exists in the pure calculus: no numbers, no `let`. Constants and `let` come later as *sugar* (Module 12, Track 2 C1).
- **A tagged union with a `kind` string. (c)** Classes with `instanceof`, or numeric tags, would also work. String tags show up readably in `console.log` and JSON, and TypeScript narrows on them inside `switch` (P8.2).
- **Tag names `var`/`lam`/`app`. (c)** Short, conventional in PL implementations (`Var | Lam | App` is the usual Haskell/OCaml spelling).
- **Field names `param`, `body`, `fn`, `arg`. (c)** Chosen to name the *role*, not the position. `fn`/`arg` makes `App(fn, arg)` read correctly, where `left`/`right` would describe shape rather than meaning.
- **A λ binds exactly one name. (a)** One binder per abstraction is the definition. `λx y. M` is notation for `λx. λy. M`, so it gets no node of its own; the `lams()` helper builds the nesting.
- **`readonly` on every field. (c)** Terms are immutable (P3.4). Later modules share unchanged subtrees between the old and new term after substitution or reduction. That sharing is only safe if nothing mutates a node. `readonly` turns an accidental mutation into a compile error.

### Name validation
```ts
const IDENT = /^[A-Za-z_][A-Za-z0-9_']*$/;
```
- **Validating names at construction. (c)** The printer only guarantees unambiguous output if names can't contain the printer's own punctuation. A variable named `"x.y"` would print `λx.y. …`, which reads as a different term. Rejecting bad names at the constructor keeps the printer simple and correct.
- **The exact character set. (c)** Letters, digits, `_` and prime `'` (as in `f'`, standard in math) match what Module 2's lexer will accept. Digits can't come first, which leaves room for numeric literals in Track 2 without ambiguity. Unicode letters beyond ASCII are excluded to keep the lexer small. Another choice would have worked.
- **Throwing an `Error`. (c)** A bad name here is a programmer bug (the constructors are called by code, not by users), so failing loudly is right. Module 2 reports *user* input errors as located diagnostics instead.

### `apps` and `lams`
- **`apps` folds left. (b)** The universal convention `f a b = (f a) b` (P1.4, P4.3) comes from currying.
- **`lams` folds right. (a)** `λx y. M` must mean `λx. (λy. M)`: the first-listed binder is outermost.
- **`apps(f)` with no arguments returns `f`. (c)** A natural base case, and it makes `apps(head, ...list)` safe on empty lists.

### `size`, `depth`, `counts`
- **One case per kind, recursing on children. (a)** This is structural recursion (P3.3), forced by the shape of the type. TypeScript's exhaustiveness check guarantees no kind is forgotten (`noImplicitReturns` in the webapp's `tsconfig.json`).
- **Depth counts nodes, not edges. (c)** A lone variable has depth 1. Either convention is common, and counting nodes matches `size`.
- **The binder name is not counted as a variable occurrence. (a)** `λx.` *introduces* `x`, it doesn't *use* it. This distinction is exactly what makes the `vars = apps + 1` law (P5.2) hold.

### `equalSyntax`
- **Compares names everywhere, including binders. (c)** This is deliberately the *strictest* equality. It says `λx.x ≠ λy.y`, which is wrong for the λ-calculus (they are the same function, P2.5). Module 4 introduces α-equivalence, the right notion. We keep a strict version because tests and the Lab need "is this literally the same tree?", and it makes the upcoming distinction visible.
- **`a === b` shortcut. (c)** An optimization: shared subtrees (P3.4) compare in O(1).

---

## `src/print.ts`

### Which parentheses are required
The two conventions **(b)**, followed by every textbook since Church:
1. Application is left-associative: `f a b` = `(f a) b`.
2. A λ-body extends as far right as possible: `λx. x y` = `λx. (x y)`.

From them, we derive **(a)** exactly three places where parentheses are required:

| Position | Needs parens when… | Why |
|---|---|---|
| Function of an application | it is a λ | Otherwise the λ-body would swallow the argument: `λx. x y` is not `(λx. x) y`. |
| Argument of an application | it is an application | Otherwise left-associativity regroups: `f a b` is not `f (a b)`. |
| Argument of an application | it is a λ **and something follows it** | `f λx. x` is fine, but `f λx. x g` reads as `f (λx. x g)`. |

### The `trailing` flag
- **Carrying context down the recursion. (a)** The third row can't be decided from the λ node alone. The *same* λ subtree needs parens in `f (λx. x) g` and none in `f λx. x`. So `go` takes a boolean, `trailing`: "nothing follows me before the enclosing `)` or end of text." This is the Brain Exercise in the tutorial.
- **How `trailing` is passed. (a)** The function part of an application always has something after it (the argument), so it gets `false`. The argument inherits the application's own `trailing`. A λ-body is always trailing: it runs to the end of whatever encloses the λ. Anything inside newly added parens is trailing too.
- **Parenthesizing a λ in the *last* argument position is omitted. (c)** Some texts always write `f (λx. x)`. Minimal output was chosen to make the rules visible. Nothing downstream depends on it.

### Spacing and symbols
- **`λx. body` with a space after the dot. (c)** Matches Pierce's *TAPL*. `λx.body` is equally common, and Module 2's lexer will accept both.
- **One `λ` per binder: `λx. λy. x`, not `λx y. x`. (c)** The output then corresponds 1:1 with AST nodes, which matters while learning the tree. A compact mode can be added later without touching the tree.
- **ASCII `\` option. (b)** Backslash is the de facto ASCII spelling of λ (Haskell, and most λ-calculus tools), used for terminals without Unicode.
- **Ω prints as `(λx. x x) λx. x x`. (a)** This is a consequence of the rules, not a special case. Most books write `(λx. x x)(λx. x x)`, which is also correct but has one redundant pair.

### `printFull` and `show`
- **`printFull` wraps every compound node. (c)** A teaching and debugging view. It can never be misread, and its paren count equals the number of compound nodes (tested).
- **`show` emits constructor calls. (c)** It shows the raw data with no notation at all. `JSON.stringify` quotes names so the output is valid TypeScript.

---

## `src/tree.ts`
- **`@` for application nodes. (b)** A long-standing convention in λ-calculus and graph-reduction literature (e.g. Peyton Jones, *The Implementation of Functional Programming Languages*, 1987).
- **Box-drawing characters `├──`, `└──`, `│`. (c)** The same style as the Unix `tree` command. One line per node, so `lines === size` (tested).

## `src/gen.ts`
- **A seeded PRNG instead of `Math.random`. (c)** Failing property tests must be replayable exactly. `mulberry32` is a public-domain 32-bit generator and fine for this job. Cryptographic quality is irrelevant here.
- **Small name pools (`x`, `y`, `z`). (c)** Few names mean many clashes and much shadowing. Those are exactly the cases later modules (4, 5, 6) must handle, so the same generator stays useful.
- **Probabilities 0.3 / 0.3 / 0.4 and a depth cap. (c)** Tuned by eye to produce a mix of shapes that always terminates. Any values with a positive leaf probability at every depth would do.

## `src/examples.ts`
- **I, K, S, ω, Ω. (b)** Standard names from combinatory logic (Schönfinkel 1924, Curry 1930) and Barendregt's book. Later modules and all the literature refer to them by these names.

## `test.ts`, `demo.ts`, `package.json`
- **`node:test`, no framework. (c)** No dependencies to install. The built-in runner is enough.
- **`--experimental-strip-types --no-warnings`. (a/b)** Node 22.6–23.5 requires the flag to run `.ts` (a). The warning text is Node's (b). We silence it so demo output matches the tutorial exactly.
- **`"type": "module"`. (a) on Node 22.6, (c) on 22.7+.** Node 22.6 treats a typeless `.ts` file as CommonJS, so `import` fails there. From 22.7 (per the Node 22.7.0 changelog, which un-flagged `--experimental-detect-module`; not tested on 22.6 here) Node detects ES-module syntax on its own. We verified on 22.14 that the demo runs even without `package.json`. We declare the module type anyway rather than rely on detection.
- **`.ts` extensions in imports. (a)** Node's type stripping resolves real filenames. It does not rewrite `.js` to `.ts` as the TypeScript compiler does.

---

## Decisions We Made

| Decision | Category | Could have been |
|---|---|---|
| Three node kinds | (a) spec | — |
| Tagged union on `kind` | (c) | classes + `instanceof`; numeric tags |
| One binder per λ node | (a) spec | — |
| Immutable (`readonly`) nodes | (c) | mutable nodes plus defensive copying |
| Validate names at construction | (c) | escape names in the printer |
| Name charset `[A-Za-z_][A-Za-z0-9_']*` | (c) | Unicode identifiers |
| Syntactic equality compares binder names | (c) | α-equality from the start (Module 4) |
| Left-assoc application, λ extends right | (b) textbook contract | — |
| Paren placement derived from those two rules | (a) | — |
| `trailing` context flag | (a) | — (required by rule 3) |
| No parens on a trailing λ argument | (c) | always parenthesize λ arguments |
| `λx. body` spacing, `\` ASCII option | (c) / (b) | `λx.body` |
| `@` label and box-drawing tree | (b) / (c) | S-expressions |
| Seeded `mulberry32` generator | (c) | `Math.random`, fast-check |

## What We Proved

Every claim below was checked by `npm test` (13 tests, 13 pass) and by `npm run demo`, whose output the tutorial quotes verbatim:

1. **Every term is one of three shapes.** 500 random terms, each with `kind ∈ {var, lam, app}`. TypeScript's exhaustiveness checking over the `Term` type enforces the rest statically (`tsc --noEmit` exits 0).
2. **The printer reproduces textbook notation.** `S` prints as `λx. λy. λz. x z (y z)`, and all 8 parenthesization cases match the hand-derived expected strings.
3. **The structural-induction law `vars = apps + 1` holds.** 2000/2000 random terms satisfy it, as predicted by the proof in Prerequisite P5.2.
4. **`printFull` has exactly one paren pair per compound node, and `print` never uses more.** Checked on 500 random terms each.

**Not yet proved:** that `print` is *unambiguous*, i.e. that reading its output back always gives the same tree. That needs a parser. Module 3 checks `parse(print(t)) = t` on thousands of random terms.
