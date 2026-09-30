// tree.ts — draw a term as an ASCII tree, one node per line.
//
//   @            application
//   ├── λx       abstraction (binder name shown)
//   │   └── x    variable
//   └── y

import type { Term } from "./term.ts";

export function label(t: Term, lambda = "λ"): string {
  switch (t.kind) {
    case "var": return t.name;
    case "lam": return `${lambda}${t.param}`;
    case "app": return "@";
  }
}

export function children(t: Term): Term[] {
  switch (t.kind) {
    case "var": return [];
    case "lam": return [t.body];
    case "app": return [t.fn, t.arg];
  }
}

export function renderTree(t: Term, lambda = "λ"): string {
  const lines: string[] = [label(t, lambda)];
  function walk(node: Term, prefix: string): void {
    const kids = children(node);
    kids.forEach((kid, i) => {
      const last = i === kids.length - 1;
      lines.push(prefix + (last ? "└── " : "├── ") + label(kid, lambda));
      walk(kid, prefix + (last ? "    " : "│   "));
    });
  }
  walk(t, "");
  return lines.join("\n");
}
