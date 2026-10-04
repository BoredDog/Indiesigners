#!/usr/bin/env bash
# Runs the Godot 4 console binary: $GODOT, then godot_console/godot on PATH, then the winget
# install folder. Usage: bash tools/godot.sh <args>   e.g. bash tools/godot.sh --headless --path godot
set -euo pipefail
G="${GODOT:-}"
[ -z "$G" ] && G=$(command -v godot_console || command -v godot || true)
[ -z "$G" ] && G=$(ls /c/Users/*/AppData/Local/Microsoft/WinGet/Packages/GodotEngine.GodotEngine_*/Godot_v4*_win64_console.exe 2>/dev/null | head -1 || true)
[ -z "$G" ] && { echo "Godot 4 not found: install it (winget install GodotEngine.GodotEngine) or set GODOT=/path/to/godot"; exit 2; }
exec "$G" "$@"
