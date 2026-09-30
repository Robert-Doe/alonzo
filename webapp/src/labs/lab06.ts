// Lab 06 — de Bruijn Converter.
// Named ↔ nameless with Module 6's engine. Every index is colored like the λ it points to.
import {
  parse, print, tokenize, occurrences, pathToString, toDeBruijn, fromDeBruijn, printDB, parseDB, equalDB,
  substTop, substTopNoShift, subst, defaultContext, alphaEquivalent, formatError, type DTerm, type Term,
} from "../../../track1-engine/06_de_bruijn/src/index.ts";
import type { LabContext } from "../registry.ts";
import { h, clear, outRow, panel } from "../ui.ts";
import { coloredTerm } from "./binding.ts";

const COLORS = ["#d4a017", "#82aaff", "#4ade80", "#c792ea", "#fb923c", "#f472b6", "#2dd4bf", "#93c5fd"];
const colored = (t: Term) => coloredTerm(t, { print, tokenize, occurrences, pathToString });

// Color a nameless term: λ number k (pre-order) gets COLORS[k]; an index gets its binder's color, or red if free.
function coloredDB(d: DTerm, ctx: string[]): HTMLElement {
  const lamColor: string[] = [];
  const varInfo: { color: string; title: string }[] = [];
  let lamCount = 0;
  (function go(u: DTerm, stack: number[]): void {
    if (u.kind === "lam") { const k = lamCount++; lamColor.push(COLORS[k % COLORS.length]); go(u.body, [...stack, k]); }
    else if (u.kind === "app") { go(u.fn, stack); go(u.arg, stack); }
    else if (u.index < stack.length) {
      const k = stack[stack.length - 1 - u.index];
      varInfo.push({ color: COLORS[k % COLORS.length], title: `cross ${u.index} λ${u.index === 1 ? "" : "s"} outward to reach its binder` });
    } else {
      const g = u.index - stack.length;
      varInfo.push({ color: "#f87171", title: `free: past all ${stack.length} binders, Γ[${g}] = ${ctx[g] ?? "?"}` });
    }
  })(d, []);
  const text = printDB(d);
  const pre = h("pre", { class: "out-val big binding" });
  let li = 0, vi = 0;
  for (let i = 0; i < text.length;) {
    const ch = text[i];
    if (ch === "λ") { pre.append(h("span", { class: "binder", style: `color:${lamColor[li++]}` }, "λ")); i++; }
    else if (/[0-9]/.test(ch)) {
      let j = i; while (j < text.length && /[0-9]/.test(text[j])) j++;
      const info = varInfo[vi++];
      pre.append(h("span", { class: info.color === "#f87171" ? "free" : "bound", style: `color:${info.color}`, title: info.title }, text.slice(i, j)));
      i = j;
    } else { pre.append(ch); i++; }
  }
  return pre;
}

const EXERCISES = ["λx. λy. x (λz. z x)", "λf. λx. f (f x)", "λx. (λy. y x) (λz. x z)", "(λx. x) (λy. y y)"];

export function mount(root: HTMLElement, ctx: LabContext): void {
  const inT = h("input", { type: "text", style: "width:100%;font-size:17px", spellcheck: "false" });
  inT.value = ctx.params.get("term") ?? "λx. λy. x (λz. z x)";
  const convBox = h("div");
  const inA = h("input", { type: "text", value: "λx. λy. x y", style: "width:100%" });
  const inB = h("input", { type: "text", value: "λa. λb. a b", style: "width:100%" });
  const alphaBox = h("div");
  const inBody = h("input", { type: "text", value: "λy. x", style: "width:100%" });
  const inN = h("input", { type: "text", value: "y", style: "width:100%" });
  const substBox = h("div");

  function runConvert(): void {
    clear(convBox);
    const r = parse(inT.value);
    if (!r.term) { convBox.append(outRow("error", formatError(inT.value, r.errors[0]), "bad")); return; }
    const g = defaultContext(r.term), d = toDeBruijn(r.term, g);
    convBox.append(
      h("div", { class: "out-label" }, "named (colors = binders)"), colored(r.term),
      h("div", { class: "out-label" }, "nameless: each number is colored like the λ it points to (hover for details)"), coloredDB(d, g),
      outRow("naming context Γ for free variables", g.length ? `[${g.join(", ")}]  (free variable Γ[i] under d binders gets index d + i)` : "[] (closed term)"),
      outRow("back to names", print(fromDeBruijn(d, g))));
  }
  function runAlpha(): void {
    clear(alphaBox);
    const a = parse(inA.value), b = parse(inB.value);
    if (!a.term || !b.term) { alphaBox.append(h("p", { class: "bad" }, "parse error")); return; }
    const g = [...new Set([...defaultContext(a.term), ...defaultContext(b.term)])].sort();
    const da = toDeBruijn(a.term, g), db = toDeBruijn(b.term, g);
    const same = equalDB(da, db);
    alphaBox.append(outRow("A nameless", printDB(da)), outRow("B nameless", printDB(db)),
      h("div", { class: "verdict" }, same ? h("span", { class: "ok" }, "✓ identical trees, so α-equivalent") : h("span", { class: "bad" }, "✗ different trees, so not α-equivalent")),
      h("p", { class: "muted" }, `Module 4's alphaEquivalent agrees: ${alphaEquivalent(a.term, b.term)}`));
  }
  function runSubst(): void {
    clear(substBox);
    const b = parse(inBody.value), n = parse(inN.value);
    if (!b.term || !n.term) { substBox.append(h("p", { class: "bad" }, "parse error")); return; }
    const g = [...new Set([...defaultContext(b.term), ...defaultContext(n.term)])].sort();
    const lam = toDeBruijn({ kind: "lam", param: "x", body: b.term }, g);
    if (lam.kind !== "lam") return;
    const dn = toDeBruijn(n.term, g);
    const good = substTop(lam.body, dn), bad = substTopNoShift(lam.body, dn);
    const named = subst(b.term, "x", n.term);
    substBox.append(
      outRow("body (under the removed λx), nameless", printDB(lam.body)),
      outRow("N, nameless", printDB(dn)),
      outRow("substTop (with shifting)", `${printDB(good)}    →  ${print(fromDeBruijn(good, g))}`),
      outRow("forgot to shift", `${printDB(bad)}    →  ${print(fromDeBruijn(bad, g))}`),
      outRow("Module 5 named subst", print(named)),
      h("div", { class: "verdict" }, equalDB(good, toDeBruijn(named, g))
        ? h("span", { class: "ok" }, "✓ de Bruijn substitution = named capture-avoiding substitution")
        : h("span", { class: "bad" }, "✗ mismatch (please report!)"),
        equalDB(bad, good) ? h("span", { class: "muted" }, "  · here the missing shift happens not to matter")
          : h("span", { class: "bad" }, "  · the unshifted version differs: that's de Bruijn capture")));
  }

  // Brain Exercise checker
  let ex = 0;
  const exBox = h("div");
  function renderEx(): void {
    clear(exBox);
    const src = EXERCISES[ex];
    const guess = h("input", { type: "text", placeholder: "e.g.  λ. λ. 1 0", style: "width:100%" });
    const verdict = h("div", { class: "verdict muted" }, "Write the nameless form. Parentheses and λ/\\ spelling are up to you.");
    const check = () => {
      clear(verdict);
      const truth = toDeBruijn(parse(src).term!);
      try {
        const mine = parseDB(guess.value);
        verdict.append(equalDB(mine, truth) ? h("span", { class: "ok" }, `✓ Correct: ${printDB(truth)}`)
          : h("span", { class: "bad" }, `✗ Yours is ${printDB(mine)}; the answer is ${printDB(truth)}. Compare where each number points.`));
      } catch (e) { verdict.append(h("span", { class: "bad" }, String((e as Error).message))); }
    };
    exBox.append(h("div", { class: "row" }, ...EXERCISES.map((_, i) => h("button", { class: i === ex ? "" : "ghost", onclick: () => { ex = i; renderEx(); } }, `#${i + 1}`))),
      outRow("convert to de Bruijn by hand", src, "big"), guess, h("div", { class: "row" }, h("button", { onclick: check }, "Check")), verdict);
  }

  inT.addEventListener("input", runConvert);
  for (const el of [inA, inB]) el.addEventListener("input", runAlpha);
  for (const el of [inBody, inN]) el.addEventListener("input", runSubst);
  root.append(
    h("p", {}, "Replace every bound name by a number: how many λs out is its binder? Type a named term and watch it lose its names."),
    panel("Named → nameless", inT, convBox),
    h("div", { class: "cols" },
      h("div", {}, panel("Brain Exercise: convert by hand", exBox), panel("α-equivalence = identical nameless trees", inA, inB, alphaBox)),
      panel("Substitution without names: body[x := N]", h("p", { class: "muted" }, "The body sits under a binder x that β-reduction removes."), h("div", { class: "row" }, "body =", inBody), h("div", { class: "row" }, "N =", inN), substBox)));
  runConvert(); runAlpha(); runSubst(); renderEx();
}
