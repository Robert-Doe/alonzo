# Module 11: η-Conversion & Normal-Form Zoo · DECISIONS

Module 11 adds `src/normal.ts`: predicates for five kinds of "finished" term, η-expansion, a βη normal-order
strategy, and one normalizer per form. It changes one line of Module 9's `run` (below) and adds a vocabulary
web for the five forms. Tests: 130 total (9 new), all passing, in about 4 s.

Categories: **(a)** forced by the spec · **(b)** forced by an external contract · **(c)** our convention.

---

## The five forms
| Form | Definition | Code |
|---|---|---|
| βη-normal | no β- or η-redex anywhere | `findRedexes(t, ["beta","eta"]).length === 0` |
| β-normal | no β-redex anywhere | Module 7's `isBetaNormal` |
| head normal (HNF) | `λx⃗. y M⃗`, a variable at the head | `headRedex(t) === null` |
| weak head normal (WHNF) | a λ, or `y M⃗` | `weakHeadRedex(t) === null` |
| value | a λ or a variable | Module 9's `isValue` |

- **Definitions. (b)** The standard ones: Barendregt 1984 for HNF and βη, Peyton Jones 1987 for WHNF, Plotkin 1975 for values.
- **HNF and WHNF are defined as "no (weak-)head redex". (a)** Given Module 7's precise head-redex definitions, these are equivalent to the textbook shapes. That's a structural fact: a term has no head redex exactly when the bottom of its (post-λ) spine is a variable. We reuse the definitions rather than restating the shapes, so the two can never disagree.
- **"Neutral" (a variable applied to arguments) is reported too. (c)** It's the other half of WHNF and becomes central in normalization by evaluation (Module 23).
- **Inclusions tested, not assumed. (a)** βη-NF ⊆ β-NF ⊆ HNF ⊆ WHNF, and value ⊆ WHNF, checked on 3000 random terms.

## η
- **η-reduction was already a legal step (Module 8). Module 11 makes it a *strategy* choice. (c)** `normalOrderBetaEta` picks the leftmost-outermost redex of either kind.
- **Module 9's `run` now calls `stepAt(cur, r.path, r.kind)` instead of forcing `"beta"`. (c)** It is a one-line, backward-compatible change: every Module 9 strategy still returns β-redexes, so all 112 carried tests pass unchanged. The alternative, a separate `runBetaEta`, would duplicate the loop.
- **`etaExpand(M) = λx. M x` with `x` fresh. (a)** Freshness is forced: expanding `f x` with binder `x` would give `λx. f x x`, a different function. The engine picks `x1`.
- **βη normal forms are unique (observed). (a)** βη-reduction is confluent, like β (Barendregt 1984). The test checks that "interleave β and η" and "β first, then η" end α-equal (800 random terms).

## Normalizers
- **One per form, each a strategy from Module 9: WHNF = call-by-name, HNF = head reduction, β-NF = normal order, βη-NF = βη normal order. (a)** Each strategy stops exactly when its form is reached. That's how Module 7 defined the positions they pick. The tests confirm that every "done" result satisfies its predicate (1000 random terms).

## `λx. Ω`, the showcase term
- **Chosen to separate WHNF (and value) from "having an HNF". (c)** It's already a value and a WHNF (0 steps), but head reduction never finishes: it has no head normal form. Such terms are called *unsolvable*, and are the λ-calculus's notion of "meaningless" (Barendregt), which leads to Böhm trees (Module 34).

## Vocabulary web
- **Five concept pages plus a hub, generated from `vocab.json` by `tools/vocab_web.py`. (c)** The roadmap placed a normal-form web here (it originally said "Module 10" before the renumbering). Generating from JSON keeps every vocabulary web in the course identical in structure.

---

## Decisions We Made

| Decision | Category | Could have been |
|---|---|---|
| Standard definitions of the five forms | (b) | — |
| HNF/WHNF via "no (weak-)head redex" | (a) | re-implement the shapes |
| Report "neutral" too | (c) | — |
| βη normal order as a strategy | (c) | separate η pass |
| `run` honours `r.kind` | (c) | a second run loop |
| Fresh binder in η-expansion | (a) | — |
| One normalizer per form, via strategies | (a) | bespoke normalizers |
| `λx. Ω` as the unsolvable example | (c) | any unsolvable term |

## What We Proved

Checked by `npm test` (130 tests, all passing) and quoted from `npm run demo`:

1. **The zoo is real:** `f` is in all five forms; `λx. f x` is β- but not βη-normal; `x ((λa. a) b)` is HNF but not β-normal; `λx. (λy. y) x` is WHNF but not HNF; `(λx. x) y` is in none.
2. **The inclusions hold** on 3000 random terms: βη-NF 1769 ⊆ β-NF 1796 ⊆ HNF 2164 ⊆ WHNF 2401, with 1818 values and 599 terms not even in WHNF.
3. **Four normalizers, three different answers.** `(λx. λy. x y) (λz. (λw. w) z)` becomes `λy. (λz. (λw. w) z) y` (WHNF, 1 step), `λy. y` (HNF and β-NF, 3 steps) and `λw. w` (βη-NF, 3 steps), which is α-equal to `λy. y`.
4. **η is extensionality.** `λz. (λx. f x) z` and `f` have different β-normal forms but the same βη-normal form.
5. **`λx. Ω` is a value with no head normal form.** Its WHNF takes 0 steps, and head reduction runs out of fuel.
