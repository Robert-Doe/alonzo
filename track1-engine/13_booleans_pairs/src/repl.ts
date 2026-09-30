// repl.ts — a Read-Eval-Print Loop as a PURE function: (session, line) → (session, output lines).
//
// No I/O in here. The terminal front end (repl-cli.ts) and the web Lab both feed lines in and print what
// comes out, so they behave identically, and the tests can drive a whole session without a terminal.

import type { Term } from "./term.ts";
import { print } from "./print.ts";
import { freeVars, sorted } from "./alpha.ts";
import { toDeBruijn, printDB } from "./debruijn.ts";
import { run, formatTrace, describeStatus, strategyByName, normalOrder, STRATEGIES, type Strategy } from "./strategy.ts";
import { classifyForms, normalOrderBetaEta } from "./normal.ts";
import { expand, define, parseStatement, loadDefinitions, type Defs } from "./defs.ts";

export interface Session {
  readonly defs: Defs;
  readonly strategy: Strategy;
  readonly fuel: number;
  readonly trace: boolean;
  readonly names: boolean;   // try to name results after definitions ("= K")
}

export function newSession(prelude?: string): { session: Session; output: string[] } {
  const base: Session = { defs: new Map(), strategy: normalOrder, fuel: 10_000, trace: false, names: true };
  if (!prelude) return { session: base, output: [] };
  const r = loadDefinitions(prelude);
  return { session: { ...base, defs: r.defs }, output: [`prelude: ${r.count} definitions loaded`, ...r.errors, ...r.warnings] };
}

// α-invariant key of a closed-ish term (free variables in alphabetical order).
const keyOf = (t: Term) => printDB(toDeBruijn(t, sorted(freeVars(t))));

// If the value equals (up to α) the normal form of some definition, return that definition's name.
export function recognize(value: Term, s: Session): string | null {
  const k = keyOf(value);
  for (const d of [...s.defs.values()].reverse()) {                     // prefer the most recent definition
    const nf = run(d.body, normalOrder, { fuel: 500, maxSize: 5000, keepTrace: false });
    if (nf.status === "done" && keyOf(nf.result) === k) return d.name;
  }
  return null;
}

const HELP = [
  "  name = term      define a name (a macro: expanded before evaluation)",
  "  term             evaluate (expand definitions, then reduce with the current strategy)",
  "  :defs            list definitions",
  "  :show name       show a definition as written and expanded",
  "  :expand term     show the raw term after expanding definitions",
  "  :strategy s      normal | applicative | cbn | cbv | head | normal-eta",
  "  :fuel n          maximum reduction steps (now: FUEL)",
  "  :trace on|off    show every step",
  "  :forms term      which normal forms is it already in? (Module 11)",
  "  :db term         de Bruijn form (Module 6)",
  "  :reset           forget all definitions",
];

export function execLine(s: Session, line: string): { session: Session; output: string[] } {
  const text = line.replace(/--.*$/, "").trim();
  if (text === "") return { session: s, output: [] };
  const st = parseStatement(text);
  switch (st.kind) {
    case "error": return { session: s, output: [`error: ${st.message}`] };
    case "def": {
      const r = define(s.defs, st.name, st.term);
      if (!r.ok) return { session: s, output: [`error: ${r.error}`] };
      return { session: { ...s, defs: r.defs }, output: [`${st.name} = ${print(st.term)}`, ...(r.warning ? [`warning: ${r.warning}`] : [])] };
    }
    case "expr": return { session: s, output: evaluate(s, st.term) };
    case "command": return command(s, st.text);
  }
}

function evaluate(s: Session, t: Term): string[] {
  const raw = expand(t, s.defs);
  const r = run(raw, s.strategy, { fuel: s.fuel, maxSize: 50_000, keepTrace: s.trace });
  const out: string[] = [];
  if (s.trace) out.push(formatTrace(r, 60));
  const name = s.names && r.status === "done" ? recognize(r.result, s) : null;
  out.push(`${print(r.result)}${name ? `   = ${name}` : ""}`);
  out.push(`  (${s.strategy.short}: ${describeStatus(r)})`);
  return out;
}

function command(s: Session, text: string): { session: Session; output: string[] } {
  const [cmd, ...restParts] = text.slice(1).split(/\s+/);
  const rest = text.slice(1 + cmd.length).trim();
  const needTerm = (f: (t: Term) => string[]): { session: Session; output: string[] } => {
    const st = parseStatement(rest);
    if (st.kind !== "expr") return { session: s, output: [`error: :${cmd} needs a term${st.kind === "error" ? ` (${st.message})` : ""}`] };
    return { session: s, output: f(st.term) };
  };
  switch (cmd) {
    case "help": return { session: s, output: HELP.map(l => l.replace("FUEL", String(s.fuel))) };
    case "defs": return { session: s, output: s.defs.size ? [...s.defs.values()].map(d => `${d.name.padEnd(10)} = ${print(d.source)}`) : ["(no definitions)"] };
    case "show": {
      const d = s.defs.get(rest);
      return { session: s, output: d ? [`${d.name} = ${print(d.source)}`, `  expanded: ${print(d.body)}`] : [`error: '${rest}' is not defined`] };
    }
    case "expand": return needTerm(t => [print(expand(t, s.defs))]);
    case "db": return needTerm(t => { const e = expand(t, s.defs); return [printDB(toDeBruijn(e, sorted(freeVars(e))))]; });
    case "forms": return needTerm(t => {
      const c = classifyForms(expand(t, s.defs));
      return [Object.entries(c).map(([k, v]) => `${k}: ${v ? "yes" : "no"}`).join(" · ")];
    });
    case "strategy": {
      if (!rest) return { session: s, output: [`strategy: ${s.strategy.short}  (options: ${[...STRATEGIES.map(x => x.short), "normal-eta"].join(", ")})`] };
      try {
        const strat = rest === "normal-eta" ? { name: "normal order (βη)", short: "normal-eta", pick: normalEta } : strategyByName(rest);
        return { session: { ...s, strategy: strat }, output: [`strategy: ${strat.name}`] };
      } catch (e) { return { session: s, output: [`error: ${(e as Error).message}`] }; }
    }
    case "fuel": {
      const n = Number(restParts[0]);
      if (!Number.isInteger(n) || n < 1) return { session: s, output: ["error: :fuel needs a positive whole number"] };
      return { session: { ...s, fuel: n }, output: [`fuel: ${n}`] };
    }
    case "trace": return { session: { ...s, trace: rest === "on" }, output: [`trace: ${rest === "on" ? "on" : "off"}`] };
    case "reset": return { session: { ...s, defs: new Map() }, output: ["definitions cleared"] };
    default: return { session: s, output: [`error: unknown command :${cmd} (try :help)`] };
  }
}

const normalEta = normalOrderBetaEta.pick;

// Run many lines (a script), collecting output with the input echoed like a transcript.
export function runScript(s: Session, src: string): { session: Session; transcript: string[] } {
  let cur = s;
  const transcript: string[] = [];
  for (const raw of src.split(/\r?\n/)) {
    if (raw.replace(/--.*$/, "").trim() === "") continue;
    const r = execLine(cur, raw);
    transcript.push(`λ> ${raw.trim()}`, ...r.output);
    cur = r.session;
  }
  return { session: cur, transcript };
}
