# Module 6: de Bruijn Indices · DECISIONS

Module 6 adds `src/debruijn.ts`, a second representation of terms with no bound names. It includes conversion
both ways, printing and parsing, index shifting, and substitution. Modules 1–5 are unchanged. Tests: 77 total
(12 new), all passing. This module closes Phase 1.

Categories: **(a)** forced by the spec/representation · **(b)** forced by an external contract · **(c)** our convention.

---

## The representation
```ts
export type DTerm =
  | { readonly kind: "var"; readonly index: number }
  | { readonly kind: "lam"; readonly body: DTerm; readonly hint: string }
  | { readonly kind: "app"; readonly fn: DTerm; readonly arg: DTerm };
```
- **A variable is the number of λs between it and its binder. (a)** This is de Bruijn's 1972 idea (from his Automath work, the subject of Track H8). An abstraction no longer carries a name, because nothing refers to it by name. `λx. x` and `λy. y` both become `λ. 0`.
- **Indices, counted from the variable outward, rather than *levels*, counted from the root inward. (c)** Both are standard. Indices make β-reduction's argument insertion simple and make closed subterms position-independent. Levels make *weakening* free instead. Many implementations (e.g. normalization by evaluation, Module 23) use indices for terms and levels for values, and we'll meet levels there.
- **A separate type, not a replacement for `Term`. (c)** Named terms stay the course's primary representation: they're what humans read and what Modules 1–5 built. De Bruijn terms are a tool we convert to when we need them.
- **`hint`: the original binder name, display only. (c)** It lets `fromDeBruijn` choose readable names (`λy1. y`, not `λv0. y`). `equalDB` ignores it. Without hints, every converted-back term would get generic names.

## Free variables and the naming context Γ
- **A free variable under d binders gets index d + i, where Γ[i] is its name. (b)** This is the scheme of Pierce, *TAPL* ch. 6. Free and bound variables live in one number line, so substitution treats them uniformly.
- **Default Γ = the term's free variables, sorted alphabetically. (c)** It's deterministic, so two terms with the same free variables get the same context. When *comparing* two terms, the caller must pass one shared context (the Lab and tests do). Otherwise `x` and `y` could both become index 0.
- **The alternative, *locally nameless*, keeps free variables as names and uses indices only for bound ones. (c)** Many modern proof assistants' kernels use it. It avoids shifting free variables, but it needs two kinds of variable node. We chose pure indices because shifting is the classic lesson and TAPL's formulas apply verbatim.

## `fromDeBruijn`
- **Binder names come from hints, passed through `freshName` against every enclosing name and Γ. (a)** Naively reusing hints can capture. `λx. λx. 1` must print as `λx. λx1. x`, not `λx. λx. x`, which would mean `λ. λ. 0` (tested).

## Shifting and substitution
```
shift(d, c, k)     = k + d  if k ≥ c,  else k
shift(d, c, λ. t)  = λ. shift(d, c+1, t)
substDB(j, s, k)   = s  if k = j,  else k
substDB(j, s, λ.t) = λ. substDB(j+1, shift(1, 0, s), t)
substTop(t, s)     = shift(-1, 0, substDB(0, shift(1, 0, s), t))
```
- **These definitions. (b)** Transcribed from TAPL §6.2. The cutoff `c` protects indices bound *inside* the term being shifted.
- **Under each λ: the target index goes up by one, and so do the replacement's free indices. (a)** One more binder now sits between them and what they referred to. Forgetting the second shift is the de Bruijn version of capture: `substDBNoShift` keeps the bug for comparison, and turns `(λy. x)[x := y]` into the identity, exactly as `substNaive` did in Module 5.
- **`substTop` shifts the argument up, substitutes, then shifts everything down. (a)** The binder is disappearing, so every index that pointed past it drops by one. The initial up-shift pre-compensates so the argument's free indices end where they started.
- **No fresh names anywhere. (a)** That's the payoff. There's nothing to capture *by name*, only arithmetic to get right.

## `printDB` and `parseDB`
- **The same parenthesization rules as Module 1's printer. (a)** The tree shapes are identical, so the conventions are too. It's a separate function because the leaves differ (numbers vs names). A shared generic printer would have been possible, at the cost of indirection in Module 1's clearest code.
- **`parseDB` is a small character-level parser. (c)** Module 2's lexer rightly rejects digits, since the named calculus has no numerals. The Lab needs to read a learner's hand-written nameless term, so a 40-line self-contained parser does just that. It accepts `λ` or `\`, optional hint names after `λ`, and redundant parentheses.

## Testing strategy
- **A third α-test. (c)** `equalDB(toDB(a), toDB(b))` is checked against Module 4's `alphaEquivalent` *and* its canonical-form test on 3000 random pairs. Three independent algorithms agree.
- **Cross-check against Module 5. (c)** For 3000 random `(body, N)`, `substTop` on nameless terms equals the nameless form of Module 5's named `subst(body, x, N)`. Two substitution algorithms that share no code agree. This is what makes it safe for later modules to use either.

---

## Decisions We Made

| Decision | Category | Could have been |
|---|---|---|
| Variables as binder distance (indices) | (a) de Bruijn | named terms only |
| Indices, not levels | (c) | de Bruijn levels |
| Separate `DTerm` type | (c) | replace `Term` |
| Display-only `hint` | (c) | no names at all |
| Free vars numbered via Γ | (b) TAPL | locally nameless |
| Default Γ sorted alphabetically | (c) | order of first occurrence |
| Freshen hints on the way back | (a) | — |
| TAPL's shift / subst / substTop | (b) | explicit substitutions (Module 32) |
| Keep `substDBNoShift` as the bug exhibit | (c) | — |
| Dedicated small `parseDB` | (c) | extend the lexer with numbers |

## What We Proved

Checked by `npm test` (77 tests, all passing) and quoted from `npm run demo`:

1. **α-equivalent terms become identical trees.** `λx. λy. x y` and `λa. λb. a b` both become `λ. λ. 1 0`.
2. **Three independent α-algorithms agree** on 3000/3000 random pairs: scope distance, canonical forms, and de Bruijn equality.
3. **Conversion loses nothing.** `fromDeBruijn(toDeBruijn(t)) ≡α t` for 3000/3000 random terms, and hint-freshening prevents capture (`λx. λx. 1` becomes `λx. λx1. x`).
4. **De Bruijn substitution equals Module 5's named substitution** on 3000 random pairs, with no fresh names used.
5. **Forgetting to shift is capture in disguise.** On `(λy. x)[x := y]`, `substTop` gives `λ. 1` (= `λy1. y`), while the unshifted version gives `λ. 0` (= `λy1. y1`, the identity).
6. **Indices are relative.** `λx. λy. x (λz. z x)` becomes `λ. λ. 1 λ. 0 2`: the same `x` is 1 in one place and 2 in another. And in `(λx. x) y` → `(λ. 0) 0`, one number, 0, means two different variables.
