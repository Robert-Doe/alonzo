// Carried over from Module 12 (regression): these must keep passing in every later module.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseOrThrow as P, tokenize, define, expand, substMany, subst, loadDefinitions, parseStatement, splitStatements,
  newSession, execLine, runScript, recognize, run, normalOrder, alphaEquivalent, print, freeVars, Var,
  mulberry32, randomTerm, isClosed, type Defs, type Term,
} from "../src/index.ts";

const PRELUDE = readFileSync(new URL("./12_prelude.lam", import.meta.url), "utf8");
const session = () => newSession(PRELUDE).session;
const say = (lines: string) => runScript(session(), lines).transcript.join("\n");

test("the lexer now has an '=' token; the parser rejects it inside a term", () => {
  assert.deepEqual(tokenize("I = λx. x").tokens.map(t => t.kind), ["ident", "equals", "lambda", "ident", "dot", "ident", "eof"]);
  assert.match(parseStatement("(x = y)").kind, /error/);
});

test("statements: definitions, expressions, commands, errors", () => {
  assert.equal(parseStatement("K = λx y. x").kind, "def");
  assert.equal(parseStatement("K a b").kind, "expr");
  assert.equal(parseStatement(":defs").kind, "command");
  const e = parseStatement("K = λ. x");
  assert.ok(e.kind === "error" && /column 6: expected a parameter name/.test(e.message));
});

test("indented lines continue the previous statement; comments are dropped", () => {
  assert.deepEqual(splitStatements("S = λx y z.\n    x z (y z)  -- the S combinator\n\nK = λx y. x").map(s => s.text), ["S = λx y z. x z (y z)", "K = λx y. x"]);
});

test("the prelude loads cleanly", () => {
  const r = loadDefinitions(PRELUDE);
  assert.deepEqual(r.errors, []);
  assert.equal(r.count, 11);
  assert.deepEqual([...r.defs.keys()], ["I", "K", "KI", "S", "B", "C", "W", "M", "Omega", "twice", "apply"]);
});

test("classic identities, through the REPL", () => {
  const t = say("S K K a\nB f g x\nC K a b\nK I a b\ntwice twice f x");
  assert.match(t, /λ> S K K a\na\n/);
  assert.match(t, /λ> B f g x\nf \(g x\)\n/);
  assert.match(t, /λ> C K a b\nb\n/);
  assert.match(t, /λ> K I a b\nb\n/);
  assert.match(t, /f \(f \(f \(f x\)\)\)/);
});

test("results are named after definitions when they match", () => {
  const t = say("S K K\nK I\nB I I");
  assert.match(t, /λz\. z   = I/);
  assert.match(t, /λy\. λx\. x   = KI/);
  const s = session();
  assert.equal(recognize(P("λq. q"), s), "I");
  assert.equal(recognize(P("λq. q q q"), s), null);
});

test("recursive definitions are refused", () => {
  const r = define(new Map(), "loop", P("λx. loop x"));
  assert.ok(!r.ok && /mentions itself/.test(r.error));
});

test("redefinition warns, and earlier definitions keep the OLD meaning (static expansion)", () => {
  let d: Defs = new Map();
  for (const [n, s] of [["a", "p"], ["b", "λx. a x"], ["a", "q"]] as const) {
    const r = define(d, n, P(s));
    assert.ok(r.ok);
    d = r.defs;
    if (n === "a" && s === "q") assert.ok(r.warning);
  }
  assert.equal(print(d.get("b")!.body), "λx. p x");       // b captured a's meaning when b was defined
  assert.equal(print(expand(P("a"), d)), "q");
});

test("substMany is simultaneous: replacements are not re-scanned", () => {
  const out = substMany(P("x y"), new Map<string, Term>([["x", Var("y")], ["y", Var("x")]]));
  assert.equal(print(out), "y x");                          // a swap, impossible with two sequential substitutions
});

test("substMany avoids capture exactly like Module 5's subst (2000 random cases)", () => {
  const rand = mulberry32(120);
  const g = () => randomTerm(rand, { maxDepth: 6, names: ["x", "y", "z"] });
  for (let i = 0; i < 2000; i++) {
    const m = g(), n = g();
    assert.ok(alphaEquivalent(substMany(m, new Map([["x", n]])), subst(m, "x", n)), `${print(m)} [x := ${print(n)}]`);
  }
});

test("expansion avoids capture: a body's free name is not grabbed by the user's binder", () => {
  const r = define(new Map(), "getY", P("λk. k y"));       // y is free in the definition
  assert.ok(r.ok);
  const out = expand(P("λy. getY"), r.defs);
  assert.ok(alphaEquivalent(out, P("λw. λk. k y")), print(out));
  assert.ok(freeVars(out).has("y"));
});

test("DEFINITIONS ADD NO POWER: evaluating with names = evaluating the hand-expanded term (500 random programs)", () => {
  const rand = mulberry32(121);
  for (let i = 0; i < 500; i++) {
    // three random closed definitions, and a random expression that may use them
    let defs: Defs = new Map();
    for (const name of ["f", "g", "h"]) {
      let body: Term;
      do body = randomTerm(rand, { maxDepth: 4, names: ["x", "y"] }); while (!isClosed(body));
      const r = define(defs, name, body);
      assert.ok(r.ok); defs = r.defs;
    }
    const e = randomTerm(rand, { maxDepth: 4, names: ["f", "g", "h", "x"] });
    const viaNames = run(expand(e, defs), normalOrder, { fuel: 300, maxSize: 2000, keepTrace: false });
    // the hand-written expansion: plain Module 5 substitutions, one name at a time, bodies are closed
    let manual = e;
    for (const [n, d] of defs) manual = subst(manual, n, d.body);
    const viaManual = run(manual, normalOrder, { fuel: 300, maxSize: 2000, keepTrace: false });
    assert.equal(viaNames.status, viaManual.status);
    assert.equal(viaNames.stepCount, viaManual.stepCount);
    if (viaNames.status === "done") assert.ok(alphaEquivalent(viaNames.result, viaManual.result));
  }
});

test("commands", () => {
  const t = say(":strategy cbv\n:fuel 25\nK a Omega\n:strategy nope\n:show B\n:expand twice\n:db K\n:bogus");
  assert.match(t, /strategy: call-by-value/);
  assert.match(t, /OUT OF FUEL after 25 steps/);
  assert.match(t, /error: unknown strategy 'nope'/);
  assert.match(t, /B = λf\. λg\. λx\. f \(g x\)/);
  assert.match(t, /λ> :db K\nλ\. λ\. 1/);
  assert.match(t, /unknown command :bogus/);
});

test("execLine is pure: the old session is unchanged", () => {
  const s = session();
  const r = execLine(s, "Z = λz. z");
  assert.ok(r.session.defs.has("Z") && !s.defs.has("Z"));
});
