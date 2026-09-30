// Lab 07 — Redex Finder.
// Module 7's findRedexes / classifyRedexes / printWithSpans: every redex highlighted in place, with its path and class.
import {
  parse, printWithSpans, spanOf, classifyRedexes, isBetaNormal, headRedex, leftmostOutermost, pathToString, formatError, print,
  type ClassifiedRedex,
} from "../../../track1-engine/07_redexes/src/index.ts";
import type { LabContext } from "../registry.ts";
import { h, clear, outRow, panel } from "../ui.ts";

const PRESETS = ["(λx. x x) ((λy. y) z)", "(λx. y) ((λx. x x) (λx. x x))", "λx. (λy. y) x z", "x ((λa. a) b) ((λc. c) d)", "(λf. f) (λx. g x)", "λx y z. x z (y z)"];

export function mount(root: HTMLElement, ctx: LabContext): void {
  const input = h("input", { type: "text", style: "width:100%;font-size:17px", spellcheck: "false" });
  input.value = ctx.params.get("term") ?? PRESETS[0];
  const eta = h("input", { type: "checkbox" });
  const view = h("div"), list = h("div"), verdict = h("div"), exBox = h("div");
  let selected = 0;

  function highlighted(text: string, span: { start: number; end: number } | null): HTMLElement {
    const pre = h("pre", { class: "out-val big" });
    if (!span) { pre.textContent = text; return pre; }
    pre.append(text.slice(0, span.start), h("mark", { class: "redex-mark" }, text.slice(span.start, span.end)), text.slice(span.end));
    return pre;
  }

  function run(): void {
    clear(view); clear(list); clear(verdict);
    const r = parse(input.value);
    if (!r.term) { view.append(outRow("error", formatError(input.value, r.errors[0]), "bad")); return; }
    const t = r.term;
    const cs: ClassifiedRedex[] = classifyRedexes(t, eta.checked ? ["beta", "eta"] : ["beta"]);
    const sp = printWithSpans(t);
    if (selected >= cs.length) selected = 0;
    view.append(highlighted(sp.text, cs.length ? spanOf(sp, cs[selected].path) : null));
    verdict.append(h("div", { class: "verdict" }, isBetaNormal(t)
      ? h("span", { class: "ok" }, "No β-redex anywhere: this term is in β-normal form. Nothing left to compute.")
      : h("span", {}, `${cs.filter(c => c.kind === "beta").length} β-redex(es). Click one below to highlight it.`)));
    list.append(h("table", { class: "tok-table" },
      h("tr", {}, h("th", {}, "kind"), h("th", {}, "path"), h("th", {}, "redex"), h("th", {}, "class"), h("th", {}, "under λ")),
      ...cs.map((c, i) => {
        const tr = h("tr", { class: i === selected ? "sel-row" : "", style: "cursor:pointer", onclick: () => { selected = i; run(); } },
          h("td", {}, c.kind === "beta" ? "β" : "η"), h("td", {}, pathToString(c.path)), h("td", {}, print(c.term)),
          h("td", {}, [c.leftmostOutermost && "leftmost-outermost", c.leftmostInnermost && "leftmost-innermost", c.head && "head", c.weakHead && "weak-head"].filter(Boolean).join(", ") || "—"),
          h("td", {}, String(c.depthUnderLambda)));
        return tr;
      })));
    renderEx(t);
  }

  function renderEx(t: NonNullable<ReturnType<typeof parse>["term"]>): void {
    clear(exBox);
    const lo = leftmostOutermost(t), hd = headRedex(t);
    exBox.append(h("div", { class: "verdict" },
      lo && !hd ? h("span", { class: "ok" }, `✓ Found one. It has a leftmost-outermost redex (${pathToString(lo.path)}) but no head redex: its head is a variable, so it is in HEAD normal form while still not β-normal.`)
      : lo && hd ? h("span", { class: "muted" }, `This term has a head redex (at ${pathToString(hd.path)}), and it is the leftmost-outermost one. They coincide whenever a head redex exists.`)
      : h("span", { class: "muted" }, "No redexes at all: it's β-normal. Try adding one that isn't at the head.")));
  }

  input.addEventListener("input", () => { selected = 0; run(); });
  eta.addEventListener("change", run);
  root.append(
    h("p", {}, "A redex is a spot where one computation step can happen. Type any term: every β-redex ", h("code", {}, "(λx. M) N"),
      " is found by its path and classified. Tick the box to also show η-redexes ", h("code", {}, "λx. M x"), "."),
    panel("Term",
      h("div", { class: "row" }, ...PRESETS.map(p => h("button", { class: "ghost", onclick: () => { input.value = p; selected = 0; run(); } }, p))),
      input, h("label", { class: "row muted" }, eta, " include η-redexes"), view, verdict),
    h("div", { class: "cols" },
      panel("All redexes (pre-order = reading order, outer first)", list),
      panel("Brain Exercise checker", h("p", {}, "Find a term that has β-redexes but NO head redex. The checker reads the term above."), exBox)));
  run();
}
