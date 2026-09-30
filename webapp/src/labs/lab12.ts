// Lab 12 — λ-REPL in the browser.
// The exact REPL of Module 12 (src/repl.ts is pure: session + line → session + output), fed by a text box.
import { newSession, execLine, print, type Session } from "../../../track1-engine/12_repl_prelude/src/index.ts";
import prelude from "../../../track1-engine/12_repl_prelude/prelude.lam?raw";
import type { LabContext } from "../registry.ts";
import { h, clear, panel } from "../ui.ts";

const EXAMPLES = ["S K K a", "S K K", "B f g x", "twice twice f x", ":trace on", "K I a b", ":trace off", ":strategy applicative", "K a Omega", ":strategy normal", "fact = λn. fact n", ":defs", ":help"];

const countF = (s: string) => (s.match(/\bf\b/g) ?? []).length;

export function mount(root: HTMLElement, ctx: LabContext): void {
  const start = newSession(prelude);
  let session: Session = start.session;
  const log = h("pre", { class: "out-val repl-log" });
  const input = h("input", { type: "text", style: "width:100%;font-size:16px", spellcheck: "false", placeholder: "type a term, a definition (name = term), or :help" });
  const defsBox = h("div"), exBox = h("div");
  const history: string[] = [];
  let hIdx = 0;

  const write = (lines: string[], cls = "") => {
    for (const l of lines) log.append(h("div", { class: cls }, l));
    log.scrollTop = log.scrollHeight;
  };
  function submit(line: string): string[] {
    write([`λ> ${line}`], "repl-in");
    const r = execLine(session, line);
    session = r.session;
    write(r.output, r.output.some(o => o.startsWith("error")) ? "bad" : "");
    renderDefs();
    return r.output;
  }
  function renderDefs(): void {
    clear(defsBox);
    defsBox.append(h("table", { class: "tok-table" }, ...[...session.defs.values()].map(d => h("tr", {}, h("td", {}, d.name), h("td", {}, print(d.source))))));
  }

  input.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" && input.value.trim()) { history.push(input.value); hIdx = history.length; submit(input.value); input.value = ""; }
    else if (e.key === "ArrowUp" && hIdx > 0) { hIdx--; input.value = history[hIdx]; e.preventDefault(); }
    else if (e.key === "ArrowDown") { hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] ?? ""; e.preventDefault(); }
  });

  // Brain Exercise checker: predictions about twice/thrice.
  const guesses: [string, string, number][] = [["thrice twice f x", "thrice = λf x. f (f (f x)) must be defined first", 8], ["twice thrice f x", "", 9]];
  function renderEx(): void {
    clear(exBox);
    exBox.append(h("p", {}, "Define ", h("code", {}, "thrice = λf x. f (f (f x))"), ". Predict how many times f is applied in each expression below, then check."));
    for (const [expr, , truth] of guesses) {
      const g = h("input", { type: "text", placeholder: "how many f's?", style: "width:120px" });
      const v = h("span", { class: "muted" });
      const btn = h("button", { class: "ghost", onclick: () => {
        if (!session.defs.has("thrice")) { v.className = "bad"; v.textContent = "define thrice first (in the REPL above)"; return; }
        const out = submit(expr)[0] ?? "";
        const n = countF(out.split("   =")[0]);
        v.className = Number(g.value) === n ? "ok" : "bad";
        v.textContent = Number(g.value) === n ? ` ✓ ${n}` : ` ✗ it's ${n}${n === truth ? "" : " (?)"}. Composition multiplies: "k twice" means "apply 2, k times".`;
      } }, "check");
      exBox.append(h("div", { class: "row" }, h("code", {}, expr), g, btn, v));
    }
  }

  write([`Alonzo λ-REPL, the same code as Module 12's terminal REPL.`, ...start.output, `Type :help for commands. ↑/↓ recall history.`], "muted");
  root.append(
    h("p", {}, "Definitions are macros: every name is expanded to its body before a single step runs. Try the examples, then write your own."),
    h("div", { class: "cols" },
      h("div", {},
        panel("REPL", log, input, h("div", { class: "row" }, ...EXAMPLES.map(x => h("button", { class: "ghost", onclick: () => submit(x) }, x)))),
        panel("Brain Exercise checker", exBox)),
      panel("Definitions in scope (prelude.lam + yours)", defsBox)));
  renderDefs(); renderEx();
  const pre = ctx.params.get("term");
  if (pre) submit(pre);
}
