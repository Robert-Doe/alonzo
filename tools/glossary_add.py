"""Insert new entries into GLOSSARY.md in alphabetical position, never rewriting existing lines.

Usage:  python tools/glossary_add.py entries.md
where entries.md holds lines in the same format as GLOSSARY.md:
  - **Term**: definition. *First seen: Module N.*

Duplicates (same bold key) are skipped with a warning, because the glossary records the FIRST sighting.
"""
import re
import sys
from pathlib import Path

GLOSSARY = Path(__file__).resolve().parent.parent / "GLOSSARY.md"
GREEK = {"α": "alpha", "β": "beta", "η": "eta", "λ": "lambda", "ω": "omega", "Ω": "omega", "Γ": "gamma", "σ": "sigma", "Θ": "theta"}


def key(line: str) -> str:
    m = re.match(r"- \*\*(.+?)\*\*", line)
    raw = m.group(1) if m else line
    for g, name in GREEK.items():
        raw = raw.replace(g, name)
    return re.sub(r"[^a-z0-9]", "", raw.lower()) or raw


def main(path: str) -> None:
    lines = GLOSSARY.read_text(encoding="utf-8").split("\n")
    new = [l for l in Path(path).read_text(encoding="utf-8").split("\n") if l.startswith("- **")]
    existing = {re.match(r"- \*\*(.+?)\*\*", l).group(1) for l in lines if l.startswith("- **")}
    added = 0
    for entry in new:
        name = re.match(r"- \*\*(.+?)\*\*", entry).group(1)
        if name in existing:
            print(f"skip (already defined): {name}")
            continue
        k = key(entry)
        idx = [i for i, l in enumerate(lines) if l.startswith("- **")]
        pos = next((i for i in idx if key(lines[i]) > k), idx[-1] + 1 if idx else len(lines))
        lines.insert(pos, entry)
        existing.add(name)
        added += 1
    GLOSSARY.write_text("\n".join(lines), encoding="utf-8")
    print(f"added {added} entries")


if __name__ == "__main__":
    main(sys.argv[1])
