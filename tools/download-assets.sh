#!/usr/bin/env bash
# Downloads every free third-party asset listed in tasks.md §4.2.
# Run from the repo root in Git Bash (Windows) or any bash:  bash tools/download-assets.sh
# Needs: curl, unzip. Safe to re-run (skips files that already exist).
#
# Output:
#   public/assets/fonts/        fonts + their license files (shipped with the game)
#   public/assets/textures/     CC0 colour maps from ambientCG (shipped with the game)
#   assets-raw/kenney/<pack>/   full Kenney packs (gitignored; copy only what you use into public/assets/ui/)
#
# NOT automated (manual download, see tasks.md §11.4): The Outlander CC0 village backgrounds (itch.io).
set -euo pipefail

ROOT="${ROOT:-$(pwd)}"
FONTS="$ROOT/public/assets/fonts"
TEX="$ROOT/public/assets/textures"
RAW="$ROOT/assets-raw"
mkdir -p "$FONTS" "$TEX" "$RAW/kenney" "$RAW/ambientcg"

fetch() { # url dest
  if [ -s "$2" ]; then echo "  skip  $(basename "$2")"; return; fi
  curl -fsSL --retry 3 -o "$2" "$1" && echo "  ok    $(basename "$2")"
}

echo "== Fonts (Google Fonts repo) =="
GF=https://github.com/google/fonts/raw/main
fetch "$GF/ofl/bangers/Bangers-Regular.ttf"             "$FONTS/Bangers-Regular.ttf"
fetch "$GF/ofl/bangers/OFL.txt"                         "$FONTS/Bangers-OFL.txt"
fetch "$GF/ofl/comicneue/ComicNeue-Regular.ttf"         "$FONTS/ComicNeue-Regular.ttf"
fetch "$GF/ofl/comicneue/ComicNeue-Bold.ttf"            "$FONTS/ComicNeue-Bold.ttf"
fetch "$GF/ofl/comicneue/OFL.txt"                       "$FONTS/ComicNeue-OFL.txt"
fetch "$GF/apache/specialelite/SpecialElite-Regular.ttf" "$FONTS/SpecialElite-Regular.ttf"
fetch "$GF/apache/specialelite/LICENSE.txt"             "$FONTS/SpecialElite-LICENSE.txt"
fetch "$GF/ofl/caveat/Caveat%5Bwght%5D.ttf"             "$FONTS/Caveat-Variable.ttf"
fetch "$GF/ofl/caveat/OFL.txt"                          "$FONTS/Caveat-OFL.txt"

echo "== Textures (ambientCG, CC0) =="
for id in Paper001 Paper002 Paper003 Cork001 Wood049 Concrete034; do
  zip="$RAW/ambientcg/${id}_1K-JPG.zip"
  fetch "https://ambientcg.com/get?file=${id}_1K-JPG.zip" "$zip"
  out="$TEX/$(echo "$id" | tr '[:upper:]' '[:lower:]').jpg"
  if [ ! -s "$out" ]; then
    color=$(unzip -Z1 "$zip" | grep -i '_Color\.jpg$' | head -1)
    unzip -p "$zip" "$color" > "$out" && echo "  ok    $(basename "$out")"
  fi
done

echo "== Kenney packs (CC0) =="
for pack in cursor-pack game-icons board-game-icons particle-pack; do
  dir="$RAW/kenney/$pack"
  if [ -d "$dir" ]; then echo "  skip  $pack"; continue; fi
  # Kenney's zip URL contains a changing hash, so read it from the asset page.
  url=$(curl -fsSL "https://kenney.nl/assets/$pack" | grep -oE 'https://kenney.nl/media/pages/assets/[^"]+\.zip' | head -1)
  if [ -z "$url" ]; then echo "  FAIL  $pack (download link not found; get it manually from https://kenney.nl/assets/$pack)"; continue; fi
  curl -fsSL --retry 3 -o "$RAW/kenney/$pack.zip" "$url"
  unzip -q -o "$RAW/kenney/$pack.zip" -d "$dir" && rm "$RAW/kenney/$pack.zip" && echo "  ok    $pack"
done

echo
echo "Done. Log every file you actually use in CREDITS.md (tasks.md §4.2)."
