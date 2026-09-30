// registry.ts — the course map (mirrors ROADMAP.md) and which Labs exist.
// A module gets `lab` once it is built; the home page shows everything else as planned.

export interface LabContext {
  params: URLSearchParams;         // ?term=…&ex=… from tutorial deep links
}
export interface LabModule {
  mount(el: HTMLElement, ctx: LabContext): void;
}
export interface ModuleEntry {
  id: string;            // "01", "C01", "H1"
  track: "1" | "2" | "H";
  title: string;
  dir?: string;          // path under alonzo/, once built
  accent: string;
  lab?: () => Promise<LabModule>;
}

const A = ["#d4a017", "#82aaff", "#4ade80", "#c792ea", "#fb923c", "#f472b6", "#2dd4bf", "#f87171"];

const t1: [string, string][] = [
  ["01", "Term AST & Printer"], ["02", "Lexer"], ["03", "Parser"], ["04", "Free Variables & α-Equivalence"],
  ["05", "Capture-Avoiding Substitution"], ["06", "de Bruijn Indices"], ["07", "Redex Anatomy"],
  ["08", "β-Contraction & One-Step Reduction"], ["09", "Reduction Strategies & Traces"],
  ["10", "Reduction Graphs, Residuals & Church–Rosser"], ["11", "η-Conversion & Normal-Form Zoo"],
  ["12", "Definitions, Prelude & REPL"], ["13", "Church Booleans & Pairs"], ["14", "Church Numerals & Arithmetic"],
  ["15", "Fixed Points: Y, Z, Θ"], ["16", "Data Encodings: Church vs Scott vs Parigot"],
  ["17", "SKI Combinators & Bracket Abstraction"], ["18", "Binary λ-Calculus & a Self-Interpreter"],
  ["19", "Environment Interpreter & Closures"], ["20", "Krivine Machine"], ["21", "CEK Machine & call/cc"],
  ["22", "Call-by-Need: Thunks & Sharing"], ["23", "Normalization by Evaluation"],
  ["24", "Simply Typed λ-Calculus"], ["25", "Strong Normalization, Observed"], ["26", "Hindley–Milner Inference"],
  ["27", "Curry–Howard: Proofs as Programs"], ["28", "System F"], ["29", "Bidirectional Type Checking"],
  ["30", "Dependent Types"], ["31", "A Mini Proof Assistant"], ["32", "Explicit Substitutions (λσ)"],
  ["33", "Interaction Nets & Optimal Sharing"], ["34", "Böhm Trees & Infinite Normal Forms"],
];
const t2: [string, string][] = [
  ["C01", "Surface Language & Desugaring"], ["C02", "Type Inference for Alonzo-ML"], ["C03", "Algebraic Data Types"],
  ["C04", "Pattern-Match Compilation"], ["C05", "A-Normal Form"], ["C06", "CPS Conversion"], ["C07", "Closure Conversion"],
  ["C08", "Defunctionalization & Lambda Lifting"], ["C09", "Optimizer"], ["C10", "C Code Generation"],
  ["C11", "Runtime: Heap & Copying GC"], ["C12", "Tail Calls & Trampolines"], ["C13", "WebAssembly Back End"],
  ["C14", "Effects & Handlers (capstone)"],
];
const tH: [string, string][] = [
  ["H1", "Schönfinkel 1924"], ["H2", "Church 1932 & the Kleene–Rosser Paradox"], ["H3", "Church 1936: The Undecidable"],
  ["H4", "Turing 1936–37: λ ≡ Turing Machines"], ["H5", "McCarthy 1960: LISP eval & the Funarg Bug"],
  ["H6", "Landin 1964: SECD & ISWIM"], ["H7", "Milner: LCF & ML"], ["H8", "de Bruijn: Automath"],
];

// Built modules: directory + lab loader.
const built: Record<string, { dir: string; lab: () => Promise<LabModule> }> = {
  "01": { dir: "track1-engine/01_term_ast", lab: () => import("./labs/lab01.ts") },
  "02": { dir: "track1-engine/02_lexer", lab: () => import("./labs/lab02.ts") },
  "03": { dir: "track1-engine/03_parser", lab: () => import("./labs/lab03.ts") },
  "04": { dir: "track1-engine/04_alpha", lab: () => import("./labs/lab04.ts") },
  "05": { dir: "track1-engine/05_substitution", lab: () => import("./labs/lab05.ts") },
  "06": { dir: "track1-engine/06_de_bruijn", lab: () => import("./labs/lab06.ts") },
  "07": { dir: "track1-engine/07_redexes", lab: () => import("./labs/lab07.ts") },
  "08": { dir: "track1-engine/08_beta", lab: () => import("./labs/lab08.ts") },
  "09": { dir: "track1-engine/09_strategies", lab: () => import("./labs/lab09.ts") },
  "10": { dir: "track1-engine/10_confluence", lab: () => import("./labs/lab10.ts") },
  "11": { dir: "track1-engine/11_eta_normal_forms", lab: () => import("./labs/lab11.ts") },
  "12": { dir: "track1-engine/12_repl_prelude", lab: () => import("./labs/lab12.ts") },
  "13": { dir: "track1-engine/13_booleans_pairs", lab: () => import("./labs/lab13.ts") },
};

export const modules: ModuleEntry[] = [
  ...t1.map(([id, title], i): ModuleEntry => ({ id, title, track: "1", accent: A[i % A.length], ...built[id] })),
  ...t2.map(([id, title], i): ModuleEntry => ({ id, title, track: "2", accent: A[(i + 3) % A.length], ...built[id] })),
  ...tH.map(([id, title], i): ModuleEntry => ({ id, title, track: "H", accent: A[(i + 5) % A.length], ...built[id] })),
];

export function findModule(id: string): ModuleEntry | undefined {
  return modules.find(m => m.id === id);
}
