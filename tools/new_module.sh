#!/usr/bin/env bash
# Usage: tools/new_module.sh <prev_dir> <new_dir> <prev_num> <new_num>
# Creates a cumulative module snapshot: copies src/ and tests/ from the previous module, turns the previous
# module's test.ts into a regression test file, and renames the package.
set -euo pipefail
cd "$(dirname "$0")/../track1-engine"
prev="$1"; new="$2"; pn="$3"; nn="$4"
mkdir -p "$new/tests"
cp -r "$prev/src" "$new/"
cp "$prev"/tests/*.ts "$new/tests/"
sed 's|"./src/index.ts"|"../src/index.ts"|; s|^// Module '"$pn"' tests — run:.*|// Carried over from Module '"$pn"' (regression): these must keep passing in every later module.|' "$prev/test.ts" > "$new/tests/$prev.test.ts"
# A module with its own prelude: carry that exact prelude as a fixture so its regression tests keep
# checking what THAT module promised, even after later modules extend prelude.lam.
if [ -f "$prev/prelude.lam" ]; then
  cp "$prev/prelude.lam" "$new/tests/${prev%%_*}_prelude.lam"
  sed -i 's|new URL("./prelude.lam", import.meta.url)|new URL("./'"${prev%%_*}"'_prelude.lam", import.meta.url)|' "$new/tests/$prev.test.ts"
  cp "$prev/prelude.lam" "$prev/repl-cli.ts" "$new/" 2>/dev/null || true
fi
sed "s/\"name\": \"alonzo-[^\"]*\"/\"name\": \"alonzo-${new//_/-}\"/" "$prev/package.json" > "$new/package.json"
sed -i "s/as of Module $pn\./as of Module $nn./" "$new/src/index.ts"
echo "created $new"
