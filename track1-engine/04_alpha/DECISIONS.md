# Module 4: Free Variables & α-Equivalence · DECISIONS

Module 4 adds `src/alpha.ts`: free variables, binding sites for every variable use, α-equivalence
(two independent ways), and safe renaming of a single binder. Modules 1–3 are unchanged, and their tests
pass in `tests/`: 53 tests total, 12 new.

Categories: **(a)** forced by the spec · **(b)** forced by an external contract · **(c)** our convention.

---

## Paths
```ts
export type Step = "fn" | "arg" | "body";
export type Path = readonly Step[];
```
- **A node's address is the list of child-choices from the root. (a)** In a tree, that route identifies a node uniquely. Two occurrences of the same name at different places are *different occurrences*, and a path tells them apart.
- **Step names `fn`/`arg`/`body`. (c)** They match the `Term` field names, so a path reads like the field accesses you'd write (`t.fn.body.arg`). The rewriting literature uses numbers (1, 2) for the same idea.
- **The root prints as `ε`. (b)** The empty sequence is written ε in the term-rewriting literature (e.g. *Term Rewriting Systems*, Terese 2003). Module 7 reuses paths to name redexes.

## `freeVars`
- **The three defining equations, transcribed. (a)** `FV(x) = {x}`, `FV(λx.M) = FV(M) − {x}`, `FV(M N) = FV(M) ∪ FV(N)`. This is the standard definition (Barendregt 1984, ch. 2; Pierce, *TAPL* §5.3).
- **Returns a fresh `Set`, recomputed on every call. (c)** No caching on nodes. Terms are small, and caching would complicate immutable sharing. Module 19 (environments) makes free-variable lookups cheap in a different way.
- **`sorted()` for display. (c)** Sets keep insertion order, but alphabetical output is stable across equivalent terms and makes tests readable.

## `occurrences`
- **Binder lookup searches the scope from the innermost binder outward. (a)** That is shadowing (P2.3): `λx. λx. x` binds to the *inner* λ. Searching from the outside would implement a different, wrong language.
- **Scope arrays are copied at each λ (`[...scope, …]`). (c)** O(depth) copying per λ, so O(n²) in the worst case. We chose clarity over a persistent linked list. Terms here have depth under ~50.

## `alphaEquivalent`
- **Compare bound variables by *binder distance*, and free variables by *name*. (a)** Two bound uses match exactly when they refer to corresponding binders. "Corresponding" means the same number of λs outward. Free names have no binder, so their name is all they have. The distance *is* the de Bruijn index (Module 6). This function is de Bruijn conversion done on the fly, without building the converted term.
- **A walk over both trees at once. (c)** The alternative is to convert both terms to a canonical form and compare syntactically. We implement that too (`canonicalize`) and test that the two agree.

## `renameBinder` (α-conversion)
- **Allowed exactly when (1) the new name `y` isn't free in the body, and (2) no free `x` in the body sits under an inner `λy`. (a)** These are the precise conditions under which `λx. M → λy. M{x↦y}` preserves every occurrence's binder (the side conditions on α-conversion in Barendregt 1984, ch. 2). Violating (1) captures an outside `y`. Violating (2) makes a renamed `x` get captured by an inner `λy`.
- **Refuse instead of repairing. (c)** A smarter version would rename the inner `λy` too, and that's exactly what capture-avoiding substitution does in Module 5. Refusing here makes the danger visible first. The test "a refused rename really would have changed the meaning" shows that a naive rename, in each refused case, produces a term that is *not* α-equivalent.
- **Only the outermost binder. (c)** Enough to demonstrate α-conversion. Renaming at an arbitrary path would need a path-based rewrite, which arrives with Module 8's contexts.
- **Inner binders named `x` stop the rename. (a)** Below `λx` the `x`'s belong to that inner binder (shadowing), so they must not be renamed.

## `canonicalize`
- **Rename every binder in pre-order to `v0, v1, …`. (c)** Any injective, structure-determined naming works. Pre-order (function before argument) is simple and deterministic.
- **Skip names that are free in the term. (a)** Otherwise a new binder `v0` could capture a free `v0`, changing the meaning. That's the capture problem again.
- **Result: Barendregt's variable convention. (b)** All bound names are distinct from each other and from the free names. Textbook proofs routinely "assume the variable convention." `canonicalize` makes that assumption true for any given term.

## Testing strategy
- **Cross-check two independent α-tests on 3000 random pairs. (c)** If both algorithms had the same bug, they could agree on a wrong answer. But they share no code (scope-distance walk vs rename-then-compare), which makes that unlikely. The generator uses only the names `x`, `y`, so equivalent pairs are common: 147 of 3000.
- **Every accepted rename is checked to be α-equivalent, and every refused rename is checked to be harmful if done naively. (c)** Together these test both directions on the random corpus. *Accepted ⇒ safe*: no accepted rename changed the meaning. *Refused ⇒ necessary*: every refusal blocked a naive rename that really would have changed the meaning, so there were no needless refusals.

---

## Decisions We Made

| Decision | Category | Could have been |
|---|---|---|
| Paths as `fn`/`arg`/`body` lists, root `ε` | (a)/(c)/(b) | numeric positions 1/2 |
| FV by the three equations | (a) | — |
| No FV caching | (c) | memoize per node |
| Innermost-first binder lookup | (a) shadowing | — |
| α via binder distance + free names | (a) | — |
| Also α via canonical forms, cross-checked | (c) | one algorithm |
| Rename refuses on capture (two conditions) | (a) conditions, (c) refusing | auto-rename inner binders (Module 5) |
| Rename only the outermost binder | (c) | rename at any path |
| Canonical names `v0, v1, …`, pre-order, skipping free names | (c)/(a) | any injective scheme |

## What We Proved

Checked by `npm test` (53 tests, all passing) and quoted from `npm run demo`:

1. **Free variables are computed correctly and depend on binding, not spelling.** In `(λx. x) x`, FV = `{x}`: one `x` is bound, the other free.
2. **Every use knows its binder, with shadowing respected.** In `(λx. λx. x y) x`, the inner `x` is bound by the λ at `fn.body`, the inner one. `y` and the final `x` are free.
3. **Bound names carry no meaning.** `λx. λy. x y ≡α λy. λx. y x` is true, and `λx. λx. x ≡α λa. λb. a` is false: inner vs outer binder matters.
4. **Two independent α-algorithms agree on 3000/3000 random pairs**, 147 of which are α-equivalent.
5. **Capture is real.** `renameBinder` refuses `λx. x y` (x→y) and `λx. λy. x` (x→y). In every refused random case, the naive rename produces a term that is not α-equivalent to the original.
