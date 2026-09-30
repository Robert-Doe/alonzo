// repl-cli.ts — the terminal front end for src/repl.ts.
//
//   npm run repl                     interactive (prelude.lam loaded)
//   npm run repl -- script.lam       run a file of lines, print a transcript, exit
//   echo "S K K a" | npm run repl    piped input works too (non-TTY stdin)
//
// All the logic is in src/repl.ts (pure); this file only moves lines between the terminal and execLine.
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { newSession, execLine, runScript } from "./src/index.ts";

const prelude = readFileSync(fileURLToPath(new URL("./prelude.lam", import.meta.url)), "utf8");
const started = newSession(prelude);
let session = started.session;
const file = process.argv[2];

if (file) {
  const r = runScript(session, readFileSync(file, "utf8"));
  console.log(r.transcript.join("\n"));
} else {
  const interactive = process.stdin.isTTY === true;
  if (interactive) {
    console.log("Alonzo λ-REPL (Module 12). :help for commands, Ctrl+C or :quit to leave.");
    console.log(started.output.join("\n"));
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: "λ> ", terminal: interactive });
  if (interactive) rl.prompt();
  rl.on("line", line => {
    if (line.trim() === ":quit" || line.trim() === ":q") { rl.close(); return; }
    if (!interactive && line.trim()) console.log(`λ> ${line.trim()}`);
    const r = execLine(session, line);
    session = r.session;
    if (r.output.length) console.log(r.output.join("\n"));
    if (interactive) rl.prompt();
  });
}
