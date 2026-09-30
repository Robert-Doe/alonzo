// main.ts — hash router for the Alonzo Lab.
//
//   #/                    course map (every module; built ones are live)
//   #/lab/01?term=…       a module's Lab (+ Source and Decisions tabs)
//   #/doc/GLOSSARY.md     any course markdown file, rendered
import "./style.css";
import { modules, findModule, type ModuleEntry } from "./registry.ts";
import { h, clear, courseHref } from "./ui.ts";
import { loadMarkdown, listSources, loadSource } from "./docs.ts";

const app = document.getElementById("app")!;

function topbar(accent = "#d4a017"): HTMLElement {
  document.body.style.setProperty("--accent", accent);
  return h("nav", { class: "topbar" },
    h("a", { class: "brand", href: "#/" }, "λ ", h("span", {}, "Alonzo"), " Lab"),
    h("a", { href: courseHref("index.html") }, "Course"),
    h("a", { href: courseHref("prerequisites.html") }, "Prerequisites"),
    h("a", { href: "#/doc/ROADMAP.md" }, "Roadmap"),
    h("a", { href: "#/doc/GLOSSARY.md" }, "Glossary"),
  );
}

function home(): void {
  const section = (name: string, sub: string, list: ModuleEntry[]) =>
    h("section", { class: "track" }, h("h2", {}, name), h("p", { class: "muted" }, sub),
      h("div", { class: "grid" }, ...list.map(m => m.dir
        ? h("div", { class: "mcard live", style: `--c:${m.accent}` },
            h("div", { class: "mnum" }, m.id), h("div", { class: "mtitle" }, m.title),
            h("div", { class: "mlinks" },
              h("a", { href: `#/lab/${m.id}` }, "▶ Lab"),
              h("a", { href: courseHref(`${m.dir}/tutorial.html`) }, "Tutorial"),
              h("a", { href: `#/doc/${m.dir}/DECISIONS.md` }, "Decisions")))
        : h("div", { class: "mcard" }, h("div", { class: "mnum" }, m.id), h("div", { class: "mtitle" }, m.title),
            h("div", { class: "mlinks muted" }, "planned")))));
  clear(app);
  app.append(topbar(),
    h("header", { class: "hero" },
      h("h1", {}, "λ ", h("span", {}, "Alonzo"), " Lab"),
      h("p", {}, "Every Lab runs the exact source of its module, the same files the tutorial explains and the tests check. Build terms, step through reductions and watch the compiler work.")),
    h("main", { class: "wrap" },
      section("Track 1: The Engine", "The λ-calculus itself: syntax, reduction, encodings, machines, types.", modules.filter(m => m.track === "1")),
      section("Track 2: The Compiler", "Alonzo-ML to C and WebAssembly, one λ-to-λ pass at a time.", modules.filter(m => m.track === "2")),
      section("Track H: History, Rebuilt", "Historical systems, papers and paradoxes, reconstructed as running code.", modules.filter(m => m.track === "H"))));
}

async function docPage(path: string): Promise<void> {
  clear(app);
  const body = h("article", { class: "doc" }, "Loading…");
  app.append(topbar(), h("main", { class: "wrap" }, body));
  const html = await loadMarkdown(path);
  body.innerHTML = html ?? `<p>No document at <code>${path.replace(/</g, "&lt;")}</code>.</p>`;
}

async function labPage(id: string, params: URLSearchParams, tab: string): Promise<void> {
  const m = findModule(id);
  clear(app);
  if (!m || !m.dir || !m.lab) {
    app.append(topbar(), h("main", { class: "wrap" }, h("p", {}, `Module ${id} has no Lab yet. `, h("a", { href: "#/" }, "Back to the map"))));
    return;
  }
  const i = modules.indexOf(m);
  const prev = modules[i - 1]?.dir ? modules[i - 1] : undefined;
  const next = modules[i + 1]?.dir ? modules[i + 1] : undefined;
  const q = params.toString();
  const tabLink = (name: string, label: string) =>
    h("a", { class: "tab" + (tab === name ? " on" : ""), href: `#/lab/${id}${name === "lab" ? "" : "/" + name}${q ? "?" + q : ""}` }, label);
  const body = h("div", { class: "lab-body" });
  app.append(topbar(m.accent),
    h("header", { class: "lab-head" },
      h("div", { class: "wrap" },
        h("div", { class: "badge" }, `MODULE ${m.id}`),
        h("h1", {}, m.title),
        h("div", { class: "lab-actions" },
          h("a", { class: "btn", href: courseHref(`${m.dir}/tutorial.html`) }, "📖 Tutorial"),
          prev ? h("a", { class: "btn ghost", href: `#/lab/${prev.id}` }, `← Lab ${prev.id}`) : null,
          next ? h("a", { class: "btn ghost", href: `#/lab/${next.id}` }, `Lab ${next.id} →`) : null),
        h("nav", { class: "tabs" }, tabLink("lab", "Lab"), tabLink("source", "Source"), tabLink("decisions", "Decisions")))),
    h("main", { class: "wrap" }, body));

  if (tab === "source") {
    const files = listSources(m.dir);
    const pre = h("pre", { class: "source" });
    const pick = async (f: string) => {
      pre.textContent = (await loadSource(m.dir!, f)) ?? "";
      list.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.textContent === f));
    };
    const list = h("div", { class: "file-list" }, ...files.map(f => h("button", { onclick: () => pick(f) }, f)));
    body.append(h("p", { class: "muted" }, `The exact files in ${m.dir}/. This Lab imports them unmodified.`), list, pre);
    if (files.length) pick(files[0]);
  } else if (tab === "decisions") {
    const art = h("article", { class: "doc" }, "Loading…");
    body.append(art);
    art.innerHTML = (await loadMarkdown(`${m.dir}/DECISIONS.md`)) ?? "<p>No DECISIONS.md yet.</p>";
  } else {
    const lab = await m.lab();
    lab.mount(body, { params });
  }
}

function route(): void {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, query = ""] = raw.split("?");
  const params = new URLSearchParams(query);
  const parts = path.split("/").filter(Boolean);
  window.scrollTo(0, 0);
  if (parts[0] === "lab" && parts[1]) void labPage(parts[1], params, parts[2] ?? "lab");
  else if (parts[0] === "doc") void docPage(parts.slice(1).map(decodeURIComponent).join("/"));
  else home();
}

window.addEventListener("hashchange", route);
route();
