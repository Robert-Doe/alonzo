// ui.ts — a tiny DOM helper, so labs read as structure, not string concatenation.

type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | EventListener | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = String(v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }
  for (const kid of kids) if (kid !== null && kid !== undefined && kid !== false) el.append(kid);
  return el;
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

// Output row: a label and a monospace value.
export function outRow(label: string, value: string, cls = ""): HTMLElement {
  return h("div", { class: "out-row" }, h("div", { class: "out-label" }, label), h("pre", { class: "out-val " + cls }, value));
}

export function panel(title: string, ...kids: Child[]): HTMLElement {
  return h("section", { class: "panel" }, h("h3", {}, title), ...kids);
}

// Link to a course page (tutorial, prerequisite). The course is published at ./course/ in both dev and build.
export function courseHref(path: string): string {
  return "course/" + path.split("/").map(encodeURIComponent).join("/");
}
