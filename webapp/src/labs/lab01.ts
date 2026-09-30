// Lab 01 — Term Builder.
// Build a λ-term by clicking holes and choosing one of the three shapes. The engine's own
// constructors, printers and tree renderer (track1-engine/01_term_ast/src) do all the work.
// The lab only manages the half-built tree.
import {
  Var, Lam, App, isIdent, print, printFull, show, renderTree, size, depth, counts, equalSyntax,
  mulberry32, randomTerm, I, K, S, omega, Omega, parenCases, type Term,
} from "../../../track1-engine/01_term_ast/src/index.ts";
import type { LabContext } from "../registry.ts";
import { h, clear, outRow, panel } from "../ui.ts";

// A half-built term: the three real shapes, plus a hole that hasn't been chosen yet.
type P =
  | { k: "hole" }
  | { k: "var"; name: string }
  | { k: "lam"; param: string; body: P }
  | { k: "app"; fn: P; arg: P };

const HOLE = "__";   // placeholder variable used only to print a partial tree; shown as □

function fromTerm(t: Term): P {
  switch (t.kind) {
    case "var": return { k: "var", name: t.name };
    case "lam": return { k: "lam", param: t.param, body: fromTerm(t.body) };
    case "app": return { k: "app", fn: fromTerm(t.fn), arg: fromTerm(t.arg) };
  }
}
function toTerm(p: P, holeOk: boolean): Term | null {
  switch (p.k) {
    case "hole": return holeOk ? Var(HOLE) : null;
    case "var": return Var(p.name);
    case "lam": { const b = toTerm(p.body, holeOk); return b && Lam(p.param, b); }
    case "app": {
      const f = toTerm(p.fn, holeOk), a = toTerm(p.arg, holeOk);
      return f && a && App(f, a);
    }
  }
}
const showHoles = (s: string) => s.replace(/\b__\b/g, "□");

const CHALLENGES = [
  { target: "f (λx. x) g", hint: "Two applications. Which one is on the outside?" },
  { target: "f (g λx. x)", hint: "The argument of f is itself an application." },
  { target: "λx. x (λy. y) x", hint: "The λx body is an application whose function part is also an application." },
  { target: "(λx. x x) λx. x x", hint: "This is Ω. Why does only the first λ get parentheses?" },
];

export function mount(root: HTMLElement, ctx: LabContext): void {
  let term: P = { k: "hole" };
  let selected: P | null = null;
  let pinA: Term | null = null, pinB: Term | null = null;

  const presets: [string, Term][] = [["I", I], ["K", K], ["S", S], ["ω", omega], ["Ω", Omega],
    ...parenCases.map(c => [c.name, c.term] as [string, Term])];
  if (ctx.params.get("ex")) {
    const found = presets.find(([n]) => n === ctx.params.get("ex"));
    if (found) term = fromTerm(found[1]);
  }

  const builderBox = h("div", { class: "builder" });
  const outBox = h("div");
  const pinBox = h("div");

  // Replace node `target` inside the tree with `repl` (by identity).
  function replace(p: P, target: P, repl: P): P {
    if (p === target) return repl;
    switch (p.k) {
      case "lam": return { ...p, body: replace(p.body, target, repl) };
      case "app": return { ...p, fn: replace(p.fn, target, repl), arg: replace(p.arg, target, repl) };
      default: return p;
    }
  }
  function set(target: P, repl: P): void {
    term = replace(term, target, repl);
    selected = null;
    render();
  }

  function chooser(node: P): HTMLElement {
    const name = h("input", { type: "text", placeholder: "name", value: node.k === "var" ? node.name : node.k === "lam" ? node.param : "x" });
    const msg = h("span", { class: "bad" });
    const valid = () => {
      const n = name.value.trim();
      if (!isIdent(n) || n === HOLE) { msg.textContent = "not a valid name"; return null; }
      return n;
    };
    return h("span", { class: "chooser" }, name,
      h("button", { onclick: () => { const n = valid(); if (n) set(node, { k: "var", name: n }); } }, "variable"),
      h("button", { onclick: () => { const n = valid(); if (n) set(node, { k: "lam", param: n, body: { k: "hole" } }); } }, "λ (abstraction)"),
      h("button", { onclick: () => set(node, { k: "app", fn: { k: "hole" }, arg: { k: "hole" } }) }, "@ (application)"),
      node.k !== "hole" ? h("button", { class: "ghost", onclick: () => set(node, { k: "hole" }) }, "clear") : null,
      msg);
  }

  function drawNode(p: P, role: string): HTMLElement {
    const label = p.k === "hole" ? "□ choose…" : p.k === "var" ? p.name : p.k === "lam" ? `λ${p.param}` : "@";
    const chip = h("span", { class: `chip ${p.k}${selected === p ? " sel" : ""}`, onclick: () => { selected = selected === p ? null : p; render(); } },
      role ? h("span", { class: "role" }, role) : null, label);
    const box = h("div", { class: "bnode" }, chip, selected === p ? chooser(p) : null);
    if (p.k === "lam") box.append(drawNode(p.body, "body"));
    if (p.k === "app") box.append(drawNode(p.fn, "fn"), drawNode(p.arg, "arg"));
    return box;
  }

  function render(): void {
    clear(builderBox);
    builderBox.append(drawNode(term, ""));
    clear(outBox);
    const full = toTerm(term, false);
    if (!full) {
      const partial = toTerm(term, true)!;
      outBox.append(
        h("p", { class: "muted" }, "Holes remain (□). Click a red chip to fill it. Complete terms show all four views."),
        outRow("print (partial)", showHoles(print(partial)), "big"));
    } else {
      const c = counts(full);
      outBox.append(
        outRow("print: minimal parentheses", print(full), "big"),
        outRow("printFull: every compound node wrapped", printFull(full)),
        outRow("ASCII lambda", print(full, { lambda: "\\" })),
        outRow("show: the constructor calls", show(full)),
        outRow("renderTree", renderTree(full)),
        outRow("measurements", `size=${size(full)}  depth=${depth(full)}  vars=${c.vars}  lams=${c.lams}  apps=${c.apps}   (vars = apps + 1 ✓ ${c.vars === c.apps + 1})`),
        h("div", { class: "row" },
          h("button", { class: "ghost", onclick: () => { pinA = full; renderPins(); } }, "Pin as A"),
          h("button", { class: "ghost", onclick: () => { pinB = full; renderPins(); } }, "Pin as B")));
    }
    renderChallenge();
  }

  // ── Brain Exercise checker: the same λ-subtree, parenthesized in A but bare in B ──
  function lamSubterms(t: Term, acc: Term[] = []): Term[] {
    if (t.kind === "lam") { acc.push(t); lamSubterms(t.body, acc); }
    if (t.kind === "app") { lamSubterms(t.fn, acc); lamSubterms(t.arg, acc); }
    return acc;
  }
  function renderPins(): void {
    clear(pinBox);
    pinBox.append(outRow("A", pinA ? print(pinA) : "(not pinned)"), outRow("B", pinB ? print(pinB) : "(not pinned)"));
    if (!pinA || !pinB) return;
    const sA = print(pinA), sB = print(pinB);
    const shared = lamSubterms(pinA).filter(l => lamSubterms(pinB!).some(m => equalSyntax(l, m)));
    const win = shared.find(l => {
      const sL = print(l);
      const wrappedInA = sA.includes(`(${sL})`);
      let bareInB = false;
      for (let i = sB.indexOf(sL); i >= 0; i = sB.indexOf(sL, i + 1)) {
        if (!(sB[i - 1] === "(" && sB[i + sL.length] === ")")) bareInB = true;
      }
      return wrappedInA && bareInB;
    });
    pinBox.append(h("div", { class: "verdict" }, win
      ? h("span", { class: "ok" }, `✓ Yes. ${print(win)} is wrapped in A but bare in B. The λ node is identical, so the parentheses depend on what FOLLOWS it, not on the node. That's why print() carries a "trailing" flag.`)
      : h("span", { class: "bad" }, "✗ Not yet. Find one λ-subtree that appears in both, printed as (…) in A and without parentheses in B.")));
  }

  const chalBox = h("div");
  let chalIdx = 0;
  function renderChallenge(): void {
    clear(chalBox);
    const c = CHALLENGES[chalIdx];
    const full = toTerm(term, false);
    const got = full ? print(full) : null;
    chalBox.append(
      h("div", { class: "row" },
        h("select", { onchange: (e: Event) => { chalIdx = Number((e.target as HTMLSelectElement).value); renderChallenge(); } },
          ...CHALLENGES.map((ch, i) => { const o = h("option", { value: i }, `Challenge ${i + 1}`); if (i === chalIdx) o.selected = true; return o; }))),
      outRow("target: build a tree that prints exactly as", c.target, "big"),
      h("details", {}, h("summary", {}, "hint"), h("p", {}, c.hint)),
      h("div", { class: "verdict" }, got === null ? h("span", { class: "muted" }, "Finish the term (no holes) to check.")
        : got === c.target ? h("span", { class: "ok" }, "✓ Exactly right.") : h("span", { class: "bad" }, `✗ Yours prints as: ${got}`)));
  }

  const presetSel = h("select", { onchange: (e: Event) => {
    const v = (e.target as HTMLSelectElement).value;
    const found = presets.find(([n]) => n === v);
    if (found) { term = fromTerm(found[1]); selected = null; render(); }
  } }, h("option", { value: "" }, "load a preset…"), ...presets.map(([n, t]) => h("option", { value: n }, `${n}   ${print(t)}`)));
  let seed = 1;

  root.append(
    h("p", {}, "Every λ-term is one of three shapes. Click the red ", h("code", {}, "□"),
      " hole, type a name if you need one, and choose a shape. Click any chip to change or clear it."),
    h("div", { class: "cols" },
      h("div", {},
        panel("Build",
          h("div", { class: "row" }, presetSel,
            h("button", { class: "ghost", onclick: () => { term = fromTerm(randomTerm(mulberry32(seed++), { maxDepth: 5, names: ["x", "y", "z"] })); selected = null; render(); } }, "random term"),
            h("button", { class: "ghost", onclick: () => { term = { k: "hole" }; selected = null; render(); } }, "reset")),
          builderBox),
        panel("Challenges: print conventions", chalBox),
        panel("Brain Exercise checker",
          h("p", {}, "Pin two terms, A and B, that contain the ", h("em", {}, "same"), " λ-subtree, printed with parentheses in A and without in B."),
          pinBox)),
      panel("What the engine says", outBox)));
  render();
  renderPins();
}
