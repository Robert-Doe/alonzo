"""Bookkeeping when a module is done: mark it ✅ in ROADMAP.md and add its card to index.html.

Usage: python tools/finish_module.py <dir> <number> <phase> "<title>" "<one-line description>"
  e.g. python tools/finish_module.py 07_redexes 7 2 "Redex Anatomy" "Where can a step happen?"
"""
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main(d: str, num: str, phase: str, title: str, desc: str) -> None:
    rm = ROOT / "ROADMAP.md"
    s = rm.read_text(encoding="utf-8")
    s2 = re.sub(r"(`track1-engine/" + re.escape(d) + r"/` \| )⬜", r"\1✅", s)
    rm.write_text(s2, encoding="utf-8")
    print("roadmap:", "marked" if s2 != s else "unchanged (already marked or not found)")

    ix = ROOT / "index.html"
    s = ix.read_text(encoding="utf-8")
    href = f"track1-engine/{d}/tutorial.html"
    if href in s:
        print("index: card already present")
        return
    card = (f'    <a class="card" href="{href}"><div class="n">Module {num}</div>'
            f'<div class="t">{html.escape(title)}</div><div class="d">{html.escape(desc)}</div></a>\n')
    marker = f"  </div><!--/phase{phase}-->"
    if marker not in s:
        raise SystemExit(f"index: no grid for phase {phase}")
    ix.write_text(s.replace(marker, card + marker), encoding="utf-8")
    print("index: card added")


if __name__ == "__main__":
    main(*sys.argv[1:6])
