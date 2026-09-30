// Lab 03 — Parser Playground.
// Type a term; Module 3's recursive-descent parser (track1-engine/03_parser/src/parser.ts) builds the
// tree, logs every rule it entered, and the paren explorer tests which parentheses matter.
import {
  parse, analyzeParens, print, printFull, show, renderTree, formatError, equalSyntax, type ParenPair,
} from "../../../track1-engine/03_parser/src/index.ts";
import type { LabContext } from "../registry.ts";
import { h, clear, outRow, panel } from "../ui.ts";

const PRESETS = ["(λx. x) y", "f x y", "λx. x y", "f λx. x g", "λx y z. x z (y z)", "(f (λx. x)) ((λy. y) z)", "(λx. x", "λx x"];
const PAIR_COLORS = ["#d4a017", "#82aaff", "#f472b6", "#4ade80", "#fb923c", "#c792ea", "#2dd4bf", "#f87171"];

export function mount(root: HTMLElement, ctx: LabContext): void {
  const input = h("input", { type: "text", style: "width:100%;font-size:17px", spellcheck: "false" });
  input.value = ctx.params.get("term") ?? PRESETS[0];
  const out = h("div");
  const traceBox = h("pre", { class: "out-val" });
  const parenBox = h("div");

  function run(): void {
    const src = input.value;
    const r = parse(src, { trace: true });
    clear(out);
    traceBox.textContent = r.trace.join("\n") || "(no rules entered)";
    if (!r.term) {
      out.append(outRow("error", r.errors.map(e => formatError(src, e)).join("\n\n"), "bad"));
      clear(parenBox);
      parenBox.append(h("p", { class: "muted" }, "Fix the error to explore parentheses."));
      return;
    }
    out.append(
      outRow("canonical print(): minimal parentheses", print(r.term), "big"),
      outRow("printFull()", printFull(r.term)),
      outRow("show()", show(r.term)),
      outRow("tree", renderTree(r.term)));
    renderParens(src, r.term);
  }

  function renderParens(src: string, original: NonNullable<ReturnType<typeof parse>["term"]>): void {
    clear(parenBox);
    const pairs = analyzeParens(src) ?? [];
    if (pairs.length === 0) { parenBox.append(h("p", { class: "muted" }, "No parentheses in this text.")); return; }
    // Colored source: both ends of pair k get color k.
    const colorAt = new Map<number, string>();
    pairs.forEach((p, k) => { colorAt.set(p.open, PAIR_COLORS[k % 8]); colorAt.set(p.close, PAIR_COLORS[k % 8]); });
    const view = h("pre", { class: "out-val big" });
    [...src].reduce((off, ch) => {
      const c = colorAt.get(off);
      view.append(c ? h("span", { style: `color:${c};font-weight:700` }, ch) : ch);
      return off + ch.length;
    }, 0);

    const guesses = pairs.map(() => h("select", {}, h("option", { value: "" }, "your guess…"), h("option", { value: "n" }, "necessary"), h("option", { value: "r" }, "redundant")));
    const joint = pairs.map(() => h("input", { type: "checkbox" }));
    const verdict = h("div", { class: "verdict muted" }, "Guess each pair, then check.");
    const jointOut = h("div");

    const rows = pairs.map((p: ParenPair, k) => h("tr", {},
      h("td", { style: `color:${PAIR_COLORS[k % 8]};font-weight:700` }, `#${k + 1}`),
      h("td", { class: "mono" }, src.slice(p.open, p.close + 1)),
      h("td", {}, guesses[k]),
      h("td", {}, joint[k])));

    const check = () => {
      clear(verdict);
      let right = 0;
      const lines = pairs.map((p, k) => {
        const g = guesses[k].value;
        const ok = (g === "n" && p.necessary) || (g === "r" && !p.necessary);
        if (ok) right++;
        return h("div", { class: ok ? "ok" : "bad" }, `${ok ? "✓" : "✗"} #${k + 1} is ${p.necessary ? "NECESSARY" : "redundant"}: ${p.effect}`);
      });
      verdict.append(h("div", {}, `${right}/${pairs.length} right`), ...lines);
    };
    const removeTogether = () => {
      clear(jointOut);
      const chosen = pairs.filter((_, k) => joint[k].checked);
      if (chosen.length === 0) { jointOut.append(h("p", { class: "muted" }, "Tick some pairs first.")); return; }
      const drop = new Set(chosen.flatMap(p => [p.open, p.close]));
      let text = "", off = 0;
      for (const ch of src) { text += drop.has(off) ? " " : ch; off += ch.length; }
      text = text.replace(/\s+/g, " ").trim();
      const r = parse(text);
      jointOut.append(outRow("text with those pairs removed", text),
        r.term === null ? h("div", { class: "bad" }, `✗ no longer parses: ${r.errors[0].message}`)
        : equalSyntax(r.term, original) ? h("div", { class: "ok" }, "✓ same tree: removing them together is safe")
        : h("div", { class: "bad" }, `✗ different tree: ${print(r.term)}. Each may be redundant alone, but not together.`));
    };
    parenBox.append(view,
      h("table", { class: "tok-table" }, h("tr", {}, h("th", {}, "pair"), h("th", {}, "text"), h("th", {}, "necessary?"), h("th", {}, "remove together")), ...rows),
      h("div", { class: "row" }, h("button", { onclick: check }, "Check my guesses"), h("button", { class: "ghost", onclick: removeTogether }, "Remove ticked pairs together")),
      verdict, jointOut);
  }

  input.addEventListener("input", run);
  root.append(
    h("p", {}, "Type a λ-term (", h("code", {}, "\\"), " works for λ). The parser shows the tree, the rules it entered, and which parentheses carry meaning."),
    panel("Source",
      h("div", { class: "row" }, ...PRESETS.map(p => h("button", { class: "ghost", onclick: () => { input.value = p; run(); } }, p))),
      input),
    h("div", { class: "cols" },
      h("div", {}, panel("Result", out), panel("Recursive-descent trace", h("p", { class: "muted" }, "Each line is one grammar rule entered, indented by nesting depth, with the next token it saw."), traceBox)),
      panel("Paren explorer", parenBox)));
  run();
}
