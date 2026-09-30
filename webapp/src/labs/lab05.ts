// Lab 05 — Substitution Workbench.
// Computes M[x := N] both ways with Module 5's engine (substNaive vs subst) and shows, in color,
// which λ each name belongs to, so capture is visible as a color change.
import {
  parse, print, tokenize, occurrences, pathToString, subst, substNaive, freeVars, binderNames,
  alphaEquivalent, sorted, isIdent, formatError, type SubstLog, type Term,
} from "../../../track1-engine/05_substitution/src/index.ts";
import type { LabContext } from "../registry.ts";
import { h, clear, outRow, panel } from "../ui.ts";
import { coloredTerm } from "./binding.ts";

const colored = (t: Term) => coloredTerm(t, { print, tokenize, occurrences, pathToString });
const PRESETS: [string, string, string][] = [
  ["λy. x y", "x", "f"], ["λy. x", "x", "y"], ["λy. x y", "x", "y z"], ["λy. x y1", "x", "y"],
  ["λy. λy1. x y y1", "x", "y y1"], ["λx. x", "x", "f"],
];

export function mount(root: HTMLElement, ctx: LabContext): void {
  const inM = h("input", { type: "text", style: "width:100%;font-size:16px", spellcheck: "false" });
  const inX = h("input", { type: "text", style: "width:70px;font-size:16px" });
  const inN = h("input", { type: "text", style: "width:100%;font-size:16px", spellcheck: "false" });
  const [m0, x0, n0] = PRESETS[1];
  inM.value = ctx.params.get("term") ?? m0; inX.value = ctx.params.get("x") ?? x0; inN.value = ctx.params.get("n") ?? n0;
  const inputsBox = h("div"), naiveBox = h("div"), rightBox = h("div"), verdictBox = h("div"), stealthBox = h("div");

  function run(): void {
    for (const b of [inputsBox, naiveBox, rightBox, verdictBox, stealthBox]) clear(b);
    const pm = parse(inM.value), pn = parse(inN.value), x = inX.value.trim();
    if (!pm.term) { inputsBox.append(outRow("error in M", formatError(inM.value, pm.errors[0]), "bad")); return; }
    if (!pn.term) { inputsBox.append(outRow("error in N", formatError(inN.value, pn.errors[0]), "bad")); return; }
    if (!isIdent(x)) { inputsBox.append(h("p", { class: "bad" }, "x must be a variable name")); return; }
    const M = pm.term, N = pn.term;
    inputsBox.append(h("div", { class: "out-label" }, "M, colored by binder"), colored(M),
      h("div", { class: "out-label" }, "N"), colored(N),
      h("p", { class: "muted" }, `binders in M: {${sorted(binderNames(M)).join(", ")}} · free in N: {${sorted(freeVars(N)).join(", ")}}`));

    const log: SubstLog = { renames: [] };
    const right = subst(M, x, N, log), wrong = substNaive(M, x, N);
    const fvR = sorted(freeVars(right)), fvW = sorted(freeVars(wrong));
    naiveBox.append(colored(wrong), outRow("FV", `{${fvW.join(", ")}}`));
    rightBox.append(colored(right), outRow("FV", `{${fvR.join(", ")}}`),
      outRow("binders renamed to avoid capture", log.renames.length ? log.renames.map(r => `${r.from} → ${r.to}`).join(", ") : "none needed"));
    const same = alphaEquivalent(right, wrong);
    verdictBox.append(h("div", { class: "verdict" }, same
      ? h("span", { class: "ok" }, "✓ Same meaning (α-equivalent). No capture happened.")
      : h("span", { class: "bad" }, "✗ Different meaning: naive substitution CAPTURED a variable. Compare the colors: a name from N changed owner.")));

    // Brain Exercise checker: a capture that the free-variable check cannot see.
    const stealth = !same && fvR.join() === fvW.join();
    stealthBox.append(h("div", { class: "verdict" }, stealth
      ? h("span", { class: "ok" }, "✓ Stealth capture! The meanings differ, yet both results have exactly the same free variables. A captured name also occurs free somewhere else, so FV can't tell.")
      : same ? h("span", { class: "muted" }, "No capture here. You need naive and correct to disagree first.")
      : h("span", { class: "muted" }, `A capture, but not a stealthy one: FV differs ({${fvW.join(", ")}} vs {${fvR.join(", ")}}), so an FV check would notice.`)));
  }
  for (const el of [inM, inX, inN]) el.addEventListener("input", run);

  root.append(
    h("p", {}, "Compute ", h("code", {}, "M[x := N]"), ": replace the free x's in M by N. Left: the naive recursion. Right: capture-avoiding substitution. Colors show which λ owns each name."),
    panel("Inputs",
      h("div", { class: "row" }, ...PRESETS.map(([m, x, n]) => h("button", { class: "ghost", onclick: () => { inM.value = m; inX.value = x; inN.value = n; run(); } }, `(${m})[${x}:=${n}]`))),
      h("div", { class: "row" }, "M =", inM), h("div", { class: "row" }, "x =", inX, "N =", inN), inputsBox),
    h("div", { class: "cols" }, panel("Naive  substNaive(M, x, N)", naiveBox), panel("Capture-avoiding  subst(M, x, N)", rightBox)),
    verdictBox,
    panel("Brain Exercise checker: find a stealth capture", h("p", {}, "Find M and N where naive substitution changes the meaning, but the naive and correct results have identical free variables."), stealthBox));
  run();
}
