#!/usr/bin/env bash
# Copies the shared story data (content/) and shared assets (public/assets/fonts, textures) into the
# Godot project (godot/content, godot/assets), which Godot can only read from inside res://.
# Run after editing content or adding assets.
# Usage: bash tools/sync-godot-content.sh [--check]   (--check: exit 1 if the copy is stale)
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "${1:-}" = "--check" ]; then
  if diff -rq content godot/content >/dev/null && diff -rq public/assets/fonts godot/assets/fonts >/dev/null     && diff -rq public/assets/textures godot/assets/textures >/dev/null; then echo "godot copies are in sync"; exit 0; fi
  echo "godot/content or godot/assets is stale: run bash tools/sync-godot-content.sh"; exit 1
fi
rm -rf godot/content godot/assets/fonts godot/assets/textures
cp -r content godot/content
mkdir -p godot/assets
cp -r public/assets/fonts godot/assets/fonts
cp -r public/assets/textures godot/assets/textures
echo "synced content/ -> godot/content/, public/assets/{fonts,textures} -> godot/assets/"
