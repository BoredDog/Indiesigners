#!/usr/bin/env bash
# Copies the shared story data (content/*.json, content/puzzles, content/pages) into the Godot
# project (godot/content), which Godot can only read from inside res://. Run after editing content.
# Usage: bash tools/sync-godot-content.sh [--check]   (--check: exit 1 if the copy is stale)
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "${1:-}" = "--check" ]; then
  diff -rq content godot/content >/dev/null && { echo "godot/content is in sync"; exit 0; }
  echo "godot/content is stale: run bash tools/sync-godot-content.sh"; diff -rq content godot/content || true; exit 1
fi
rm -rf godot/content
cp -r content godot/content
echo "synced content/ -> godot/content/"
