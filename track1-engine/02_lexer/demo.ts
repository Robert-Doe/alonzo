// Module 2 demo — run: npm run demo
// Every output quoted in tutorial.html is copied from this program's actual output.
import { tokenize, formatToken, formatError } from "./src/index.ts";

function show(src: string): void {
  console.log(`\n>>> ${JSON.stringify(src)}`);
  const { tokens, errors } = tokenize(src);
  for (const t of tokens) console.log("  " + formatToken(t));
  for (const e of errors) console.log(formatError(src, e).replace(/^/gm, "  "));
}

console.log("== Token streams ==");
show("(\\x. x) y");
show("λx.λy. x");
show("λxy. x");
show("λx.\n  x y  -- a comment");

console.log("\n== Errors are located, and lexing continues ==");
show("λx. x + y");
show("f 42");
