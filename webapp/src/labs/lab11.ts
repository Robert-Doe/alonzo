// Lab 11 — Normal-Form Zoo.
// Classify any term into Module 11's five forms, normalize it four ways, and fill in the zoo yourself.
import {
  parse, classifyForms, toWHNF, toHNF, toBetaNF, toBetaEtaNF, etaExpand, describeStatus, print, formatError, type FormReport, type Term,
} from "../../../track1-engine/11_eta_normal_forms/src/index.ts";
import type { LabContext } from "../registry.ts";
import { h, clear, outRow, panel } from "../ui.ts";

const PRESETS = ["f", "λx. f x", "x ((λa. a) b)", "λx. (λy. y) x", "λx. (λy. y y) (λy. y y)", "(λx. λy. x y) (λz. (λw. w) z)"];
const ROWS: [keyof FormReport, string][] = [["betaEtaNormal", "βη-normal form"], ["betaNormal", "β-normal form"], ["hnf", "head normal form"], ["whnf", "weak head normal form"], ["value", "value (CBV)"], ["neutral", "neutral (variable at the head)"]];

// Zoo challenge: each slot wants a term IN one form but NOT in a stricter one.
const SLOTS: { want: keyof FormReport; not: keyof FormReport | null; label: string; extra?: "no-hnf" }[] = [
  { want: "betaNormal", not: "betaEtaNormal", label: "β-normal but NOT βη-normal" },
  { want: "hnf", not: "betaNormal", label: "head normal but NOT β-normal" },
  { want: "whnf", not: "hnf", label: "weak head normal but NOT head normal" },
  { want: "whnf", not: null, label: "in WHNF, yet with NO head normal form at all", extra: "no-hnf" },
];

export function mount(root: HTMLElement, ctx: LabContext): void {
  const input = h("input", { type: "text", style: "width:100%;font-size:17px", spellcheck: "false" });
  input.value = ctx.params.get("term") ?? PRESETS[5];
  const cls = h("div"), norm = h("div"), zoo = h("div");

  function run(): void {
    clear(cls); clear(norm);
    const p = parse(input.value);
    if (!p.term) { cls.append(outRow("error", formatError(input.value, p.errors[0]), "bad")); return; }
    const t = p.term, c = classifyForms(t);
    cls.append(h("table", { class: "tok-table" }, h("tr", {}, h("th", {}, "form"), h("th", {}, "?")),
      ...ROWS.map(([k, label]) => h("tr", {}, h("td", {}, label), h("td", { class: c[k] ? "ok" : "muted" }, c[k] ? "✓ yes" : "· no")))),
      outRow("η-expansion (always meaning-preserving for functions)", print(etaExpand(t))));
    const o = { fuel: 200, maxSize: 4000 };
    for (const [label, r] of [["to WHNF · call-by-name", toWHNF(t, o)], ["to HNF · head reduction", toHNF(t, o)], ["to β-NF · normal order", toBetaNF(t, o)], ["to βη-NF · normal order with η", toBetaEtaNF(t, o)]] as const) {
      norm.append(outRow(`${label} — ${describeStatus(r)}`, print(r.result)));
    }
  }

  function renderZoo(): void {
    clear(zoo);
    for (const s of SLOTS) {
      const inp = h("input", { type: "text", placeholder: "type a term", style: "width:100%" });
      const verdict = h("div", { class: "verdict muted" }, "…");
      const check = () => {
        clear(verdict);
        const p = parse(inp.value);
        if (!p.term) { verdict.append(h("span", { class: "bad" }, "doesn't parse")); return; }
        const t: Term = p.term, c = classifyForms(t);
        let ok = c[s.want] && (s.not === null || !c[s.not]);
        let why = ok ? "✓ yes" : `✗ it is ${ROWS.filter(([k]) => c[k]).map(([, l]) => l).join(", ") || "in none of these forms"}`;
        if (ok && s.extra === "no-hnf") {
          const h2 = toHNF(t, { fuel: 300, maxSize: 4000, keepTrace: false });
          ok = h2.status !== "done";
          why = ok ? `✓ head reduction never finishes (${describeStatus(h2)}): an unsolvable term that is nevertheless a WHNF` : `✗ it reaches HNF: ${print(h2.result)}`;
        }
        verdict.append(h("span", { class: ok ? "ok" : "bad" }, why));
      };
      inp.addEventListener("input", check);
      zoo.append(h("div", { style: "margin:10px 0" }, h("div", { class: "out-label" }, s.label), inp, verdict));
    }
  }

  input.addEventListener("input", run);
  root.append(
    h("p", {}, "\"Finished\" means different things to different evaluators. Type a term to see which normal forms it is already in, and what each normalizer turns it into."),
    panel("Term", h("div", { class: "row" }, ...PRESETS.map(p => h("button", { class: "ghost", onclick: () => { input.value = p; run(); } }, p))), input),
    h("div", { class: "cols" },
      h("div", {}, panel("Which forms is it in?", cls), panel("Brain Exercise: fill the zoo", h("p", {}, "Find one term for each slot. The last one is the real puzzle."), zoo)),
      panel("Normalize it four ways", norm)));
  run(); renderZoo();
}
