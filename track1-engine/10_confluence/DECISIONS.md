# Module 10: Reduction Graphs, Residuals & Church–Rosser · DECISIONS

Module 10 adds `src/graph.ts`. It explores *every* reduction path of a term (the reduction graph), checks
Church–Rosser on the finite graph, tracks residuals, and computes Takahashi's complete development `M*` to test
the triangle property. Tests: 121 total (9 new), all passing, in about 4 s.

Categories: **(a)** forced by the spec · **(b)** forced by an external contract · **(c)** our convention.

---

## The reduction graph
- **Nodes are terms up to α; edges are single β-steps labelled by redex path. (a)** Reduction is defined up to α-equivalence. Without merging, Ω would produce an infinite chain of "different" terms (`λx. x x`, `λx1. x1 x1`, …) instead of one node with a loop.
- **The α-key is the de Bruijn printout under the start term's free variables. (c)** Module 6 made α-equivalence into string equality, so a `Map<string, id>` merges nodes in O(1). Using the *start* term's context for every node is safe **(a)**: Module 8 proved (and tested) that steps never create free variables.
- **Breadth-first, with `depth` = BFS distance. (c)** BFS gives the Lab its layered drawing, and "depth" means shortest number of steps from the start.
- **Limits: `maxNodes` (default 200) and `maxSize` (default 300 nodes per term), plus a `truncated` flag. (c)** Graphs can be infinite (`(λx. x x x)(λx. x x x)`). When a limit cuts exploration, every conclusion drawn from the graph is marked partial, and the tests skip truncated graphs instead of asserting on them.

## Checking Church–Rosser on a finite graph
- **"Every fork rejoins": for each node with two different successors, their reachable sets intersect. (a)** This is the diamond/Church–Rosser property, restricted to the explored graph. Reachability is a simple fixpoint (graphs have ≤ 200 nodes).
- **"At most one normal form" and "no node cut off from the normal form". (a)** These are consequences of Church–Rosser. The second is the Brain Exercise: if M has a normal form, *every* reduct of M still reaches it.
- **This is observation, not proof. (a)** A finite check on sampled terms can't prove a theorem about all terms. The classic proofs (Tait–Martin-Löf via parallel reduction; Takahashi 1995 via complete development) are described in the tutorial, and we test Takahashi's key lemma directly.

## Residuals
- **Mark R's λ by renaming its binder to `__res`, fire S, and collect the β-redexes whose λ still carries the mark. (c)** Renaming a binder is an α-conversion (meaning unchanged, and Module 4's `renameBinder` checks capture). Substitution copies or erases whole sub-terms, so the mark travels with every copy of R and vanishes if R is erased or fired. Redexes *created* by the step carry no mark, so they are correctly *not* residuals. The alternative, computing residual paths symbolically from the two paths, is what textbooks do (Barendregt's "residual" definition). It is precise but much harder to read.
- **Marks are removed afterwards, restoring the original binder name when that's capture-safe. (c)** Learners see `(λy. y) z ((λy. y) z)`, not `(λ__res. …)`.
- **Tested: residuals are always β-redexes, and the fired redex has none. (a)** This holds for the λ-calculus (a residual is a copy of an application node whose function is a λ). It's checked on every redex pair of 1500 random terms.

## Complete development `M*`
```
x* = x    (λx. M)* = λx. M*    ((λx. M) N)* = M*[x := N*]    (M N)* = M* N*   (M not a λ)
```
- **Takahashi's definition, transcribed. (b)** It contracts every redex *present in M* at once, inside-out. Redexes created along the way are not contracted, so `((λx. x a) (λy. y))* = (λy. y) a`.
- **Triangle property tested by reachability. (c)** Takahashi's lemma says that if M → N then N ⇒ M* in one *parallel* step. We check the weaker, directly observable consequence N →* M*, by exploring N's graph. Only complete (untruncated) graphs count, and more than 300 cases are required.

---

## Decisions We Made

| Decision | Category | Could have been |
|---|---|---|
| Nodes up to α | (a) | syntactic nodes (infinite Ω chain) |
| α-key = de Bruijn printout under the start's context | (c) / (a) | pairwise `alphaEquivalent` |
| BFS with depth | (c) | DFS |
| Node/size limits with a `truncated` flag | (c) | unbounded exploration |
| Fork-rejoin via reachability sets | (a) | search for joins on demand |
| Residuals via binder marking | (c) | symbolic residual paths |
| Restore original binder names | (c) | leave marker names |
| Takahashi's `M*` | (b) | Tait–Martin-Löf parallel reduction relation |
| Triangle checked as N →* M* | (c) | implement ⇒ and check N ⇒ M* |

## What We Proved

Checked by `npm test` (121 tests, all passing) and quoted from `npm run demo`:

1. **The whole picture of `(λx. x x) ((λy. y) z)`:** 6 nodes, 7 edges, 2 forks, both rejoin, and the unique normal form is `z z`.
2. **Loops are nodes, not infinities.** Ω is one node with a self-loop. `(λx. y) Ω` has a self-loop *and* an exit to `y`, and every node can still reach `y`.
3. **Church–Rosser holds on every complete graph of 1500 random terms:** 1497 complete graphs, 3726 forks, 3726 rejoined, and no graph with more than one normal form.
4. **Residuals behave as the theory says.** A redex can be copied (`[fn, arg]`), erased (`[]`), kept and modified (`[ε]`), and redexes created by a step are not residuals.
5. **The triangle property holds** on every complete case from 1500 random terms. For example, both one-step reducts of `(λx. x x) ((λy. y) z)` reach `M* = z z`.
