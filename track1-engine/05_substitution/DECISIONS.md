# Module 5: Capture-Avoiding Substitution · DECISIONS

Module 5 adds `src/subst.ts`: `M[x := N]` done wrong (`substNaive`) and done right (`subst`), plus `freshName`.
It also adds the first **vocabulary web**: five `concept_*.html` pages and a hub, `concept_how_they_connect.html`.
Modules 1–4 are unchanged. Tests: 65 total (12 new), all passing.

Categories: **(a)** forced by the spec · **(b)** forced by an external contract · **(c)** our convention.

---

## The definition
```
x[x := N]       = N
y[x := N]       = y                              (y ≠ x)
(P Q)[x := N]   = P[x := N] Q[x := N]
(λx. P)[x := N] = λx. P
(λy. P)[x := N] = λy. P[x := N]                  if y ∉ FV(N) or x ∉ FV(P)
(λy. P)[x := N] = λz. P[y := z][x := N]          otherwise, z fresh
```
- **These six equations. (a/b)** This is Curry's capture-avoiding substitution, the definition in Barendregt (ch. 2) and in Hindley & Seldin's *Lambda-Calculus and Combinators*. Every later module's correctness (β-reduction, normal forms, type preservation) assumes exactly this operation.
- **Only *free* occurrences of x are replaced. (a)** Bound x's belong to some inner `λx` and aren't the x we mean. The fourth equation stops at a shadowing binder.
- **Rename only when needed. (c)** The fifth equation's condition, "`y ∉ FV(N)` or `x ∉ FV(P)`", means renaming happens *only* when a capture would otherwise occur. Some presentations rename every binder they pass. Minimal renaming keeps output recognizable: `(λy. x y)[x := f]` stays `λy. f y`.

## Fresh names
- **`freshName(base, avoid)`: strip trailing digits, then try `base1`, `base2`, … (c)** Readable (`y` → `y1`), deterministic, and it always terminates because `avoid` is finite. Alternatives: a global counter (`_g42`), or primes (`y'`, `y''`). We keep the base name so learners can see which binder was renamed.
- **The avoid set is FV(N) ∪ FV(body) ∪ {x}. (a)** `z ∉ FV(N)` so N's free variables can't be captured by `λz`. `z ∉ FV(body)` so the body's own free `z` isn't captured by the renamed binder. That's the case `(λy. x y1)[x := y]`, which must skip `y1` and use `y2` (tested). `z ≠ x`, otherwise renaming y to x would make the body's y's look like the x being substituted.
- **Renaming uses `subst(body, y, Var(z))` recursively. (a)** Renaming is substitution of a variable for a variable, and it can itself hit an inner binder named `z`. Recursion handles that case (tested: "nested renames").

## Sharing
- **Return the *same object* when nothing changes. (c)** When x isn't free below a λ, or when both sides of an application come back unchanged, the original node is returned. This is safe because terms are immutable (Module 1). It saves allocation, and Module 9's reduction traces will show untouched subtrees staying physically identical.

## The deliberately wrong `substNaive`
- **Kept in the engine and exported. (c)** A course about capture needs a capturing implementation to compare against. It still respects shadowing (equation 4), so it fails *only* through capture. That isolates the one bug that matters.

## `SubstLog`
- **An optional log of `{ from, to }` renames. (c)** Purely for teaching and the Lab. Passing `undefined` costs nothing.

## Testing
- **The FV law. (a)** `FV(M[x:=N]) = (FV(M) − {x}) ∪ (FV(N) if x ∈ FV(M))` is a standard property of correct substitution. It is checked on 3000 random triples.
- **"Naive goes wrong ⇒ some binder of M is free in N". (a)** Capture is the *only* way the naive version can differ.
- **Discovered while building this module:** an FV comparison does **not** detect every capture. Our first test assumed it did and failed on a real counterexample. A captured name can also occur free elsewhere, leaving FV unchanged. The demo measures it: 414 wrong results in 3000, of which only 192 change FV. The test now asserts the true statement, and the gap became the Brain Exercise.
- **Substitution respects α (c), and the Substitution Lemma (a).** `M[x:=N][y:=L] ≡α M[y:=L][x:=N[y:=L]]` when `x ≠ y` and `x ∉ FV(L)` is a standard lemma (Barendregt ch. 2), used later to prove confluence. We check it on over 1000 random instances. A substitution with a subtle renaming bug usually breaks it.

## The vocabulary web
- **Five `concept_*.html` pages plus a hub. (c)** Binder, scope, free variable, bound variable and capture are the terms learners most often conflate. They are placed here, not in Module 4, because *capture* only becomes concrete with substitution. Filenames spell out the topic so the folder can be scanned by eye.

---

## Decisions We Made

| Decision | Category | Could have been |
|---|---|---|
| Curry's six equations | (a/b) | de Bruijn substitution (Module 6), explicit substitutions (Module 32) |
| Replace free occurrences only | (a) | — |
| Rename only when capture is possible | (c) | always rename binders |
| `freshName`: base + number | (c) | global counter, primes |
| Avoid FV(N) ∪ FV(body) ∪ {x} | (a) | — |
| Share unchanged subtrees | (c) | always rebuild |
| Keep `substNaive` for comparison | (c) | delete it |
| Optional rename log | (c) | — |
| Vocabulary web in this module | (c) | put it in Module 4 |

## What We Proved

Checked by `npm test` (65 tests, all passing) and quoted from `npm run demo`:

1. **Naive substitution changes meanings.** `(λy. x)[x := y]` naively gives `λy. y` (the identity). Correctly, it gives `λy1. y` (a constant function returning the outside `y`).
2. **Capture-avoiding substitution obeys the FV law** on 3000 random triples, **respects α-equivalence** (2000), and **satisfies the Substitution Lemma** (over 1000 instances).
3. **Capture is the only failure mode of the naive version,** and it's common: of 3000 random substitutions, 1334 had a binder of M free in N, and 414 actually changed meaning.
4. **Free-variable checks are not enough to detect capture.** Only 192 of those 414 changed FV. The simplest stealth case is `((λy. x) y)[x := y]` (see the tutorial's Brain Exercise).
5. **Fresh names avoid the body's own free variables too.** `(λy. x y1)[x := y]` gives `λy2. y y1`.
