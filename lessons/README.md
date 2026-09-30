# Lessons: Cross-Module Concept Clusters

Some ideas span several modules and don't belong to any single one. Each gets a folder `lessons/NN_cluster_name/`
with `01_explainer.html` (tutorial-style, topic-scoped) and numbered `*_deepdive.html` pages that go deeper than any
one module's code needs: history, real-world implementations, failure modes, trade-offs.

## Built

| # | Cluster | Spans modules | Why it lives here, not in a module |
|---|---|---|---|
| 01 | [`01_associativity_and_currying`](01_associativity_and_currying/01_explainer.html) | 1 (printer), 3 (parser), 24 (→ types), 27 (implication), C1 (Alonzo-ML operators) | Left-associative application, right-extending λ-bodies and right-associative arrows are *one* idea (functions take one argument) that shows up in printing, parsing, typing and logic. No single module sees all four. |

Deep dives in 01: `02_deepdive_left_vs_right_in_parsers.html` (loops vs recursion, folds, LR/Pratt), `03_deepdive_currying_and_the_arrow.html`
(why application and → point opposite ways), `04_deepdive_real_languages_and_bugs.html` (JavaScript, Python, C and Haskell, measured on this machine).

## Planned

| Cluster | Spans modules | Why central |
|---|---|---|
| `history_of_lambda` | all, esp. Track H | The narrative arc (Frege → Church → Turing → Curry → Landin → Scott → Milner → de Bruijn → modern proof assistants) frames every module. Track H rebuilds the episodes, and this cluster connects them. |
| `binding_and_names` | 4, 5, 6 → 19, 23, C7 | Names + α, fresh-name substitution, de Bruijn indices, environments, levels and closure conversion are all answers to "how do we represent binders?" |
| `evaluation_strategies` | 9, 11, 20–23 | Call-by-name/value/need appear as rewriting strategies, then as machines, then in real languages. |
| `fixed_points_and_self_reference` | 15, 18, H2, H3 | Y, self-interpreters, the Kleene–Rosser paradox and undecidability are one idea viewed four ways. |

Each planned cluster is confirmed, and its module list finalized, before it is built.
