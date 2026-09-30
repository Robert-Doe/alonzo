// Lab 10 — Reduction Graph Explorer.
// Draws Module 10's reductionGraph (every path at once), checks Church–Rosser on it, and tracks residuals.
import {
  parse, reductionGraph, confluenceReport, residuals, develop, findRedexes, print, printWithSpans, spanOf, pathToString,
  formatError, type ReductionGraph, type Term,
} from "../../../track1-engine/10_confluence/src/index.ts";
import type { LabContext } from "../registry.ts";
import { h, clear, outRow, panel } from "../ui.ts";

const PRESETS = ["(λx. x x) ((λy. y) z)", "(λx. y) ((λx. x x) (λx. x x))", "(λx. λy. x) ((λa. a) b) ((λc. c) d)", "(λx. x x) (λx. x x)", "(λf. f ((λz. z) b)) (λw. w)"];
const SVGNS = "http://www.w3.org/2000/svg";
const svg = (tag: string, attrs: Record<string, string | number>, text?: string) => {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (text !== undefined) el.textContent = text;
  return el;
};
const clip = (s: string, n = 26) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function drawGraph(g: ReductionGraph, onPick: (id: number) => void, picked: number): SVGSVGElement {
  const layers = new Map<number, number[]>();
  for (const n of g.nodes) layers.set(n.depth, [...(layers.get(n.depth) ?? []), n.id]);
  const W = 220, H = 90, depthMax = Math.max(...layers.keys());
  const widest = Math.max(...[...layers.values()].map(l => l.length));
  const width = Math.max(1, widest) * W + 40, height = (depthMax + 1) * H + 40;
  const pos = new Map<number, { x: number; y: number }>();
  for (const [d, ids] of layers) ids.forEach((id, i) => pos.set(id, { x: 20 + (width - 40) * (i + 0.5) / ids.length, y: 30 + d * H }));
  const root = svg("svg", { viewBox: `0 0 ${width} ${height}`, width, style: "max-width:100%;height:auto;display:block" }) as SVGSVGElement;
  const defs = svg("defs", {});
  const marker = svg("marker", { id: "arr10", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto" });
  marker.append(svg("path", { d: "M0,0 L10,5 L0,10 z", fill: "#9a9992" }));
  defs.append(marker); root.append(defs);
  for (const e of g.edges) {
    const a = pos.get(e.from)!, b = pos.get(e.to)!;
    if (e.from === e.to) {
      root.append(svg("path", { d: `M ${a.x + 60} ${a.y - 6} c 40 -30, 40 30, 2 14`, fill: "none", stroke: "#f87171", "stroke-width": 1.5, "marker-end": "url(#arr10)" }));
      root.append(svg("text", { x: a.x + 100, y: a.y, fill: "#f87171", "font-size": 11, "font-family": "JetBrains Mono, monospace" }, pathToString(e.path)));
    } else {
      const y1 = a.y + 14, y2 = b.y - 16;
      root.append(svg("line", { x1: a.x, y1, x2: b.x, y2, stroke: "#5c5c58", "stroke-width": 1.5, "marker-end": "url(#arr10)" }));
      root.append(svg("text", { x: (a.x + b.x) / 2 + 4, y: (y1 + y2) / 2, fill: "#9a9992", "font-size": 10, "font-family": "JetBrains Mono, monospace" }, pathToString(e.path)));
    }
  }
  for (const n of g.nodes) {
    const p = pos.get(n.id)!;
    const text = clip(print(n.term));
    const w = Math.min(200, 12 + text.length * 7.2);
    const color = n.normal ? "#4ade80" : n.id === 0 ? "#d4a017" : "#5c5c58";
    const grp = svg("g", { style: "cursor:pointer" });
    grp.append(svg("rect", { x: p.x - w / 2, y: p.y - 14, width: w, height: 28, rx: 8, fill: n.id === picked ? "#26261f" : "#18181b", stroke: color, "stroke-width": n.id === picked ? 2.5 : 1.5 }));
    grp.append(svg("text", { x: p.x, y: p.y + 4, fill: "#eeece6", "font-size": 12, "text-anchor": "middle", "font-family": "JetBrains Mono, monospace" }, text));
    grp.addEventListener("click", () => onPick(n.id));
    root.append(grp);
  }
  return root;
}

export function mount(root: HTMLElement, ctx: LabContext): void {
  const input = h("input", { type: "text", style: "width:100%;font-size:17px", spellcheck: "false" });
  input.value = ctx.params.get("term") ?? PRESETS[0];
  const graphBox = h("div", { class: "graph-box" }), info = h("div"), report = h("div"), resBox = h("div"), exBox = h("div");
  let picked = 0;

  function runAll(): void {
    for (const b of [graphBox, info, report, resBox, exBox]) clear(b);
    const p = parse(input.value);
    if (!p.term) { graphBox.append(outRow("error", formatError(input.value, p.errors[0]), "bad")); return; }
    const t = p.term;
    const g = reductionGraph(t, { maxNodes: 40, maxSize: 200 });
    if (picked >= g.nodes.length) picked = 0;
    graphBox.append(drawGraph(g, id => { picked = id; runAll(); }, picked),
      h("p", { class: "muted" }, "Gold = start · green = β-normal form · red loops = a step back to the same term (up to α). Click a node to inspect it."));
    const n = g.nodes[picked];
    info.append(outRow(`node #${n.id} · depth ${n.depth}${n.normal ? " · NORMAL FORM" : ""}`, print(n.term), "big"));
    const r = confluenceReport(g);
    report.append(
      outRow("graph", `${r.nodes} nodes, ${r.edges} edges${r.truncated ? " — TRUNCATED at the node/size limit (conclusions partial)" : ""}`),
      outRow("forks (two different one-step reducts of one node)", `${r.forks}, of which rejoin: ${r.joined}`),
      outRow("normal forms in the graph", r.normalForms.length ? r.normalForms.map(t => print(t)).join(", ") : "none"),
      outRow("complete development M*", print(develop(t))),
      h("div", { class: "verdict" }, r.joined === r.forks ? h("span", { class: "ok" }, "✓ Every fork rejoins: Church–Rosser holds on this graph.") : h("span", { class: "muted" }, "Some forks could not be joined inside the explored (truncated) part.")));
    renderResiduals(t);
    exBox.append(h("div", { class: "verdict" }, r.normalForms.length === 0 ? h("span", { class: "muted" }, "This term has no normal form in the graph. The exercise needs one that does.")
      : r.nodesCutOffFromNF > 0 ? h("span", { class: "ok" }, "Found a node cut off from the normal form?! (This would contradict Church–Rosser. Please tell us!)")
      : h("span", { class: "ok" }, `Every one of the ${r.nodes} nodes can still reach ${print(r.normalForms[0])}. No reduction choice can lose the normal form: that's Church–Rosser.`)));
  }

  function renderResiduals(t: Term): void {
    const rs = findRedexes(t);
    if (rs.length < 2) { resBox.append(h("p", { class: "muted" }, "Needs a term with at least two redexes.")); return; }
    const opts = (sel: number) => rs.map((r, i) => { const o = h("option", { value: i }, `${pathToString(r.path)}: ${clip(print(r.term), 30)}`); if (i === sel) o.selected = true; return o; });
    const fire = h("select", {}, ...opts(0)), track = h("select", {}, ...opts(1));
    const out = h("div");
    const go = () => {
      clear(out);
      const s = rs[Number(fire.value)], r = rs[Number(track.value)];
      const res = residuals(t, s.path, r.path);
      const sp = printWithSpans(res.reduct);
      const pre = h("pre", { class: "out-val big" });
      let i = 0;
      const spans = res.residuals.map(p => spanOf(sp, p)).sort((a, b) => a.start - b.start);
      for (const x of spans) { if (x.start < i) continue; pre.append(sp.text.slice(i, x.start), h("mark", { class: "redex-mark" }, sp.text.slice(x.start, x.end))); i = x.end; }
      pre.append(sp.text.slice(i));
      out.append(h("div", { class: "out-label" }, "reduct, with the residuals of R highlighted"), pre,
        h("p", {}, res.residuals.length === 0 ? (s === r ? "R was the redex that fired: it's gone." : "R was ERASED: its λ's argument was thrown away.")
          : res.residuals.length > 1 ? `R was COPIED: ${res.residuals.length} residuals.` : "R survived as one residual (maybe modified)."));
    };
    fire.addEventListener("change", go); track.addEventListener("change", go);
    resBox.append(h("div", { class: "row" }, "fire S:", fire), h("div", { class: "row" }, "track R:", track), out);
    go();
  }

  input.addEventListener("input", () => { picked = 0; runAll(); });
  root.append(
    h("p", {}, "Stop choosing: explore every reduction path at once. Each node is a term (α-equivalent terms are merged), and each arrow is one β-step, labelled by the redex's path."),
    panel("Term", h("div", { class: "row" }, ...PRESETS.map(p => h("button", { class: "ghost", onclick: () => { input.value = p; picked = 0; runAll(); } }, p))), input),
    panel("Reduction graph", graphBox, info),
    h("div", { class: "cols" },
      h("div", {}, panel("Church–Rosser report", report), panel("Brain Exercise checker", h("p", {}, "Find a term that HAS a normal form, but where some reduct can no longer reach it."), exBox)),
      panel("Residuals: what happens to R when S fires?", resBox)));
  runAll();
}
