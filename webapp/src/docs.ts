// docs.ts — renders the course's markdown (DECISIONS.md, GLOSSARY.md, ROADMAP.md) and source files
// inside the app, loaded at build time straight from the alonzo/ tree via Vite's glob imports.
import { marked } from "marked";

const markdown = import.meta.glob(["../../*.md", "../../track*/*/*.md", "../../lessons/**/*.md"],
  { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>;
const sources = import.meta.glob(["../../track*/*/src/*.ts", "../../track*/*/*.ts", "../../track*/*/*.lam", "../../track*/*/tests/*.ts"],
  { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>;

// Glob keys look like "../../track1-engine/01_term_ast/DECISIONS.md"; the public path drops "../../".
const toKey = (path: string) => "../../" + path;

export async function loadMarkdown(path: string): Promise<string | null> {
  const loader = markdown[toKey(path)];
  if (!loader) return null;
  return marked.parse(await loader(), { async: false }) as string;
}

export function listSources(dir: string): string[] {
  const prefix = toKey(dir) + "/";
  return Object.keys(sources).filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length)).sort((a, b) => {
    const rank = (s: string) => (s.startsWith("src/") ? 0 : s === "test.ts" ? 1 : s === "demo.ts" ? 2 : 3);
    return rank(a) - rank(b) || a.localeCompare(b);
  });
}

export async function loadSource(dir: string, file: string): Promise<string | null> {
  const loader = sources[toKey(dir) + "/" + file];
  return loader ? loader() : null;
}
