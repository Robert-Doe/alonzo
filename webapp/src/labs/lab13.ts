// Lab 13 — Booleans & Pairs Workbench.
// Type any boolean operator (using the Module 13 prelude or not) and get its truth table, computed by reduction.
import {
  loadDefinitions, parse, truthTable, decodePair, expand, freeVars, print, formatError, type TruthRow,
} from "../../../track1-engine/13_booleans_pairs/src/index.ts";
import prelude from "../../../track1-engine/13_booleans_pairs/prelude.lam?raw";
import type { LabContext } from "../registry.ts";
import { h, clear, outRow, panel } from "../ui.ts";

const { defs } = loadDefinitions(prelude);
const OPS: [string, number][] = [["not", 1], ["and", 2], ["or", 2], ["xor", 2], ["λp q. not (and p q)", 2], ["λb. if b false true", 1]];
const show = (b: boolean | null) => (b === null ? "??" : b ? "T" : "F");

function tableEl(rows: TruthRow[]): HTMLElement {
  const n = rows[0]?.inputs.length ?? 0;
  return h("table", { class: "tok-table" },
    h("tr", {}, ...Array.from({ length: n }, (_, i) => h("th", {}, String.fromCharCode(112 + i))), h("th", {}, "result"), h("th", {}, "steps")),
    ...rows.map(r => h("tr", {}, ...r.inputs.map(b => h("td", {}, show(b))), h("td", { class: r.output === null ? "bad" : "ok" }, show(r.output)), h("td", {}, String(r.steps)))));
}

export function mount(root: HTMLElement, ctx: LabContext): void {
  const op = h("input", { type: "text", style: "width:100%;font-size:16px", spellcheck: "false" });
  const arity = h("select", {}, h("option", { value: "1" }, "1 input"), h("option", { value: "2" }, "2 inputs"), h("option", { value: "3" }, "3 inputs"));
  op.value = ctx.params.get("term") ?? "λp q. not (and p q)"; arity.value = "2";
  const out = h("div");
  const pairIn = h("input", { type: "text", value: "swap (pair a b)", style: "width:100%" });
  const pairOut = h("div");
  const ex = h("input", { type: "text", placeholder: "implies = …", style: "width:100%" });
  const exOut = h("div");

  function run(): void {
    clear(out);
    const p = parse(op.value);
    if (!p.term) { out.append(outRow("error", formatError(op.value, p.errors[0]), "bad")); return; }
    out.append(tableEl(truthTable(p.term, Number(arity.value), defs)), outRow("expanded to raw λ", print(expand(p.term, defs))));
  }
  function runPair(): void {
    clear(pairOut);
    const p = parse(pairIn.value);
    if (!p.term) { pairOut.append(outRow("error", formatError(pairIn.value, p.errors[0]), "bad")); return; }
    const d = decodePair(expand(p.term, defs));
    pairOut.append(d ? outRow("asking it for fst and snd", `(${print(d[0])}, ${print(d[1])})`, "big") : h("p", { class: "bad" }, "not a pair (or didn't finish)"));
  }
  function runEx(): void {
    clear(exOut);
    const p = parse(ex.value.replace(/^\s*implies\s*=\s*/, ""));
    if (!p.term) { exOut.append(h("p", { class: "muted" }, "Type a term like λp q. …")); return; }
    const banned = ["if", "not", "and", "or", "xor"].filter(n => freeVars(p.term!).has(n));
    const rows = truthTable(p.term, 2, defs);
    const want = [true, true, false, true];
    const ok = rows.every((r, i) => r.output === want[i]);
    exOut.append(tableEl(rows), h("div", { class: "verdict" },
      !ok ? h("span", { class: "bad" }, "✗ Not implication yet. Wanted F→F=T, F→T=T, T→F=F, T→T=T.")
      : banned.length ? h("span", { class: "muted" }, `Correct table, but it uses ${banned.join(", ")}. Can you do it with the booleans alone (true/false are allowed)?`)
      : h("span", { class: "ok" }, "✓ Implication from the boolean itself: \"if p then q, else true\" is just p q true.")));
  }

  for (const [el, f] of [[op, run], [arity, run], [pairIn, runPair], [ex, runEx]] as const) el.addEventListener(el === arity ? "change" : "input", f);
  root.append(
    h("p", {}, "A Church boolean is a choice: ", h("code", {}, "true = λt f. t"), ", ", h("code", {}, "false = λt f. f"), ". Every truth table below is computed by β-reduction and decoded back."),
    h("div", { class: "cols" },
      h("div", {},
        panel("Truth table of any operator",
          h("div", { class: "row" }, ...OPS.map(([o, n]) => h("button", { class: "ghost", onclick: () => { op.value = o; arity.value = String(n); run(); } }, o))),
          op, h("div", { class: "row" }, "inputs:", arity), out),
        panel("Pairs: a function waiting for a selector", pairIn, pairOut)),
      h("div", {},
        panel("Brain Exercise checker: implication",
          h("p", {}, "Define implication (p → q) without if/not/and/or. Only the booleans p and q themselves (and true/false)."), ex, exOut),
        panel("The prelude (Module 13 section)", h("pre", { class: "source" }, prelude.slice(prelude.indexOf("-- ── Module 13")))))));
  run(); runPair(); runEx();
}
