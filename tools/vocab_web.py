"""Generate a module's vocabulary web: one concept_<key>.html per term plus concept_how_they_connect.html.

Usage: python tools/vocab_web.py <spec.json>
spec: {
  "dir": "track1-engine/08_beta", "module": 8, "hub_title": "...", "hub_h1": "...", "hub_tagline": "...",
  "concepts": [ {"key","title","h1","tagline","sentence","analogy_big","analogy","see","wrong","right","connects"} ],
  "picture_svg": "<svg>…</svg>", "picture_caption": "...",
  "pairs": [ ["pair","wrong","correction"] ],
  "quiz": [ ["scenario","answer","why"] ]
}
All text fields are HTML. The layout and styling are fixed so every vocabulary web in the course looks the same.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;800&family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../shared/course.css">{extra_css}
</head>
<body>
<nav class="topbar"><a class="brand" href="../../index.html">λ <span>Alonzo</span></a><a href="concept_how_they_connect.html">Vocabulary hub</a><a href="tutorial.html">Module {module} tutorial</a><span class="spacer"></span><span class="muted">{crumb}</span></nav>
<header class="hero">
  <div class="badge">{badge}</div>
  <h1>{h1}</h1>
  <p class="tagline">{tagline}</p>
</header>
<main class="container">
"""

HUB_CSS = """
<style>
  .defgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin: 20px 0; }
  .defgrid a { display: block; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; text-decoration: none; color: var(--text); }
  .defgrid a:hover { border-color: var(--brand); }
  .defgrid .t { font-family: var(--display); font-weight: 800; color: var(--brand); font-size: 1.1rem; }
  .quiz-row { display: grid; grid-template-columns: 1fr 190px; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); }
  .quiz-row select { font: 14px var(--body); background: var(--bg-elevated); color: var(--text); border: 1px solid var(--border); border-radius: 6px; padding: 5px; }
  .quiz-row .res { grid-column: 1 / -1; font-size: 14px; }
  button.check { background: var(--brand); color: #1a1305; border: 0; border-radius: 8px; padding: 9px 18px; font: 600 14px var(--body); cursor: pointer; margin-top: 14px; }
  @media (max-width: 560px) { .quiz-row { grid-template-columns: 1fr; } }
</style>"""


def concept_page(spec, c, i, n):
    links = {k["key"]: k["h1"] for k in spec["concepts"]}
    body = HEAD.format(title=c["title"], extra_css="", module=spec["module"], crumb=f"Vocabulary web · {i} of {n}",
                       badge="CONCEPT", h1=c["h1"], tagline=c["tagline"])
    body += f"""<section>
  <h2>In one sentence</h2>
  <p>{c['sentence']}</p>
  <div class="analogy"><div class="big">{c['analogy_big']}</div><p>{c['analogy']}</p></div>
</section>
<section>
  <h2>See it</h2>
  {c['see']}
</section>
<section>
  <h2>Common mix-up</h2>
  <div class="callout red"><div class="label">Wrong</div><p>{c['wrong']}</p></div>
  <div class="callout green"><div class="label">Right</div><p>{c['right']}</p></div>
</section>
<section>
  <div class="callout accent"><div class="label">How this connects to the other terms</div><p>{c['connects']}</p></div>
  <p>Siblings: {' · '.join(f'<a href="concept_{k}.html">{v}</a>' for k, v in links.items() if k != c['key'])}</p>
  <p><a href="concept_how_they_connect.html">→ See all {n} terms side by side</a></p>
</section>
</main>
<footer>Alonzo · Module {spec['module']} vocabulary web</footer>
</body>
</html>
"""
    return body


def hub_page(spec):
    n = len(spec["concepts"])
    body = HEAD.format(title=spec["hub_title"], extra_css=HUB_CSS, module=spec["module"], crumb="Vocabulary web · hub",
                       badge="VOCABULARY HUB", h1=spec["hub_h1"], tagline=spec["hub_tagline"])
    cards = "\n".join(f'  <a href="concept_{c["key"]}.html"><div class="t">{c["h1"]}</div><div>{c["tagline"]}</div></a>' for c in spec["concepts"])
    pairs = "\n".join(f"<tr><td>{a}</td><td>{b}</td><td>{c}</td></tr>" for a, b, c in spec["pairs"])
    options = json.dumps([c["h1"] for c in spec["concepts"]], ensure_ascii=False)
    quiz = json.dumps(spec["quiz"], ensure_ascii=False)
    first = spec["concepts"][0]
    body += f"""<section><h2>Definitions, side by side</h2>
<div class="defgrid">
{cards}
</div></section>
<section><h2>One picture: where each term lives</h2>
<div class="diagram">{spec['picture_svg']}<div class="caption">{spec['picture_caption']}</div></div></section>
<section><h2>Commonly confused pairs</h2><div class="table-wrap"><table class="data">
<tr><th>Pair</th><th>The wrong statement</th><th>The correction</th></tr>
{pairs}
</table></div></section>
<section><h2>Scenario quiz: which term fits?</h2><div id="quiz"></div><button class="check" id="check">Check answers</button><p id="score" class="muted"></p></section>
<div class="module-nav"><a href="tutorial.html"><span class="dir">← Back to</span>Module {spec['module']} tutorial</a><a class="next" href="concept_{first['key']}.html"><span class="dir">Start the tour →</span>{first['h1']}</a></div>
</main>
<footer>Alonzo · Module {spec['module']} vocabulary web</footer>
<script>
(function () {{
  var O = {options};
  var Q = {quiz};
  var box = document.getElementById("quiz");
  var rows = Q.map(function (q, i) {{
    var row = document.createElement("div"); row.className = "quiz-row";
    var p = document.createElement("div"); p.innerHTML = (i + 1) + ". " + q[0];
    var s = document.createElement("select");
    s.innerHTML = '<option value="">choose…</option>' + O.map(function (o) {{ return "<option>" + o + "</option>"; }}).join("");
    var res = document.createElement("div"); res.className = "res";
    row.appendChild(p); row.appendChild(s); row.appendChild(res); box.appendChild(row);
    return {{ s: s, res: res, q: q }};
  }});
  document.getElementById("check").addEventListener("click", function () {{
    var right = 0;
    rows.forEach(function (x) {{
      var ok = x.s.value === x.q[1]; if (ok) right++;
      x.res.innerHTML = (ok ? '<span style="color:var(--green)">✓ ' : '<span style="color:var(--red)">✗ Answer: <b>' + x.q[1] + '</b>. ') + x.q[2] + '</span>';
    }});
    document.getElementById("score").textContent = right + " / " + Q.length + " correct";
  }});
}})();
</script>
</body>
</html>
"""
    return body


def main(path):
    spec = json.loads(Path(path).read_text(encoding="utf-8"))
    out = ROOT / spec["dir"]
    n = len(spec["concepts"])
    for i, c in enumerate(spec["concepts"], 1):
        (out / f"concept_{c['key']}.html").write_text(concept_page(spec, c, i, n), encoding="utf-8")
    (out / "concept_how_they_connect.html").write_text(hub_page(spec), encoding="utf-8")
    print(f"wrote {n} concept pages + hub to {spec['dir']}")


if __name__ == "__main__":
    main(sys.argv[1])
