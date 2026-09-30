// graph.ts — every way a term can reduce, at once.
//
//   reductionGraph   breadth-first exploration of ALL one-step reducts, merging α-equivalent terms
//   confluenceReport the Church–Rosser property, checked on a finite graph: forks rejoin, normal forms are unique
//   residuals        what becomes of redex R when a DIFFERENT redex S is contracted (copied, erased, or kept)
//   develop          Takahashi's complete development M*: contract every redex of M "at once", inside-out
//
// Church–Rosser (1936): if M →* N1 and M →* N2, there is a P with N1 →* P and N2 →* P.
// The classic proof (Tait, Martin-Löf) goes through PARALLEL reduction; Takahashi (1995) found the short
// route: every one-step reduct N of M satisfies N →* M* ("the triangle property"). We test that too.

import type { Term } from "./term.ts";
import { App, Lam, size } from "./term.ts";
import { print } from "./print.ts";
import { freeVars, sorted, renameBinder, type Path } from "./alpha.ts";
import { subst } from "./subst.ts";
import { toDeBruijn, printDB } from "./debruijn.ts";
import { findRedexes, isBetaNormal } from "./redex.ts";
import { stepAt, decompose, plug } from "./reduce.ts";

// An α-invariant key: the nameless form, under a fixed naming context for free variables.
// Reduction never creates free variables (Module 8), so the start term's context works for every node.
export const alphaKey = (t: Term, ctx: string[]): string => printDB(toDeBruijn(t, ctx));

export interface GraphNode {
  readonly id: number;
  readonly term: Term;
  readonly depth: number;       // BFS distance from the start
  readonly normal: boolean;     // β-normal form?
}
export interface GraphEdge {
  readonly from: number;
  readonly to: number;
  readonly path: Path;          // which redex of `from` was contracted
}
export interface ReductionGraph {
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];
  readonly truncated: boolean;  // true if limits stopped the exploration: conclusions are then partial
}

export interface GraphOptions { maxNodes?: number; maxSize?: number }

export function reductionGraph(start: Term, opts: GraphOptions = {}): ReductionGraph {
  const maxNodes = opts.maxNodes ?? 200, maxSize = opts.maxSize ?? 300;
  const ctx = sorted(freeVars(start));
  const nodes: GraphNode[] = [], edges: GraphEdge[] = [];
  const index = new Map<string, number>();
  let truncated = false;
  const add = (t: Term, depth: number): number => {
    const k = alphaKey(t, ctx);
    const seen = index.get(k);
    if (seen !== undefined) return seen;
    const id = nodes.length;
    nodes.push({ id, term: t, depth, normal: isBetaNormal(t) });
    index.set(k, id);
    return id;
  };
  add(start, 0);
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (size(n.term) > maxSize) { truncated = true; continue; }       // too big to expand safely
    for (const r of findRedexes(n.term)) {
      const next = stepAt(n.term, r.path, "beta").reduct;
      const known = index.get(alphaKey(next, ctx));
      if (known === undefined && nodes.length >= maxNodes) { truncated = true; continue; }
      edges.push({ from: n.id, to: known ?? add(next, n.depth + 1), path: r.path });
    }
  }
  return { nodes, edges, truncated };
}

// reach[i] = the set of node ids reachable from node i (including i), by a simple fixpoint.
export function reachability(g: ReductionGraph): Set<number>[] {
  const reach = g.nodes.map(n => new Set([n.id]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of g.edges) for (const x of reach[e.to]) if (!reach[e.from].has(x)) { reach[e.from].add(x); changed = true; }
  }
  return reach;
}

export interface ConfluenceReport {
  readonly nodes: number;
  readonly edges: number;
  readonly truncated: boolean;
  readonly normalForms: Term[];          // all β-normal nodes found
  readonly forks: number;                // pairs of distinct one-step reducts of the same node
  readonly joined: number;               // forks whose two sides reach a common node in the graph
  readonly nodesCutOffFromNF: number;    // nodes from which no normal form in the graph is reachable
}

export function confluenceReport(g: ReductionGraph): ConfluenceReport {
  const reach = reachability(g);
  let forks = 0, joined = 0;
  const succ = new Map<number, number[]>();
  for (const e of g.edges) succ.set(e.from, [...(succ.get(e.from) ?? []), e.to]);
  for (const [, outs] of succ) {
    const distinct = [...new Set(outs)];
    for (let i = 0; i < distinct.length; i++) for (let j = i + 1; j < distinct.length; j++) {
      forks++;
      const a = reach[distinct[i]], b = reach[distinct[j]];
      if ([...a].some(x => b.has(x))) joined++;
    }
  }
  const nfIds = g.nodes.filter(n => n.normal).map(n => n.id);
  const cut = nfIds.length === 0 ? 0 : g.nodes.filter(n => !nfIds.some(f => reach[n.id].has(f))).length;
  return { nodes: g.nodes.length, edges: g.edges.length, truncated: g.truncated, normalForms: nfIds.map(i => g.nodes[i].term), forks, joined, nodesCutOffFromNF: cut };
}

// ── residuals ──────────────────────────────────────────────────────────────────
//
// Track redex R through the contraction of redex S. Trick: rename R's λ to a unique marker name
// (an α-conversion: meaning unchanged), contract S, then R's residuals are exactly the β-redexes whose
// λ still carries the marker. Copies keep the marker; an erased R leaves none; redexes CREATED by the
// step carry no marker, so they are correctly NOT residuals.

const MARK = "__res";

export interface ResidualResult {
  readonly reduct: Term;
  readonly residuals: Path[];           // paths, in the reduct, of R's residuals
}

export function residuals(t: Term, fired: Path, tracked: Path): ResidualResult {
  const { ctx, focus } = decompose(t, [...tracked, "fn"]);
  const renamed = renameBinder(focus, MARK);
  if (!renamed.ok) throw new Error(`cannot mark the redex at ${tracked.join(".") || "ε"}: ${renamed.reason}`);
  const marked = plug(ctx, renamed.term);
  const reduct = stepAt(marked, fired, "beta").reduct;
  const res = findRedexes(reduct).filter(r => r.term.kind === "app" && r.term.fn.kind === "lam" && r.term.fn.param.startsWith(MARK)).map(r => r.path);
  // Hand back a clean term: give each marked λ its original name back (or a fresh variant if that would capture).
  return { reduct: unmark(reduct, focus.kind === "lam" ? focus.param : "x"), residuals: res };
}

function unmark(t: Term, original: string): Term {
  const go = (u: Term): Term => {
    switch (u.kind) {
      case "var": return u;
      case "app": return App(go(u.fn), go(u.arg));
      case "lam": {
        const inner = Lam(u.param, go(u.body));
        if (!u.param.startsWith(MARK)) return inner;
        for (let i = 0; ; i++) {
          const r = renameBinder(inner, i === 0 ? original : `${original}${i}`);
          if (r.ok) return r.term;
        }
      }
    }
  };
  return go(t);
}

// ── complete development (Takahashi's M*) ──────────────────────────────────────
//   x* = x    (λx. M)* = λx. M*    ((λx. M) N)* = M*[x := N*]    (M N)* = M* N*   (M not a λ)
export function develop(t: Term): Term {
  switch (t.kind) {
    case "var": return t;
    case "lam": return Lam(t.param, develop(t.body));
    case "app":
      if (t.fn.kind === "lam") return subst(develop(t.fn.body), t.fn.param, develop(t.arg));
      return App(develop(t.fn), develop(t.arg));
  }
}

export function describeNode(n: GraphNode): string {
  return `#${n.id} (depth ${n.depth})${n.normal ? " NORMAL" : ""}: ${print(n.term)}`;
}
