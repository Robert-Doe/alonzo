// Runs after `vite build`: publishes the course under dist/course/, mirroring alonzo/'s layout,
// so every relative link between tutorials, prerequisites, lessons and shared/ keeps working.
//
//   dist/index.html                                  the Lab app (Vite output)
//   dist/course/index.html                           course index
//   dist/course/track1-engine/01_term_ast/...        tutorial.html, DECISIONS.md, src/*.ts, ...
//
// Source files (.ts) and markdown are published as-is: the app's viewer (#/doc/...) renders
// markdown, and tutorials may link straight to source files.

import { readdirSync, statSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "webapp", "dist", "course");
const SKIP_DIRS = new Set(["webapp", "node_modules", ".git", "dist"]);
const PUBLISH_EXT = new Set([".html", ".css", ".js", ".md", ".ts", ".json", ".svg", ".png", ".c", ".h", ".txt", ".lam"]);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".") || SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (PUBLISH_EXT.has(extname(name))) out.push(full);
  }
  return out;
}

if (!existsSync(join(ROOT, "index.html"))) throw new Error("copy-course: alonzo/index.html not found; is the build running from the repo?");
let n = 0;
for (const f of walk(ROOT)) {
  const dst = join(OUT, relative(ROOT, f));
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(f, dst);
  n++;
}
console.log(`copy-course: published ${n} files to ${relative(ROOT, OUT)}`);
