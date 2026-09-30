// Lab 02 — Token Inspector.
// Type any text; the Module 2 lexer (track1-engine/02_lexer/src/lexer.ts) tokenizes it live.
import { tokenize, formatError, type Token, type LexError } from "../../../track1-engine/02_lexer/src/index.ts";
import type { LabContext } from "../registry.ts";
import { h, clear, outRow, panel } from "../ui.ts";

const PRESETS = ["(\\x. x) y", "λx.λy. x", "λxy. x", "λx y. x", "f' acc_2 x1", "λx.\n  x y  -- a comment", "λx. x + y", "f 42", "λf. (f f"];

// Prediction quiz: the learner types the token texts they expect, separated by spaces.
const QUIZ = [
  { src: "λxy.x", why: "Maximal munch: after x, the lexer sees y, which can continue a name, so it keeps going. One identifier: xy." },
  { src: "f'x", why: "A prime can appear inside a name, and x can follow it: one identifier, f'x." },
  { src: "a--b\nc", why: "-- starts a comment that runs to the end of the line, so b vanishes." },
  { src: "(λz.z)q", why: "No spaces needed: every token here is a single character or an unbroken name." },
];

const COLORS: Record<string, string> = { lambda: "#d4a017", dot: "#9a9992", lparen: "#c792ea", rparen: "#c792ea", ident: "#82aaff" };

export function mount(root: HTMLElement, ctx: LabContext): void {
  const input = h("textarea", { rows: 4, style: "width:100%", spellcheck: "false" });
  input.value = ctx.params.get("term") ?? PRESETS[0];
  const view = h("pre", { class: "out-val big" });
  const table = h("div");
  const errs = h("div");

  function colorize(src: string, tokens: Token[], errors: LexError[]): void {
    clear(view);
    type Span = { s: number; e: number; color: string; title: string; err?: boolean };
    const spans: Span[] = [
      ...tokens.filter(t => t.kind !== "eof").map(t => ({ s: t.start.offset, e: t.end.offset, color: COLORS[t.kind], title: `${t.kind} @ ${t.start.line}:${t.start.col}` })),
      ...errors.map(e => ({ s: e.start.offset, e: e.end.offset, color: "#f87171", title: e.message, err: true })),
    ].sort((a, b) => a.s - b.s);
    let i = 0;
    for (const sp of spans) {
      if (sp.s > i) view.append(h("span", { style: "color:#5c5c58" }, src.slice(i, sp.s)));
      view.append(h("span", { style: `color:${sp.color};${sp.err ? "text-decoration:wavy underline" : "border-bottom:1px dotted " + sp.color}`, title: sp.title }, src.slice(sp.s, sp.e)));
      i = sp.e;
    }
    if (i < src.length) view.append(h("span", { style: "color:#5c5c58" }, src.slice(i)));
  }

  function run(): void {
    const src = input.value;
    const { tokens, errors } = tokenize(src);
    colorize(src, tokens, errors);
    clear(table);
    table.append(h("table", { class: "tok-table" },
      h("tr", {}, h("th", {}, "#"), h("th", {}, "kind"), h("th", {}, "text"), h("th", {}, "start line:col"), h("th", {}, "offset")),
      ...tokens.map((t, i) => h("tr", {},
        h("td", {}, String(i)),
        h("td", { style: `color:${COLORS[t.kind] ?? "#9a9992"}` }, t.kind),
        h("td", { class: "mono" }, t.kind === "eof" ? "" : JSON.stringify(t.text)),
        h("td", { class: "mono" }, `${t.start.line}:${t.start.col}`),
        h("td", { class: "mono" }, String(t.start.offset))))));
    clear(errs);
    if (errors.length === 0) errs.append(h("p", { class: "ok" }, "✓ No lexical errors."));
    for (const e of errors) errs.append(outRow("error", formatError(src, e), "bad"));
  }
  input.addEventListener("input", run);

  // quiz
  let qi = 0;
  const quizBox = h("div");
  function renderQuiz(): void {
    clear(quizBox);
    const q = QUIZ[qi];
    const guess = h("input", { type: "text", placeholder: "e.g.  λ x . x", style: "width:100%" });
    const verdict = h("div", { class: "verdict muted" }, "Type the token texts you expect, separated by spaces (leave out eof).");
    const check = () => {
      const actual = tokenize(q.src).tokens.filter(t => t.kind !== "eof").map(t => t.text);
      const mine = guess.value.trim().split(/\s+/).filter(Boolean);
      const ok = mine.length === actual.length && mine.every((m, i) => m === actual[i] || (m === "\\" && actual[i] === "λ") || (m === "λ" && actual[i] === "\\"));
      clear(verdict);
      verdict.append(ok ? h("span", { class: "ok" }, `✓ Correct: ${actual.join("  ")}. ${q.why}`)
                        : h("span", { class: "bad" }, `✗ The lexer produces ${actual.length} tokens: ${actual.map(a => JSON.stringify(a)).join(" ")}. ${q.why}`));
    };
    quizBox.append(
      h("div", { class: "row" }, ...QUIZ.map((_, i) => h("button", { class: i === qi ? "" : "ghost", onclick: () => { qi = i; renderQuiz(); } }, `Q${i + 1}`))),
      outRow("source", q.src.replace(/\n/g, "⏎\n")),
      guess, h("div", { class: "row" }, h("button", { onclick: check }, "Check my prediction")), verdict);
  }

  root.append(
    h("p", {}, "Type anything. Tokens are colored as the lexer sees them; hover a token for its kind and position. Red wavy text is an error: it is reported, skipped, and lexing continues."),
    h("div", { class: "cols" },
      h("div", {},
        panel("Source",
          h("div", { class: "row" }, ...PRESETS.map(p => h("button", { class: "ghost", onclick: () => { input.value = p; run(); } }, p.replace(/\n/g, "⏎").slice(0, 18)))),
          input, h("div", { class: "out-label" }, "as the lexer sees it"), view),
        panel("Errors", errs),
        panel("Predict the tokens", quizBox)),
      panel("Token stream", table)));
  run();
  renderQuiz();
}
