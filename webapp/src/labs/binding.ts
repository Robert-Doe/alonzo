// binding.ts — shared view: print a term with every name colored by the λ that binds it.
// Works with any module snapshot from Module 4 on: the lab passes in that module's own functions.
//
// Trick: the identifier tokens of print(t) appear in exactly the pre-order of the tree's
// name-bearing nodes (binders and uses). Module 2's tests check the counts match.
import { h } from "../ui.ts";

type Step = "fn" | "arg" | "body";
type Path = readonly Step[];
interface TermLike { kind: "var" | "lam" | "app"; name?: string; param?: string; body?: TermLike; fn?: TermLike; arg?: TermLike }
export interface BindingDeps<T> {
  print: (t: T) => string;
  tokenize: (s: string) => { tokens: { kind: string; text: string; start: { offset: number }; end: { offset: number } }[] };
  occurrences: (t: T) => { name: string; path: Path; binder: Path | null }[];
  pathToString: (p: Path) => string;
}

const COLORS = ["#d4a017", "#82aaff", "#4ade80", "#c792ea", "#fb923c", "#f472b6", "#2dd4bf", "#93c5fd"];

export function coloredTerm<T>(t: T, deps: BindingDeps<T>, cls = "out-val big binding"): HTMLElement {
  const key = deps.pathToString;
  const nodes: { role: "binder" | "use"; path: Path; name: string }[] = [];
  (function go(u: TermLike, p: Path): void {
    if (u.kind === "var") nodes.push({ role: "use", path: p, name: u.name! });
    else if (u.kind === "lam") { nodes.push({ role: "binder", path: p, name: u.param! }); go(u.body!, [...p, "body"]); }
    else { go(u.fn!, [...p, "fn"]); go(u.arg!, [...p, "arg"]); }
  })(t as unknown as TermLike, []);

  const text = deps.print(t);
  const idents = deps.tokenize(text).tokens.filter(k => k.kind === "ident");
  const binderColor = new Map<string, string>();
  nodes.filter(n => n.role === "binder").forEach((n, i) => binderColor.set(key(n.path), COLORS[i % COLORS.length]));
  const occ = new Map(deps.occurrences(t).map(o => [key(o.path), o]));
  const pre = h("pre", { class: cls });
  let i = 0;
  idents.forEach((tok, k) => {
    pre.append(text.slice(i, tok.start.offset));
    const n = nodes[k];
    let color = "#f87171", title = "free variable", c = "free";
    if (n.role === "binder") { color = binderColor.get(key(n.path))!; title = `binder λ${n.name} at ${key(n.path)}`; c = "binder"; }
    else {
      const o = occ.get(key(n.path))!;
      if (o.binder) { color = binderColor.get(key(o.binder))!; title = `bound by λ${n.name} at ${key(o.binder)}`; c = "bound"; }
    }
    pre.append(h("span", { class: c, style: `color:${color}`, title }, tok.text));
    i = tok.end.offset;
  });
  pre.append(text.slice(i));
  return pre;
}
