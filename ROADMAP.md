# Alonzo — Lambda Calculus from Scratch: Full Build Roadmap

> Named for Alonzo Church, who introduced the λ-calculus in 1932–36.

You build a working λ-calculus engine one small, verifiable module at a time: from a
three-shape syntax tree to reduction, encodings, abstract machines, type inference,
dependent types, and a real compiler that turns a small functional language into C
(run with gcc) and WebAssembly (run in the browser).

Every module ships:
- runnable source and a `test.ts` that passes
- `DECISIONS.md`, with each choice tagged (a) spec-forced, (b) contract-forced or (c) our convention
- a Head First `tutorial.html`
- a **Lab** in `webapp/` that runs *that module's exact code*, not a port

**Status legend:** ⬜ Planned · 🔨 In progress · ✅ Done (built, tests pass, output verified)

---

## Track 1 — The Engine (Modules 1–31, +32–34 optional)

The λ-calculus itself: its syntax, its computation rules, programming in it, running it
efficiently, and typing it.

### Phase 1: Bare Terms — Syntax & Binding (1–6)

| # | Module | What it proves | Directory | Status |
|---|--------|----------------|-----------|--------|
| 1 | **Term AST & Printer** | Proves that every λ-term is exactly one of three shapes, and that a 3-case recursive printer can reproduce textbook notation with parentheses only where the two conventions need them. Golden cases are checked here, and Module 3 re-checks the printer by round-tripping thousands of random terms through the parser. | `track1-engine/01_term_ast/` | ✅ |
| 2 | **Lexer** | Proves that raw text like `\x. x y` or `λx.x y` becomes an ordered token stream with source positions, and that malformed input produces a located error, not a crash | `track1-engine/02_lexer/` | ✅ |
| 3 | **Parser** | Proves that application is left-associative and that λ-bodies extend as far right as possible. It also proves `parse(print(t)) = t` for every generated test term. | `track1-engine/03_parser/` | ✅ |
| 4 | **Free Variables & α-Equivalence** | Proves that bound variable names carry no meaning: `λx.x` and `λy.y` are judged equal, while `λx.y` and `λx.z` are not | `track1-engine/04_alpha/` | ✅ |
| 5 | **Capture-Avoiding Substitution** | Proves that naive textual substitution changes a program's meaning (a variable gets *captured*), and that renaming fresh binders first prevents it | `track1-engine/05_substitution/` | ✅ |
| 6 | **de Bruijn Indices** | Proves that replacing names with binder-distance numbers makes α-equivalent terms *structurally identical*, which reduces equality to a plain tree comparison | `track1-engine/06_de_bruijn/` | ✅ |

### Phase 2: Computation — Redexes & Reduction (7–11)

| # | Module | What it proves | Directory | Status |
|---|--------|----------------|-----------|--------|
| 7 | **Redex Anatomy** | Proves that "where can this term compute?" has an exact, finite answer: every β-redex `(λx.M) N` and η-redex `λx.M x` is found by its *path* (address in the tree), classified (leftmost-outermost, leftmost-innermost, head, weak-head), and highlighted — and that a term with zero redexes is by definition in normal form | `track1-engine/07_redexes/` | ✅ |
| 8 | **β-Contraction & One-Step Reduction** | Proves that computation is nothing but contracting one chosen redex via Module 5's substitution, and that the one-step relation →β is exactly "contract a redex inside some context `C[ ]`" (compatible closure), with contexts built as real data | `track1-engine/08_beta/` | ✅ |
| 9 | **Reduction Strategies & Traces** | Proves that strategy choice decides termination: `(λx.y) Ω` normalizes under normal order but loops forever under applicative order, a fuel counter catches the loop, and the trace records which redex (by path) fired at each step | `track1-engine/09_strategies/` | ✅ |
| 10 | **Reduction Graphs, Residuals & Church–Rosser** | Proves confluence empirically: we enumerate every reduction path of a term (bounded), track *residuals* (what becomes of a redex after a different one fires), and check that all divergent paths rejoin — plus parallel reduction, the key idea in the Tait–Martin-Löf proof | `track1-engine/10_confluence/` | ✅ |
| 11 | **η-Conversion & Normal-Form Zoo** | Proves that β-, βη-, head and weak-head normal forms are distinct stopping points, by exhibiting a term that sits in each but not the next, defined purely in terms of which redex kinds remain | `track1-engine/11_eta_normal_forms/` | ✅ |

### Phase 3: Programming in Pure λ — Encodings (12–18)

| # | Module | What it proves | Directory | Status |
|---|--------|----------------|-----------|--------|
| 12 | **Definitions, Prelude & REPL** | Proves that named definitions are pure macro-expansion, adding no power: every program expands to a closed raw term before reduction | `track1-engine/12_repl_prelude/` | ✅ |
| 13 | **Church Booleans & Pairs** | Proves that data can be represented as *behavior*: a boolean is a choice function and a pair is a function waiting for a selector | `track1-engine/13_booleans_pairs/` | ✅ |
| 14 | **Church Numerals & Arithmetic** | Proves that `+ × ^` fall out of iteration. It also shows why predecessor is hard: Kleene's pair trick needs O(n) steps where successor needs O(1), and the step counts are measured. | `track1-engine/14_numerals/` | ⬜ |
| 15 | **Fixed Points: Y, Z, Θ** | Proves that recursion needs no names: factorial runs through Y under normal order and through Z under call-by-value, and Y's self-application pattern is shown step by step | `track1-engine/15_fixed_points/` | ⬜ |
| 16 | **Data Encodings: Church vs Scott vs Parigot** | Proves that the choice of encoding sets the cost of operations. Scott lists have O(1) `tail` and Church lists O(n), measured on the same programs. | `track1-engine/16_data_encodings/` | ⬜ |
| 17 | **SKI Combinators & Bracket Abstraction** *(first compiler)* | Proves that variables can be eliminated entirely. We compile any closed λ-term to S/K/I (then optimized S/K/I/B/C), and it reduces to the same result. | `track1-engine/17_combinators/` | ⬜ |
| 18 | **Binary λ-Calculus & a Self-Interpreter** | Proves that λ can interpret itself. Terms are encoded as bits (Tromp's BLC), and a λ-term that evaluates BLC programs runs inside our engine. | `track1-engine/18_self_interpreter/` | ⬜ |

### Phase 4: Efficient Evaluation — Abstract Machines (19–23)

| # | Module | What it proves | Directory | Status |
|---|--------|----------------|-----------|--------|
| 19 | **Environment Interpreter & Closures** | Proves that substitution can be replaced by a delayed lookup table (the *environment*), producing the same results with far fewer term copies (counted) | `track1-engine/19_environments/` | ⬜ |
| 20 | **Krivine Machine (Call-by-Name)** | Proves that call-by-name evaluation is a 3-rule state machine (term, environment, stack) with no recursion in the host language | `track1-engine/20_krivine/` | ⬜ |
| 21 | **CEK Machine & First-Class Continuations** | Proves that making "the rest of the computation" an explicit data structure lets call-by-value run iteratively, and makes `call/cc` a ~5-line addition | `track1-engine/21_cek_callcc/` | ⬜ |
| 22 | **Call-by-Need: Thunks & Sharing** | Proves that sharing turns an exponential call-by-name step count into a linear one on the same program, with both counts measured | `track1-engine/22_call_by_need/` | ⬜ |
| 23 | **Normalization by Evaluation** | Proves that full normal forms (under λ too) can be computed by evaluating into host-language closures and *reading back*, matching Module 9's normal-order results | `track1-engine/23_nbe/` | ⬜ |

### Phase 5: Types — Taming the Calculus (24–27)

| # | Module | What it proves | Directory | Status |
|---|--------|----------------|-----------|--------|
| 24 | **Simply Typed λ-Calculus (STLC)** | Proves that a syntax-directed checker built from inference rules accepts exactly the well-typed terms, and reports *which rule* failed on the rest | `track1-engine/24_stlc/` | ⬜ |
| 25 | **Strong Normalization, Observed** | Proves on concrete terms that typing removes divergence: Ω and Y are rejected by the checker, and every accepted term in a generated corpus terminates | `track1-engine/25_normalization/` | ⬜ |
| 26 | **Hindley–Milner Inference (Algorithm W)** | Proves that types can be *inferred* with no annotations, via unification and occurs-check. `let`-polymorphism lets `id` be used at two types while a λ-bound `id` cannot be. | `track1-engine/26_hindley_milner/` | ⬜ |
| 27 | **Curry–Howard: Proofs as Programs** | Proves that a well-typed STLC term *is* a proof of its type read as a logical formula. Our checker becomes a propositional proof checker, and `A → ¬¬A` gets a proof while `¬¬A → A` does not. | `track1-engine/27_curry_howard/` | ⬜ |

### Phase 6: Crazy Expert — Polymorphism & Dependent Types (28–31)

| # | Module | What it proves | Directory | Status |
|---|--------|----------------|-----------|--------|
| 28 | **System F** | Proves that explicit type abstraction lets the Church encodings from Phase 3 get *real types* (`∀α. (α→α)→α→α`), and that System F checking stays decidable once types are explicit | `track1-engine/28_system_f/` | ⬜ |
| 29 | **Bidirectional Type Checking** | Proves that splitting typing into *check* and *infer* modes needs annotations only at redexes, and it scales to the type systems that follow | `track1-engine/29_bidirectional/` | ⬜ |
| 30 | **Dependent Types (a tiny CoC / Pi-types)** | Proves that types can depend on values. `Vec n A` length indices are checked, and type equality is decided by the NbE engine from Module 23. | `track1-engine/30_dependent_types/` | ⬜ |
| 31 | **A Mini Proof Assistant** | Proves that the Module 30 kernel checks real theorems. `n + 0 = n` is proved by induction, and a bogus proof is rejected with a readable error. | `track1-engine/31_proof_assistant/` | ⬜ |

### Phase 7 (optional frontier): Beyond the Textbook (32–34)

| # | Module | What it proves | Directory | Status |
|---|--------|----------------|-----------|--------|
| 32 | **Explicit Substitutions (λσ)** | Proves that substitution itself can become a first-class reduction step in the calculus, bridging Phase 2's rewriting and Phase 4's machines | `track1-engine/32_explicit_subst/` | ⬜ |
| 33 | **Interaction Nets & Optimal Sharing** | Proves that encoding terms as graphs of Lafont interaction combinators shares work that even call-by-need duplicates. Interaction counts are measured against Module 22. | `track1-engine/33_interaction_nets/` | ⬜ |
| 34 | **Böhm Trees & Infinite Normal Forms** | Proves that terms with no normal form can still have well-defined (lazily unfolded) meaning, and distinguishes "useful" divergence from Ω-style meaninglessness | `track1-engine/34_bohm_trees/` | ⬜ |

---

## Track 2 — The Compiler (Modules C1–C14)

Uses the engine to compile **Alonzo-ML**, a small ML-style language with `let`, `let rec`,
integers, booleans, `if`, algebraic data types, `match` and effects. It compiles to
**C (native, via gcc)** and **WebAssembly (in the browser)**. Every pass is a
λ-to-λ transformation you can see in the webapp.

### Phase 8: Front End (C1–C4)

| # | Module | What it proves | Builds on (Track 1) | Directory | Status |
|---|--------|----------------|---------------------|-----------|--------|
| C1 | **Surface Language & Desugaring** | Proves that `let`, multi-argument functions, `if` and literals are sugar: each one desugars into core λ plus a few primitives, and the result evaluates identically | 2, 3, 12 | `track2-compiler/C01_surface_desugar/` | ⬜ |
| C2 | **Type Inference for Alonzo-ML** | Proves that Algorithm W extends to primitives, `let rec` and literals, and that the inferred types match hand-written signatures on every test program | 26 | `track2-compiler/C02_type_inference/` | ⬜ |
| C3 | **Algebraic Data Types** | Proves that `data` declarations generate constructor functions and a typed eliminator, and that these line up with the Scott encodings | 16, 26 | `track2-compiler/C03_adts/` | ⬜ |
| C4 | **Pattern-Match Compilation** | Proves that nested patterns compile to a decision tree that tests each constructor at most once per path, and that non-exhaustive matches are reported at compile time | C3 | `track2-compiler/C04_pattern_match/` | ⬜ |

### Phase 9: Middle End — λ-to-λ Transformations (C5–C9)

| # | Module | What it proves | Builds on (Track 1) | Directory | Status |
|---|--------|----------------|---------------------|-----------|--------|
| C5 | **A-Normal Form (ANF)** | Proves that naming every intermediate result makes evaluation order explicit in the syntax without changing any program's output | 7, 9 | `track2-compiler/C05_anf/` | ⬜ |
| C6 | **CPS Conversion** | Proves that every call can become a tail call by passing "the rest of the program" as a λ, which is the compile-time twin of Module 21's machine | 21 | `track2-compiler/C06_cps/` | ⬜ |
| C7 | **Closure Conversion** | Proves that nested λs with free variables become closed code pointers paired with explicit environment records, which is Module 19's runtime idea done at compile time | 4, 19 | `track2-compiler/C07_closure_conversion/` | ⬜ |
| C8 | **Defunctionalization & Lambda Lifting** | Proves that higher-order functions can be turned into first-order data plus a single `apply` dispatcher (Reynolds 1972), with the output checked against the original | C7 | `track2-compiler/C08_defunctionalize/` | ⬜ |
| C9 | **Optimizer: Shrinking Reductions & Inlining** | Proves that compile-time β-reduction, constant folding and dead-binding removal shrink programs while provably not changing results. A size/step table is recorded for every test program. | 8, 23 | `track2-compiler/C09_optimizer/` | ⬜ |

### Phase 10: Back End & Runtime (C10–C14)

| # | Module | What it proves | Builds on (Track 1) | Directory | Status |
|---|--------|----------------|---------------------|-----------|--------|
| C10 | **C Code Generation** | Proves that closure-converted Alonzo-ML becomes a `.c` file that gcc compiles and runs, producing the same output as the Track 1 interpreter | C7 | `track2-compiler/C10_codegen_c/` | ⬜ |
| C11 | **Runtime: Heap & Copying GC** | Proves that a Cheney two-space collector reclaims unreachable closures. A program that allocates 100× the heap size runs to completion, and collection counts are printed. | C10 | `track2-compiler/C11_gc/` | ⬜ |
| C12 | **Tail Calls & Trampolines** | Proves that a 10-million-deep tail-recursive loop crashes the naive C output (stack overflow) and runs in constant stack once CPS + a trampoline are used | C6, C10 | `track2-compiler/C12_tail_calls/` | ⬜ |
| C13 | **WebAssembly Back End** | Proves that we can emit a valid `.wasm` binary by hand, byte by byte (hex dump decoded in the docs), that runs in Node *and* live in the webapp | C7, C9 | `track2-compiler/C13_codegen_wasm/` | ⬜ |
| C14 | **Effects & Handlers** *(capstone)* | Proves that exceptions, generators and state are all one feature: algebraic effect handlers implemented via CPS. The capstone compiles Module 19's λ-interpreter, written in Alonzo-ML, and runs it natively. | 21, C6, C10 | `track2-compiler/C14_effects_capstone/` | ⬜ |

---

## Track H — History, Rebuilt (Modules H1–H8)

History as *running code*: every module rebuilds a real historical artifact (a system, a
paradox, a machine, a proof) on top of the engine, so you can run what the original
authors wrote about. Each one opens with a narrative "you are there" section, then builds.
Take each H-module right after the Track 1 module it depends on.

| # | Module | What it proves | Builds on (Track 1) | Directory | Status |
|---|--------|----------------|---------------------|-----------|--------|
| H1 | **Schönfinkel 1924: Functions Without Variables** | Proves that Schönfinkel's original combinators (I, C, T, Z, S — his names, before Curry's K) plus currying express multi-argument functions with no variables at all, eight years before λ existed | 1, 3 | `trackH-history/H1_schonfinkel_1924/` | ⬜ |
| H2 | **Church 1932 & the Kleene–Rosser Paradox** | Proves why the pure λ-calculus was cut loose from logic: in an untyped "λ + logic" system we build Curry's paradox term with a fixed point and derive an arbitrary proposition, which is the inconsistency that sank Church's 1932 system | 15 | `trackH-history/H2_church_paradox/` | ⬜ |
| H3 | **Church 1936: The Undecidable** | Proves Church's negative answer to Hilbert's Entscheidungsproblem by construction: for *any* candidate λ-term claimed to decide "has a normal form," we build the diagonal term that defeats it and run both | 15, 18 | `trackH-history/H3_undecidability_1936/` | ⬜ |
| H4 | **Turing 1936–37: λ ≡ Turing Machines** | Proves one direction of the Church–Turing equivalence concretely: a Turing machine simulator written in pure λ runs real TM programs (e.g. binary increment), step-matched against a direct TypeScript TM simulator | 14, 16 | `trackH-history/H4_turing_equivalence/` | ⬜ |
| H5 | **McCarthy 1960: LISP's `eval` & the Funarg Bug** | Proves that McCarthy's original meta-circular `eval` (rebuilt from the 1960 paper) is dynamically scoped, exhibits the exact program where it returns the wrong answer (the *funarg problem*), and fixes it with Module 19's closures | 19 | `trackH-history/H5_lisp_1960/` | ⬜ |
| H6 | **Landin 1964: The SECD Machine & ISWIM** | Proves that Landin's four-register machine (Stack, Environment, Control, Dump) evaluates ISWIM, "the next 700 programming languages," and matches the CEK machine's results on every test term | 19, 21 | `trackH-history/H6_landin_secd/` | ⬜ |
| H7 | **Milner 1972–78: LCF & "Well-Typed Programs Can't Go Wrong"** | Proves Milner's two ideas in code: an LCF-style kernel where `Theorem` values can *only* be made by inference rules (enforced by the type system), and a run showing HM-typed programs never hit a stuck state | 26, 27 | `trackH-history/H7_milner_lcf_ml/` | ⬜ |
| H8 | **de Bruijn 1967–72: Automath & the de Bruijn Criterion** | Proves why proof assistants trust a *small* kernel: an Automath-flavored checker using de Bruijn indices verifies proofs from an untrusted "elaborator," and a deliberately buggy elaborator is caught by the kernel | 6, 30 | `trackH-history/H8_automath_de_bruijn/` | ⬜ |

**History you read (not build).** The `lessons/01_history/` cluster adds the full timeline
(Frege 1893 → Russell's paradox → Church–Kleene–Rosser → Turing → Curry → Böhm 1968 →
Scott's D∞ model 1969 → Plotkin 1975 → Martin-Löf → Coquand–Huet CoC 1988 → modern
Lean/Agda), plus deep dives on people and papers no module covers directly.

---

## Recommended Stopping Points

| Your goal | Stop after |
|-----------|-----------|
| "I just want to know what λ-calculus *is*" | Module 8 (β-Contraction) |
| Understand evaluation order / laziness in real languages | Module 9, then 22 |
| Read FP papers and textbook notation fluently | Module 16 |
| Understand how Haskell/OCaml/Scheme *run* | Module 23 |
| Understand type inference (ML, Rust, TypeScript-style) | Module 26 |
| Understand the logic ↔ programs connection | Module 27 |
| Understand Coq / Lean / Agda from the inside | Module 31 |
| Write a compiler for a functional language | C10 (+ C11 for a real runtime) |
| Know *why* λ-calculus exists and how it shaped CS | Track H (H1–H8), each after its listed engine module |
| Full course: "crazy expert" | C14 + Track H (+ optional Phase 7) |

---

## Supporting Layers (built alongside, per the course spec)

- **Prerequisites** (`prerequisites.html` + `prerequisites/`). Planned: functions-as-mappings,
  variables & scope, trees & recursion, grammars/BNF, structural induction, rewriting
  systems, inference-rule notation (the "fraction bar"), and reading TypeScript.
- **Lesson clusters** (`lessons/`). Planned candidates: *History timeline* (complements Track H),
  *Binding & Names*, *Evaluation Strategies*, *Fixed Points & Self-Reference*,
  *Undecidability via λ*, *Semantics: operational vs denotational*, *The Lambda Cube*.
  They are finalized after enough modules exist to show the real overlaps.
- **Vocabulary webs** (inside module folders). Likely in Module 5 (free/bound/binder/scope/capture), Module 8 (redex/contractum/context/reduct — built there rather than Module 7, since contractum and reduct only exist once a step is taken), Module 11 (normal/head-normal/weak-head-normal/value), Module 22 (call-by-name/need/value/lazy/strict/eager) and Module 26 (checking/inference/reconstruction/synthesis). A cross-cutting web for closure/thunk/continuation/environment will go in Module 21.
- **GLOSSARY.md** at the root. It is append-only, and every entry is tagged "First seen: Module N."

---

## Tools / Architecture Target

**Language: TypeScript, zero runtime dependencies.** Node 22's `--experimental-strip-types`
runs `.ts` files directly (verified available: Node v22.14.0). The **same source files**
are imported unmodified by the Vite webapp, so each Lab runs that module's actual code,
not a port. We use only erasable TS syntax (no `enum`, `namespace` or parameter
properties); that is a platform constraint of strip-types.

**Each module directory is a cumulative, standalone snapshot:**
```
track1-engine/07_beta/
  src/*.ts        full engine as of this module
  test.ts         node --experimental-strip-types --test test.ts
  demo.ts         prints the outputs quoted in the tutorial (the docs only quote real output)
  DECISIONS.md
  tutorial.html
```

**Webapp (`alonzo/webapp/`)** follows the sibling layout: Vite + TypeScript, and
`scripts/copy-course.mjs` publishes the tutorials into `dist/course/`.
- **One Lab per module.** Examples: REPL, step-through reducer, reduction-graph
  visualizer, abstract-machine state stepper, type-derivation tree viewer, compiler pass
  explorer (source → ANF → CPS → closures → C/WASM side by side), and live WASM execution.
- **Tutorials ↔ Lab wiring.** Every tutorial's "Try it" boxes deep-link to
  `webapp/#/lab/NN?term=…`, preloading the example. Every Lab links back to its tutorial.
  The Lab also has a "check my answer" mode for each tutorial's Brain Exercise.

**Track 2 targets:** C11, compiled with the installed gcc 16.1 (MSYS2), and WebAssembly MVP,
emitted as raw bytes by our own encoder with no toolchain.

**Academic backbone:** Pierce *TAPL* (UPenn CIS 500), Harper *PFPL* (CMU 15-312/15-814),
Barendregt *The Lambda Calculus*, Appel *Compiling with Continuations*, Friedman & Wand
*EoPL*, Cambridge Part II *Types* / Stanford CS242, and the original papers (Church 1936,
Landin 1964, Reynolds 1972, Milner 1978, Lamping 1990).

**Explicitly out of scope:**
- A native x86 backend (the sibling `bob_compiler/a-finity` already covers it; we target C + WASM)
- Generational or concurrent GC
- Tactic languages, universe hierarchies or inductive-family elaboration at Coq/Lean scale (Module 31 uses a small, fixed set of inductive types)
- Parallel/distributed reduction
- A full Haskell/OCaml feature set (no type classes, modules or records beyond ADTs)
- Formal machine-checked proofs *of the engine itself*. Theorems like Church–Rosser are demonstrated empirically and explained, not mechanized.

---

**Total: 31 core + 3 optional (Track 1) + 14 (Track 2) + 8 (Track H) = 53 core modules / 56 with Phase 7.**
