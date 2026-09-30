# Module 8: β-Contraction & One-Step Reduction · DECISIONS

Module 8 adds `src/reduce.ts`: contexts as data (`decompose`, `plug`), contraction of a single redex (`contract`),
one step anywhere in a term (`stepAt`), the whole one-step relation (`oneStepReducts`), and a de Bruijn twin
(`stepAtDB`) for cross-checking. It also adds a vocabulary web for redex, contractum, context and reduct
(`concept_*.html`, generated from `vocab.json` by `tools/vocab_web.py`). Tests: 99 total (10 new), all passing.

Categories: **(a)** forced by the spec · **(b)** forced by an external contract · **(c)** our convention.

---

## The rules
- **β: `(λx. M) N → M[x := N]`, using Module 5's capture-avoiding `subst`. (a)** This is the only computation rule of the λ-calculus (Church 1936). Using the naive substitution would make reduction produce wrong answers. The demo shows a real β-step, `λz. (λx. λz. x z) z`, that needs the rename `z→z1`.
- **η: `λx. M x → M` when `x ∉ FV(M)`. (a)** The side condition was already enforced by `isEtaRedex` (Module 7).
- **`contract` works only at the root of a redex, and throws otherwise. (c)** Contraction is the rule itself. *Where* it applies is the context's job, and that split keeps each function honest.

## Contexts as data
```ts
type Ctx = hole | appL(ctx, arg) | appR(fn, ctx) | lam(param, ctx)
```
- **One constructor per congruence rule. (a)** The textbook compatible closure has exactly three congruence rules: app-left, app-right and ξ (under a λ). A context is the record of which rules a step went through, so `ruleChain` can read the derivation straight off the context.
- **Contexts are built by `decompose(t, path)`, not written by hand. (c)** A path (Module 7) already identifies the redex, so the context is simply "the rest". The test checks `plug(decompose(t, p)) = t` for every redex of 3000 random terms.
- **`plug` does *not* avoid capture. (a)** This is intentional and essential. In `λx. □`, the redex placed in the hole must see `λx`'s variable. Capture-avoiding plugging would break every step under a binder. The test "plugging DOES capture" pins it.
- **`printCtx` draws the hole by plugging a placeholder variable `__` and replacing it with `□`. (c)** It reuses the real printer, so a context prints with exactly the same parenthesization as a term. `__` is a legal identifier that nobody writes by hand. A dedicated context printer would duplicate Module 1.

## One step and the one-step relation
- **`stepAt` returns every piece of the step: path, context, redex, contractum, reduct, renames. (c)** The tutorial, Lab and vocabulary web all talk about these pieces, so the engine hands them over rather than making each client recompute them.
- **`stepAt` without a kind infers β first, then η, and refuses anything else. (c)** A path could in principle name a node that is both a β- and an η-redex, e.g. `λx. (λy. y) x` is an η-redex whose body is a β-redex, but those are *different* nodes (different paths). So the inference is unambiguous. An explicit `kind` is still accepted, for clarity.
- **`oneStepReducts` = one entry per redex (β by default). (a)** That is the definition of the relation `→β` from a given term.

## The de Bruijn twin
- **`stepAtDB` walks the same path on a nameless term and uses Module 6's `substTop` at the redex. (c)** Paths are identical in both representations (same tree shape). Comparing the two on every redex of 3000 random terms (2306 steps) checks named β against nameless β, two implementations that share no substitution code.

---

## Decisions We Made

| Decision | Category | Could have been |
|---|---|---|
| β via capture-avoiding `subst` | (a) | — |
| η with the `x ∉ FV(M)` side condition | (a) | — |
| `contract` only at the redex root | (c) | one function that searches and contracts |
| Contexts as data, one constructor per congruence rule | (a) shape, (c) representation | paths + rebuild functions only |
| `plug` captures on purpose | (a) | — |
| Context printing via a placeholder variable | (c) | a separate context printer |
| `stepAt` returns all the pieces | (c) | return only the new term |
| Named vs nameless cross-check | (c) | trust one implementation |

## What We Proved

Checked by `npm test` (99 tests, all passing) and quoted from `npm run demo`:

1. **A step is decompose → contract → plug.** For `λx. (λy. y) x z` at `body.fn`: context `λx. □ z`, redex `(λy. y) x`, contractum `x`, reduct `λx. x z`, rules `ξ ∘ app-L ∘ β`.
2. **β-steps avoid capture.** `λz. (λx. λz. x z) z` → `λz. λz1. z z1` (renamed `z→z1`).
3. **`decompose` and `plug` are inverses** at every redex of 3000 random terms. Plugging captures, as it must.
4. **Named and nameless β agree on 2306/2306 steps.**
5. **Steps never invent free variables** (3000 random terms, β and η), and **α-equivalent terms step to α-equivalent reducts** (1000).
6. **Order matters for cost:** `(λx. x x) ((λy. y) z)` reaches normal form in 2 steps inner-first but 3 outer-first, because the outer step copies the inner redex. (Checked in the Lab, and the foundation of Module 9.)
