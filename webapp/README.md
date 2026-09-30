# Alonzo Lab — the course webapp

An in-browser lab for every module of the Alonzo course. It is not a mockup and not a port: each Lab
imports its module's **actual source files** (`../track1-engine/NN_*/src/*.ts`) unmodified, so what you
click is exactly the code the tutorial explains and the tests check.

- `#/` course map (every module; built ones are live)
- `#/lab/NN` a module's Lab, plus **Source** (the exact files) and **Decisions** (rendered `DECISIONS.md`) tabs
- `#/doc/<path>.md` any course markdown file, rendered (e.g. `#/doc/GLOSSARY.md`)
- `/course/...` the tutorials, prerequisites and lessons, served from `alonzo/` in dev and copied into `dist/course/` by the build

Tutorials deep-link into Labs (`#/lab/03?term=…`) with the example preloaded, and each Lab links back.

## Run it

```sh
npm install
npm run dev        # http://localhost:5173 — tutorials at http://localhost:5173/course/index.html
```

## Build

```sh
npm run build      # tsc type-checks the app AND every module's src/tests, then vite build + copy-course
npm run preview
```

`npm run typecheck` alone type-checks the webapp plus all module code (`tsconfig.json` includes
`../track1-engine/*/src/*.ts`).
