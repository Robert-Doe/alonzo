// Lab 04 — Binding Explorer.
// Colors every name by the λ that binds it (free names in red), and exercises Module 4's
// freeVars / occurrences / alphaEquivalent / renameBinder / canonicalize.
import {
  parse, print, tokenize, freeVars, binderNames, isClosed, sorted, occurrences, pathToString,
  alphaEquivalent, renameBinder, canonicalize, formatError, type Term, type Path,
} from "../../../track1-engine/04_alpha/src/index.ts";
import type { LabContext } from "../registry.ts";
import { h, clear, outRow, panel } from "../ui.ts";
import { coloredTerm } from "./binding.ts";

const key = (p: Path) => pathToString(p);
const colored = (t: Term) => coloredTerm(t, { print, tokenize, occurrences, pathToString });

export function mount(root: HTMLElement, ctx: LabContext): void {
  const inA = h("input", { type: "text", style: "width:100%;font-size:17px", spellcheck: "false" });
  const inB = h("input", { type: "text", style: "width:100%;font-size:17px", spellcheck: "false" });
  const newName = h("input", { type: "text", value: "y", style: "width:80px" });
  inA.value = ctx.params.get("term") ?? "(λx. λx. x y) x";
  inB.value = "(λa. λb. b y) x";
  const bindBox = h("div"), alphaBox = h("div"), renameBox = h("div");

  const parseIn = (el: HTMLInputElement): { t: Term | null; err: string } => {
    const r = parse(el.value);
    return r.term ? { t: r.term, err: "" } : { t: null, err: formatError(el.value, r.errors[0]) };
  };

  function run(): void {
    const A = parseIn(inA), B = parseIn(inB);
    clear(bindBox); clear(alphaBox); clear(renameBox);
    if (!A.t) { bindBox.append(outRow("error", A.err, "bad")); return; }
    const t = A.t;
    bindBox.append(
      h("p", { class: "muted" }, "Each binder has its own color; every use it binds shares that color. Red = free. Hover a name for details."),
      colored(t),
      outRow("free variables FV(M)", `{${sorted(freeVars(t)).join(", ")}}${isClosed(t) ? "   ← closed term (a combinator)" : ""}`),
      outRow("binder names", `{${sorted(binderNames(t)).join(", ")}}`),
      h("table", { class: "tok-table" },
        h("tr", {}, h("th", {}, "use"), h("th", {}, "path"), h("th", {}, "bound by")),
        ...occurrences(t).map(o => h("tr", {}, h("td", { class: "mono" }, o.name), h("td", { class: "mono" }, key(o.path)),
          h("td", { class: o.binder ? "mono" : "mono bad" }, o.binder ? `λ at ${key(o.binder)}` : "FREE")))));

    // α-equivalence
    if (!B.t) alphaBox.append(outRow("error in B", B.err, "bad"));
    else {
      const eq = alphaEquivalent(t, B.t);
      alphaBox.append(
        h("div", { class: "verdict" }, eq ? h("span", { class: "ok" }, "✓ α-equivalent: same term up to renaming bound variables")
                                            : h("span", { class: "bad" }, "✗ NOT α-equivalent")),
        outRow("canonical form of A", print(canonicalize(t))),
        outRow("canonical form of B", print(canonicalize(B.t))),
        h("p", { class: "muted" }, "Two independent checks: the scope-distance walk and comparing canonical forms. The tests confirm they always agree."));
    }

    // rename the outermost binder
    const r = renameBinder(t, newName.value.trim());
    renameBox.append(t.kind !== "lam" ? h("p", { class: "muted" }, "The term must start with λ to rename its outermost binder.")
      : r.ok ? outRow(`λ${t.param} → λ${newName.value.trim()}`, print(r.term), "big")
      : h("div", { class: "verdict" }, h("span", { class: "bad" }, `✗ refused: ${r.reason}`)));
  }
  for (const el of [inA, inB, newName]) el.addEventListener("input", run);

  const presets = ["(λx. λx. x y) x", "λx. λy. x", "λx y z. x z (y z)", "λx. x y", "λf. (λx. f (x x)) (λx. f (x x))"];
  root.append(
    h("p", {}, "Names are the first thing in the λ-calculus with ", h("em", {}, "meaning"), ": which λ does each name refer to? Type a term to see its binding structure."),
    panel("Term A",
      h("div", { class: "row" }, ...presets.map(p => h("button", { class: "ghost", onclick: () => { inA.value = p; run(); } }, p))),
      inA, bindBox),
    h("div", { class: "cols" },
      panel("Is A α-equivalent to B?", inB, alphaBox),
      panel("Rename A's outermost binder (α-conversion)", h("div", { class: "row" }, "new name:", newName), renameBox)));
  run();
}
