# Module 9: Reduction Strategies & Traces · DECISIONS

Module 9 adds `src/strategy.ts`: five strategies (functions from a term to the redex to contract next), a
fuel-limited `run`, and trace formatting. Tests: 112 total (13 new), all passing.

Categories: **(a)** forced by the spec · **(b)** forced by an external contract · **(c)** our convention.

---

## A strategy is a function `Term → Redex | null`
- **The representation. (c)** It's the smallest thing that captures "which redex next?". `null` means "this strategy has nothing more to do", which for weak strategies is *not* the same as β-normal form, so `run` reports both. An alternative is to give each strategy its own evaluator (as abstract machines do in Modules 20–21). Here we want all five to share one stepping engine (Module 8), so they can only differ in the choice.

## The five strategies
| Strategy | Picks | Stops at | Source |
|---|---|---|---|
| normal order | leftmost-outermost, anywhere | β-normal form | (b) Curry & Feys 1958; Barendregt 1984 |
| applicative order | leftmost-innermost, anywhere | β-normal form | (b) Barendregt 1984 |
| call-by-name | weak-head redex | weak head normal form | (b) Plotkin 1975, "Call-by-name, call-by-value and the λ-calculus" |
| call-by-value | function, then argument, to values; then contract | a value (or stuck) | (b) Plotkin 1975 |
| head reduction | head redex | head normal form | (b) Barendregt 1984 |

- **Values for CBV are λs *and variables*. (c)** Plotkin's CBV is usually stated for closed terms, where values are exactly λs. We run open terms (random terms have free variables), so a variable must count as a value too, or `f x` could never proceed. `x V` with a variable in function position is *stuck*: no rule applies, and the strategy returns `null`.
- **CBV evaluates the function before the argument. (c)** Plotkin's rules allow either order. Left-to-right is JavaScript's defined order. OCaml, by contrast, leaves argument order unspecified.
- **CBN is "the weak-head redex". (a)** Given Module 7's definitions, call-by-name reduction *is* repeated contraction of the weak-head redex.

## Running
- **Fuel is a step budget, not a timeout. (c)** Deterministic and reproducible: the same term and fuel always stop at the same step. A wall-clock timeout would make tests flaky.
- **"out-of-fuel" is a result, not an exception. (a)** Whether a term has a normal form is undecidable (Church 1936, rebuilt in Track H3). *Any* evaluator must be able to say "I don't know yet".
- **A size limit (`maxSize`, default 20,000 nodes) with its own status `too-big`. (c)** Some terms grow without bound (`(λx. x x x)(λx. x x x)` grows by 7 nodes per step). Without a cap, a run could exhaust memory before exhausting fuel.
- **`keepTrace: false` for long experiments. (c)** Traces hold every intermediate term, which is fine for demos and wasteful for 2000-term property tests.
- **Each step re-searches the whole term. (c)** O(size) per step, so O(size × steps) per run. Abstract machines (Modules 19–22) exist precisely to avoid this re-search. Here clarity wins.

## Testing the big theorems empirically
- **Unique normal forms. (a)** Every strategy that reaches β-normal form reaches the *same* one, up to α (2000 random terms). This is a consequence of Church–Rosser (Module 10).
- **Standardization, observed. (a)** Whenever applicative order finds a normal form, normal order finds one too (2000 random terms). Random terms rarely *separate* the two, because they seldom discard a divergent argument. So a second, **planted** experiment wraps each term as `(λd. t) Ω`: normal order normalizes exactly when `t` does, and applicative order never does (500/500 vs 0/500 in the demo).
- **Property-test size cap 1000. (c)** At 3000, looping random terms grew until the size limit and the suite took 27 s. At 1000 it takes about 4 s. Every test that asserts something about *finishing* terms is unaffected, because those terms stay far below the cap.

---

## Decisions We Made

| Decision | Category | Could have been |
|---|---|---|
| Strategy = `Term → Redex \| null` | (c) | one evaluator per strategy |
| The five classic strategies | (b) | — |
| CBV values include variables | (c) | closed terms only |
| CBV function-before-argument | (c) | argument first |
| Fuel as step count | (c) | wall-clock timeout |
| Out-of-fuel is a status | (a) | throw |
| Size cap with `too-big` status | (c) | none |
| Re-search per step | (c) | machines (later modules) |
| Planted-divergence experiment | (c) | rely on random terms only |

## What We Proved

Checked by `npm test` (112 tests, all passing) and quoted from `npm run demo`:

1. **Strategy decides termination.** `(λx. y) Ω`: normal order, call-by-name and head reduction finish in 1 step (`y`). Applicative order and call-by-value run out of fuel.
2. **Strategy decides cost, in both directions.** Duplication: `(λx. x x) ((λy. y) z)` takes 3 steps normal vs 2 applicative. Discarding: `(λx. λy. y) ((λz. z) a)` takes 1 vs 2.
3. **Weak strategies stop early by design.** CBN and CBV leave `λx. (λy. y) x` untouched (0 steps), and head reduction leaves `x ((λa. a) b)` untouched.
4. **Normal forms are unique** across all five strategies (2000 terms), and **standardization holds** on 2000 random terms: 1997 reach a normal form under both orders, and 0 reach different ones.
5. **Normal order is complete where applicative order isn't:** `(λd. t) Ω` normalizes under normal order for 500/500 random `t`, and under applicative order for 0/500.
6. **Some terms grow forever:** `(λx. x x x) (λx. x x x)` has sizes 13 → 20 → 27 → 34 → 41 → 48 → 55.
