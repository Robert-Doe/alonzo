// Lab 08 — Hand Stepper.
// Click any redex to contract it with Module 8's stepAt: decompose into context + redex, contract, plug.
import {
  parse, print, printWithSpans, spanOf, findRedexes, stepAt, printCtx, ruleChain, pathToString, formatError,
  type Term, type StepResult,
} from "../../../track1-engine/08_beta/src/index.ts";
import type { LabContext } from "../registry.ts";
import { h, clear, outRow, panel } from "../ui.ts";

const PRESETS = ["(λx. x x) ((λy. y) z)", "λz. (λx. λz. x z) z", "(λx. λy. x) a ((λz. z z) (λz. z z))", "(λf. f) (λx. g x)", "(λx y. y x) ((λa. a) b) (λc. c)"];

export function mount(root: HTMLElement, ctx: LabContext): void {
  const input = h("input", { type: "text", style: "width:100%;font-size:17px", spellcheck: "false" });
  input.value = ctx.params.get("term") ?? PRESETS[0];
  const eta = h("input", { type: "checkbox" });
  const current = h("div"), detail = h("div"), history = h("div"), exBox = h("div");
  let start: Term | null = null;
  let now: Term | null = null;
  let steps: StepResult[] = [];

  function load(): void {
    const r = parse(input.value);
    steps = [];
    clear(detail);
    if (!r.term) { start = now = null; clear(current); current.append(outRow("error", formatError(input.value, r.errors[0]), "bad")); renderHistory(); return; }
    start = now = r.term;
    render();
  }

  function render(): void {
    clear(current);
    if (!now) return;
    const t = now;
    const sp = printWithSpans(t);
    const reds = findRedexes(t, eta.checked ? ["beta", "eta"] : ["beta"]);
    const pre = h("pre", { class: "out-val big" }, sp.text);
    current.append(h("div", { class: "out-label" }, `current term · ${steps.length} step(s) so far`), pre);
    if (reds.length === 0) current.append(h("div", { class: "verdict" }, h("span", { class: "ok" }, `✓ Normal form reached in ${steps.length} step(s). No redex left.`)));
    else current.append(h("p", { class: "muted" }, "Click a redex to contract it (hover to preview where it is):"),
      h("div", { class: "row" }, ...reds.map(r => {
        const s = spanOf(sp, r.path);
        const b = h("button", { class: "ghost", onclick: () => doStep(r.path, r.kind) }, `${r.kind === "beta" ? "β" : "η"} @ ${pathToString(r.path)}:  ${sp.text.slice(s.start, s.end)}`);
        b.addEventListener("mouseenter", () => { pre.innerHTML = ""; pre.append(sp.text.slice(0, s.start), h("mark", { class: "redex-mark" }, sp.text.slice(s.start, s.end)), sp.text.slice(s.end)); });
        b.addEventListener("mouseleave", () => { pre.textContent = sp.text; });
        return b;
      })));
    renderHistory();
    renderEx();
  }

  function doStep(path: readonly ("fn" | "arg" | "body")[], kind: "beta" | "eta"): void {
    if (!now) return;
    const r = stepAt(now, path, kind);
    steps.push(r);
    now = r.reduct;
    clear(detail);
    detail.append(
      outRow("context C[□]", printCtx(r.ctx)),
      outRow("redex", print(r.redex)),
      outRow("contractum", print(r.contractum) + (r.renames.length ? `   (renamed ${r.renames.map(x => x.from + "→" + x.to).join(", ")} to avoid capture)` : "")),
      outRow("reduct = C[contractum]", print(r.reduct), "big"),
      outRow("congruence rules used (outside → in)", ruleChain(r.ctx, r.kind).join(" ∘ ")));
    render();
  }

  function renderHistory(): void {
    clear(history);
    if (!start) return;
    const lines = [print(start), ...steps.map(s => `→${s.kind === "beta" ? "β" : "η"} ${print(s.reduct)}    [${pathToString(s.path)}]`)];
    history.append(h("pre", { class: "out-val" }, lines.join("\n")),
      h("div", { class: "row" },
        h("button", { class: "ghost", onclick: () => { if (steps.length) { steps.pop(); now = steps.length ? steps[steps.length - 1].reduct : start; clear(detail); render(); } } }, "undo"),
        h("button", { class: "ghost", onclick: load }, "restart")));
  }

  function renderEx(): void {
    clear(exBox);
    const done = now !== null && findRedexes(now).length === 0;
    exBox.append(h("div", { class: "verdict" }, input.value.replace(/\s+/g, " ").trim() !== "(λx. x x) ((λy. y) z)"
      ? h("span", { class: "muted" }, "Load the first preset to try the exercise.")
      : !done ? h("span", { class: "muted" }, `Steps so far: ${steps.length}. Reach normal form in as few as possible.`)
      : steps.length === 2 ? h("span", { class: "ok" }, "✓ 2 steps: the minimum. Contracting the inner redex first meant its work happened ONCE, before x x copied it.")
      : h("span", { class: "bad" }, `Normal form in ${steps.length} steps. Possible in fewer: the outer step copied the inner redex, so you had to contract it twice. Undo and try the other order.`)));
  }

  input.addEventListener("input", load);
  eta.addEventListener("change", render);
  root.append(
    h("p", {}, "One step = pick a redex, contract it, put the result back in its context. You choose the redex; the engine does the rest."),
    panel("Start term",
      h("div", { class: "row" }, ...PRESETS.map(p => h("button", { class: "ghost", onclick: () => { input.value = p; load(); } }, p))),
      input, h("label", { class: "row muted" }, eta, " allow η-steps"), current),
    h("div", { class: "cols" },
      h("div", {}, panel("Last step, dissected", detail), panel("Brain Exercise checker", h("p", {}, "Start from (λx. x x) ((λy. y) z). Reach normal form in the fewest steps. Does the order matter?"), exBox)),
      panel("History", history)));
  load();
}
