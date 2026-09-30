// Lab 09 — Strategy Race.
// Runs Module 9's five strategies side by side on one term, then lets you scrub through any strategy's trace.
import {
  parse, run, STRATEGIES, describeStatus, print, printWithSpans, spanOf, formatError, type RunResult,
} from "../../../track1-engine/09_strategies/src/index.ts";
import type { LabContext } from "../registry.ts";
import { h, clear, outRow, panel } from "../ui.ts";

const PRESETS = ["(λx. y) ((λx. x x) (λx. x x))", "(λx. x x) ((λy. y) z)", "(λx. λy. y) ((λz. z) a)", "λx. (λy. y) x", "(λx. x x x) (λx. x x x)", "(λf. f (f a)) (λx. (λy. y) x)"];

export function mount(root: HTMLElement, ctx: LabContext): void {
  const input = h("input", { type: "text", style: "width:100%;font-size:17px", spellcheck: "false" });
  input.value = ctx.params.get("term") ?? PRESETS[0];
  const fuel = h("input", { type: "text", value: "60", style: "width:70px" });
  const table = h("div"), traceBox = h("div"), exBox = h("div");
  let results: RunResult[] = [];
  let chosen = 0, stepIdx = 0;

  function runAll(): void {
    clear(table); clear(traceBox); clear(exBox);
    const p = parse(input.value);
    if (!p.term) { table.append(outRow("error", formatError(input.value, p.errors[0]), "bad")); return; }
    const f = Math.max(1, Math.min(2000, Number(fuel.value) || 60));
    results = STRATEGIES.map(s => run(p.term!, s, { fuel: f, maxSize: 4000 }));
    table.append(h("table", { class: "tok-table" },
      h("tr", {}, h("th", {}, "strategy"), h("th", {}, "outcome"), h("th", {}, "result")),
      ...results.map((r, i) => h("tr", { class: i === chosen ? "sel-row" : "", style: "cursor:pointer", onclick: () => { chosen = i; stepIdx = 0; runAll(); } },
        h("td", {}, r.strategy), h("td", { class: r.status === "done" ? (r.betaNormal ? "ok" : "") : "bad" }, describeStatus(r)),
        h("td", {}, print(r.result).slice(0, 60))))));
    renderTrace();
    renderEx();
  }

  function renderTrace(): void {
    clear(traceBox);
    const r = results[chosen];
    if (!r) return;
    const n = r.steps.length;
    const slider = h("input", { type: "range", min: "0", max: String(n), value: String(Math.min(stepIdx, n)), style: "width:100%" });
    const view = h("div");
    const draw = () => {
      clear(view);
      const i = Number(slider.value);
      const term = i === 0 ? r.start : r.steps[i - 1].after;
      const next = r.steps[i];
      const sp = printWithSpans(term);
      const pre = h("pre", { class: "out-val big" });
      if (next) { const s = spanOf(sp, next.path); pre.append(sp.text.slice(0, s.start), h("mark", { class: "redex-mark" }, sp.text.slice(s.start, s.end)), sp.text.slice(s.end)); }
      else pre.textContent = sp.text;
      view.append(h("div", { class: "out-label" }, `${r.strategy} · after ${i} of ${n} steps${next ? " · highlighted = redex it picks next" : " · end of trace"}`), pre);
    };
    slider.addEventListener("input", () => { stepIdx = Number(slider.value); draw(); });
    traceBox.append(slider, view);
    draw();
  }

  function renderEx(): void {
    const byShort = (s: string) => results[STRATEGIES.findIndex(x => x.short === s)];
    const n = byShort("normal"), a = byShort("applicative");
    const msgs: HTMLElement[] = [];
    if (n.status === "done" && a.status !== "done") msgs.push(h("div", { class: "ok" }, "✓ Normal order finishes, applicative order doesn't: an argument that loops is thrown away before it's needed."));
    if (n.status === "done" && a.status === "done" && a.stepCount < n.stepCount) msgs.push(h("div", { class: "ok" }, `✓ Applicative order is faster here (${a.stepCount} vs ${n.stepCount} steps): normal order duplicated an unevaluated argument.`));
    if (n.status === "done" && a.status === "done" && n.stepCount < a.stepCount) msgs.push(h("div", { class: "ok" }, `✓ Normal order is faster here (${n.stepCount} vs ${a.stepCount}): applicative order evaluated an argument that was never used.`));
    if (!msgs.length) msgs.push(h("div", { class: "muted" }, "No difference between normal and applicative order on this term. Try another."));
    exBox.append(h("div", { class: "verdict" }, ...msgs));
  }

  input.addEventListener("input", runAll);
  fuel.addEventListener("input", runAll);
  root.append(
    h("p", {}, "A strategy decides which redex to contract next. Every run has fuel, a step limit, because some terms never stop. Click a strategy to scrub through its trace."),
    panel("Term",
      h("div", { class: "row" }, ...PRESETS.map(p => h("button", { class: "ghost", onclick: () => { input.value = p; runAll(); } }, p))),
      input, h("div", { class: "row" }, "fuel (max steps):", fuel)),
    panel("The race", table),
    h("div", { class: "cols" },
      panel("Trace", traceBox),
      panel("Brain Exercise checker", h("p", {}, "Find (1) a term where applicative order is FASTER than normal order, and (2) one where normal order finishes but applicative order never does."), exBox)));
  runAll();
}
