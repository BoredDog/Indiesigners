#!/usr/bin/env bash
# Copies the shared story data (content/) and shared assets (public/assets/fonts, textures) into the
# Godot project (godot/content, godot/assets), which Godot can only read from inside res://.
# Godot's own *.import files next to the copies are kept. Run after editing content or adding assets.
# Usage: bash tools/sync-godot-content.sh [--check]   (--check: exit 1 if a copy is stale)
set -euo pipefail
cd "$(dirname "$0")/.."
PAIRS=("content:godot/content" "public/assets/fonts:godot/assets/fonts" "public/assets/textures:godot/assets/textures")

if [ "${1:-}" = "--check" ]; then
  stale=0
  for p in "${PAIRS[@]}"; do
    src=${p%%:*}; dst=${p#*:}
    diff -rq -x '*.import' "$src" "$dst" >/dev/null 2>&1 || { echo "stale: $dst"; stale=1; }
  done
  [ $stale -eq 0 ] && echo "godot copies are in sync" || echo "run: bash tools/sync-godot-content.sh"
  exit $stale
fi

for p in "${PAIRS[@]}"; do
  src=${p%%:*}; dst=${p#*:}
  mkdir -p "$dst"
  find "$dst" -type f ! -name '*.import' -delete
  cp -r "$src"/. "$dst"/
done
echo "synced content/ -> godot/content/, public/assets/{fonts,textures} -> godot/assets/"
