# Module 13: Church Booleans & Pairs · DECISIONS

Module 13 adds eleven definitions to `prelude.lam` (booleans, logic, `if`, pairs) and `src/church.ts`, the bridge
between Church-encoded data and TypeScript values (encode, decode, truth tables). Module 12's prelude is carried as a
test fixture so its regression tests still check exactly what Module 12 promised. Tests: 154 total (10 new), all passing.

Categories: **(a)** forced by the spec · **(b)** forced by an external contract · **(c)** our convention.

---

## The encodings
```
true  = λt f. t        false = λt f. f        if = λb t e. b t e
not   = λb. b false true          and = λp q. p q false          or = λp q. p true q
xor   = λp q. p (not q) q
pair  = λa b s. s a b             fst = λp. p true               snd = λp. p false
```
- **Church's encoding of booleans as two-way choices. (b)** It is the standard encoding (Church 1941; Barendregt 1984; Pierce, *TAPL* §5.2), and every later module, the literature, and System F typing (Module 28) assume these exact terms. `true` is literally `K` and `false` is `KI` (tested).
- **`if` is the identity on booleans (up to η). (a)** A boolean already *is* the choice, so `if b t e = b t e`. We define `if` anyway, for readability.
- **`and`, `or`, `not` as above. (c)** Each operator has several correct definitions: `and = λp q. p q p` works too, and `not = λb t f. b f t` is tested to agree with ours on booleans while being a different term. We chose the forms that read most like "if p then … else …".
- **Pairs as "a function waiting for a selector". (b)** This is the standard Church pair. The selector *is* a boolean, `fst = λp. p true`, which is why booleans come first.
- **ASCII names `true`, `false`, `if`, … (a given Module 2).** They're identifiers, not keywords: the calculus has no keywords besides `λ`.

## The TypeScript bridge (`church.ts`)
- **Decoding = normalize (normal order, fuel 5000), then compare up to α with the expected normal forms. (c)** It's the only honest way to ask "is this term a boolean?". There are no type tags, so a term *is* `true` exactly when its normal form is `λt f. t`. Decoders return `null` for anything else, including non-termination (tested with Ω).
- **Pairs are decoded by applying them to `true` and `false`. (a)** That's the definition of a pair: the only thing you can do with one is give it a selector.
- **`truthTable` expands definitions, applies the operator to every combination of encoded inputs, and decodes. (c)** Every row of every table in the tutorial is computed by β-reduction, not asserted.

## Laziness
- **Normal order evaluates `if true a Omega` to `a`, and call-by-value never finishes. (a)** CBV must evaluate *both* branches (they're arguments) before `if` can choose. It's Module 9's planted-divergence result in its most practical form.
- **The standard fix, shown and tested: thunks. (b)** `if b (λd. then) (λd. else) I` puts each branch behind a λ, which CBV won't evaluate (λ is a value), and applies the chosen one to a dummy argument. It is exactly how strict languages implement short-circuiting in libraries, and why `if` is a built-in special form in Scheme, OCaml and JavaScript.

## Garbage in, garbage out
- **Boolean operators applied to non-booleans don't raise errors; they compute *something*. (a)** The untyped calculus has no way to reject `not (λx. x)`, and the result decodes to `null`. This observation motivates types (Module 24).

---

## Decisions We Made

| Decision | Category | Could have been |
|---|---|---|
| Church booleans `λt f. t` / `λt f. f` | (b) | Scott/other encodings (Module 16) |
| Specific `and`/`or`/`not` forms | (c) | `and = λp q. p q p`, etc. |
| Define `if` even though it's redundant | (c) | use booleans directly |
| Church pairs, booleans as selectors | (b) | — |
| Decode by normalizing + α-compare | (c) | tagged values (not available) |
| Truth tables computed by reduction | (c) | hard-coded tables |
| Thunked `if` to show the CBV fix | (b) | — |

## What We Proved

Checked by `npm test` (154 tests, all passing) and quoted from `npm run demo`:

1. **Logic from pure functions.** The truth tables of `not`, `and`, `or` and `xor` are correct, every row computed by reduction (3–7 steps each). A composed `nand` works too.
2. **Booleans are choices.** `true a b` → `a` in 2 steps, with no `if` needed. And `true`/`false` are exactly `K`/`KI`.
3. **Pairs work:** `fst (pair a b)` → `a`, `swap (pair a b)` → `λs. s b a`, and nesting gives triples: `fst (snd (pair a (pair b c)))` → `b`.
4. **`if` must be lazy.** `if true a Omega`: normal order gives `a` (5 steps), call-by-value runs out of fuel, and the thunked form gives `a` under CBV in 6 steps.
5. **Different definitions, same behaviour.** Two definitions of `not` agree on all booleans but are different terms. Extensional equality on booleans is not α-equality.
