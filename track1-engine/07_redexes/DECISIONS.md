# Module 7: Redex Anatomy · DECISIONS

Module 7 adds `src/redex.ts`, which finds β- and η-redexes by path, names the positions that strategies are defined
by, and defines β-normal form. It also adds `src/spans.ts`, which prints a term while recording where each sub-term
lands in the text. Nothing is *reduced* yet: this module only answers "where could a step happen?"
Tests: 89 total (12 new), all passing.

Categories: **(a)** forced by the spec · **(b)** forced by an external contract · **(c)** our convention.

---

## What counts as a redex
- **β-redex = an application whose function part is an abstraction, `(λx. M) N`. (a)** It's the left side of the β-rule (Church 1936; Barendregt 1984), and nothing else can take a β-step.
- **η-redex = `λx. M x` with `x ∉ FV(M)`. (a)** The side condition is essential. `λx. x x` has the right shape, but "removing" the λ would leave a free `x` whose meaning changed. The test `isEtaRedex(λx. x x) === false` covers it.
- **β only by default, η on request. (c)** Most of the course (strategies, machines, types) is about β. η arrives properly in Module 11. The functions take a `kinds` list so the Lab can show both.

## Order: pre-order
- **`findRedexes` returns redexes in pre-order: node, then function part, then argument. (a)** For a printed term, pre-order is the order in which redexes *start* in the text, and an enclosing redex comes before the ones inside it. That makes "leftmost-outermost" simply "the first one", with no separate search.

## The named positions
- **Leftmost-outermost = first in pre-order. (b)** Normal-order reduction (Module 9) is defined as "always contract this one" (Curry & Feys 1958; Barendregt 1984). The standardization theorem says this choice finds the normal form whenever one exists.
- **Leftmost-innermost = the first redex (in pre-order) that contains no other redex. (b)** This is applicative order's choice. We compute "contains" with path prefixes: if R's path is a proper prefix of S's path, S is inside R.
- **Head redex: strip leading λs, then descend the function spine. The deepest application on the spine is a redex exactly when its function is a λ. (b)** This is Barendregt's definition (terms of the form λx⃗. (λy. M) N N⃗). In code, going *down* the spine, the first application whose `fn` is a λ is that deepest one, because every application above it has an application as its `fn`.
- **Weak-head redex: the same, but none if the term starts with λ. (b)** "Weak" means "never under a binder". This is what lazy functional languages evaluate to (Module 11, Module 20).
- **A variable at the head means no head redex, even if other redexes exist. (a)** `x ((λa. a) b)` is stuck at the head. No step anywhere can change the fact that `x` is applied to things. This is *head normal form*, the subject of the Brain Exercise.

## Paths
- **Redexes are identified by path, reusing Module 4's `Path`. (c)** Positions are the vocabulary of term rewriting. The same term can contain the same redex *text* twice, so text alone can't say which one you mean.
- **`subtermAt` throws on an impossible path. (c)** A bad path is a programmer error, not user input.

## `printWithSpans`
- **A second printer that records `[start, end)` for every node. (c)** Highlighting needs character positions, and `print()` doesn't expose any. We could have changed `print()` to return spans, but we didn't want to change Module 1's clearest code. Instead this printer copies its rules, and a test checks `printWithSpans(t).text === print(t)` on 2000 random terms, so the two can't silently drift apart.
- **Spans exclude wrapping parentheses. (c)** The highlighted text is the sub-term itself. Every redex span re-parses to a term α-equivalent to the redex (tested).

---

## Decisions We Made

| Decision | Category | Could have been |
|---|---|---|
| β-redex = `(λx. M) N` | (a) | — |
| η-redex requires `x ∉ FV(M)` | (a) | — |
| β by default, η on request | (c) | always both |
| Pre-order redex list | (a) | sorted by depth |
| Leftmost-outermost = first in pre-order | (b) | — |
| Innermost via path prefixes | (c) | recursive "contains redex" check |
| Head redex via the function spine | (b) | — |
| Redexes named by path | (c) | by text or by node identity |
| Separate span-recording printer, tested equal to `print` | (c) | change `print` itself |

## What We Proved

Checked by `npm test` (89 tests, all passing) and quoted from `npm run demo`:

1. **Every β- and η-redex is found, and nothing else is.** On 2000 random terms, each reported redex is a sub-term of the right shape at its path, and "no β-redex" coincides with β-normal form.
2. **The positions are distinct and computable.** In `(λx. x x) ((λy. y) z)`, the whole term is leftmost-outermost, head and weak-head, while the inner `(λy. y) z` is leftmost-innermost.
3. **The head redex, when it exists, is always the leftmost-outermost redex** (3000 random terms). When there is no head redex, a term can still have redexes: `x ((λa. a) b) ((λc. c) d)` has two.
4. **Redexes are common but not universal.** Of 2000 random terms, 1198 are already β-normal and 547 have a head redex.
5. **Highlighting is faithful.** `printWithSpans` prints exactly `print(t)`, and every redex span re-parses to the redex (2000 random terms).
