# Alonzo: Lambda Calculus from Scratch

A code-first course that builds a working λ-calculus engine one small, verifiable module at a time,
from a three-kind syntax tree to reduction, encodings, abstract machines, type inference, dependent
types, and a compiler to C and WebAssembly. It's named for Alonzo Church.

- **Plan:** [ROADMAP.md](ROADMAP.md) (tracks, phases, modules, stopping points)
- **Start here:** [index.html](index.html), then [prerequisites.html](prerequisites.html)
- **Terms:** [GLOSSARY.md](GLOSSARY.md) (append-only; every entry tagged with its first module)
- **Interactive:** [webapp/](webapp/) (one Lab per module, running that module's real code)

## Layout

```
alonzo/
  ROADMAP.md  GLOSSARY.md  index.html  prerequisites.html
  prerequisites/        eight foundational ideas (P1–P8), linked by section from every tutorial
  shared/               course.css (design system) and course.js (tutorial ↔ Lab links)
  track1-engine/NN_*/   one folder per module: src/, test.ts, tests/ (earlier modules' tests), demo.ts,
                        DECISIONS.md, tutorial.html, package.json, and concept_*.html vocabulary webs where needed
  lessons/              cross-module concept clusters (planned; see lessons/README.md)
  tools/glossary_add.py inserts new glossary entries alphabetically without rewriting existing ones
  webapp/               Vite + TypeScript Lab app
```

## Per module

```sh
cd track1-engine/13_booleans_pairs
npm test        # this module's tests + every earlier module's (regression)
npm run demo    # prints the exact output quoted in tutorial.html
```

Requires Node 22.6+ (verified on 22.14). There are no runtime dependencies: `.ts` files run directly via
`--experimental-strip-types`.

## Status

- **Phase 1** (Modules 1–6: syntax, binding, substitution, de Bruijn indices): complete.
- **Phase 2** (Modules 7–11: redexes, β-contraction, strategies, Church–Rosser, normal forms): complete.
- **Phase 3** (Modules 12–13 so far: definitions/REPL, booleans and pairs): in progress.
- **Lesson cluster 01**: associativity and currying.

Module 13's `npm test` runs 154 tests covering all thirteen modules. Live site: https://lambda.robertdoe.com
