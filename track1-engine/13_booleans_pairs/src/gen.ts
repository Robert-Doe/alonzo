// gen.ts — deterministic random terms, for property tests.
//
// A seeded generator gives the same "random" terms every run, so a failing test can be
// replayed exactly. mulberry32 is a tiny, well-known 32-bit PRNG. It is not cryptographic
// and doesn't need to be.

import { App, Lam, Var, type Term } from "./term.ts";

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface GenOptions {
  maxDepth: number;   // stop growing below this depth (always ends in a variable)
  names: string[];    // pool of variable names; small pools force interesting clashes
}

export function randomTerm(rand: () => number, opts: GenOptions): Term {
  const { names } = opts;
  const pick = () => names[Math.floor(rand() * names.length)];
  function go(d: number): Term {
    const r = rand();
    if (d <= 1 || r < 0.3) return Var(pick());
    if (r < 0.6) return Lam(pick(), go(d - 1));
    return App(go(d - 1), go(d - 1));
  }
  return go(opts.maxDepth);
}
