# Echoes of Sorrow: Godot 4 port (side track)

The **Phaser build (`../src`) is the jam prototype and submission candidate.** This folder is a
Godot 4.7 port started on the side (decision 5 Oct): same story, same rules, same data. It's
the route to a richer 2D/3D version after the jam.

## Rules of the port
- **One source of truth for story data:** `../content/*.json` (and `content/puzzles`, `content/pages`).
  Godot can only read inside `res://`, so `godot/content/` and `godot/assets/` are **generated copies,
  not committed**: run `npm run godot:sync` before opening the editor (`npm run test:godot` syncs for you).
- **Same rules as the Phaser build.** Each core script is a port of its TS counterpart, and
  `tests/test_core.gd` repeats `tools/check-core.ts` (all 6 witness orders → 9/9, save round trip…).
- Renderer: **GL Compatibility** (web export to itch works without WebGPU).

## Run
```bash
winget install GodotEngine.GodotEngine     # once (or set GODOT=/path/to/godot)
npm run godot:sync                         # copy content/ into godot/content/
npm run test:godot                         # sync + every headless Godot test (exit 1 on failure)
bash tools/godot.sh --headless --path godot res://tests/test_memory.tscn   # memory pages (all 3 witnesses)
bash tools/godot.sh --headless --path godot res://tests/test_loop.tscn     # Title → … → Aftermath playthrough
bash tools/godot.sh --headless --path godot res://tests/test_accusation.tscn   # Archive → Accusation (A2) → Finale
bash tools/godot.sh --headless --path godot -s res://tests/test_puzzle_links.gd # every puzzle fragment ↔ evidence, Archive → Accusation
bash tools/godot.sh --path godot -- --scene=memory --witness=arun          # dev shortcut into any scene
bash tools/godot.sh --path godot           # run the game window
bash tools/godot.sh -e --path godot        # open the editor
bash tools/godot.sh --path godot res://scenes/comic_demo.tscn   # comic layer demo (Mira's page)
npx tsx tools/export-placeholders.ts       # re-export the Phaser placeholder art as PNGs (after npm run build)
bash tools/godot.sh --path godot --rendering-driver opengl3 --resolution 1920x1080 res://tests/shots_scenes.tscn -- --out=../test-results/godot   # screenshots (window ignores input)
```

## Map: Phaser → Godot
| Phaser (TS) | Godot (GDScript) | Status |
|---|---|---|
| `src/core/StoryData.ts` | `core/story_data.gd` (autoload `StoryData`) | ✅ ported + tested |
| `src/core/GameState.ts` + `SaveManager.ts` | `core/game_state.gd` (autoload `GameState`, `user://save.json`) | ✅ ported + tested |
| `src/core/DeductionController.ts` | `core/deduction_controller.gd` (autoload `Deductions`) | ✅ ported + tested; B1 `closeness()`: a wrong attempt says what's off (cards or conclusion, how many), never which (`ui_text.json` → `closeness`) |
| `src/core/Accusation.ts` | `core/accusation.gd` (static `Accusation`; `StoryData.accusation` = `content/accusation.json`) | ✅ A2: `tests/test_core.gd` (same checks as `check-core.ts`) |
| `src/puzzle/*` (Rules, Solver) | `puzzle/echo_rules.gd`, `puzzle/echo_solver.gd` | ✅ V12: `-s res://tests/test_puzzles.gd` (same moves + state counts as TS) |
| `src/scenes/PuzzleScene.ts` | `scenes/puzzle.tscn` (+ `scenes/puzzle_menu.tscn` test menu) | ✅ V13: `tests/test_puzzle_scene.tscn`. `Router.goto("puzzle", {puzzleId, evidenceId, witness, returnTo})` → back with `{witness, justFound, solved}` (or `PuzzleScene.open` / `take_result` without Router) |
| `src/scenes/ArchiveScene.ts` | `scenes/archive.tscn` | ✅ V13: beat → `pz_archive` → escaped → Accusation (until flag `accused`) → Finale; flag `archiveEscaped` |
| `src/scenes/AccusationScene.ts` | `scenes/accusation.tscn` | ✅ A2: `tests/test_accusation.tscn`. One clue per witness column + the Archive clue, name who did it; wrong → that option's nudge + LOOK AGAIN; right → CASE CLOSED, flag `accused`, CONTINUE → Finale |
| `src/comic/*` (panels, shader, bubbles, SFX) | `comic/` (+ `comic_fx.gdshader`) | ✅ GD2: demo `scenes/comic_demo.tscn` |
| `MemoryScene.ts` | `scenes/memory.tscn` (+ `core/router.gd` for scene data) | ✅ GD3: `tests/test_memory.tscn`; MENU, ← VILLAGE and the what-next hint (no dead ends, as Phaser #24); A1 spirit-light: LANTERN rail button / hold L, teal additive glow on the pointer, page `residue` in Caveat, `"light": true` clues hidden + ignoring the mouse until lit |
| `PauseScene.ts` | `scenes/pause.tscn` (overlay via `CoreUi.open_pause`) | ✅ Reduce Motion / Reduce Flashing / Fullscreen, RESUME, BACK TO TITLE (text size not yet: the Godot comic layer doesn't scale text) |
| Art (`npm run art` → `public/assets/art/`) | `ComicTheme.art(key)`; `godot:sync` copies the art to `godot/assets/art/` | ✅ the same drafts / final art as Phaser, placeholders as fallback (`-- --art=placeholder` to compare) |
| Title, Village, Conversation, Deduction, Aftermath (+ `coreUi.ts`) | `scenes/{title,village,conversation,deduction,aftermath}`, `core_ui.gd`, `popup_layer.gd` | ✅ GD4: `tests/test_loop.tscn` |
| Casebook | `scenes/casebook` | ✅ GD5: `tests/test_casebook.tscn` |
| `src/scenes/sequence/*.ts` (Opening, Finale, Ending) | `scenes/opening.tscn`, `finale.tscn`, `ending.tscn` (base `sequence_scene.gd`) | ✅ GD6: 6 / 8 / truth + epilogue (100% evidence) + summary; New Game → Opening, Archive → Finale → Ending → Title / Play Again |

Task list: the **Godot track** section at the bottom of `../TASKS.md`.
