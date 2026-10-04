# Echoes of Sorrow: Godot 4 port (side track)

The **Phaser build (`../src`) is the jam prototype and submission candidate.** This folder is a
Godot 4.7 port started on the side (decision 5 Oct): same story, same rules, same data. It's
the route to a richer 2D/3D version after the jam.

## Rules of the port
- **One source of truth for story data:** `../content/*.json` (and `content/puzzles`, `content/pages`).
  Godot can only read inside `res://`, so `godot/content/` is a **copy**: run `npm run godot:sync`
  after editing content. `npm run test:godot` fails if the copy is stale.
- **Same rules as the Phaser build.** Each core script is a port of its TS counterpart, and
  `tests/test_core.gd` repeats `tools/check-core.ts` (all 6 witness orders → 9/9, save round trip…).
- Renderer: **GL Compatibility** (web export to itch works without WebGPU).

## Run
```bash
winget install GodotEngine.GodotEngine     # once (or set GODOT=/path/to/godot)
npm run godot:sync                         # copy content/ into godot/content/
npm run test:godot                         # headless core tests (exit 1 on failure)
bash tools/godot.sh --path godot           # run the game window
bash tools/godot.sh -e --path godot        # open the editor
```

## Map: Phaser → Godot
| Phaser (TS) | Godot (GDScript) | Status |
|---|---|---|
| `src/core/StoryData.ts` | `core/story_data.gd` (autoload `StoryData`) | ✅ ported + tested |
| `src/core/GameState.ts` + `SaveManager.ts` | `core/game_state.gd` (autoload `GameState`, `user://save.json`) | ✅ ported + tested |
| `src/core/DeductionController.ts` | `core/deduction_controller.gd` (autoload `Deductions`) | ✅ ported + tested |
| `src/puzzle/*` (Rules, Solver) | `puzzle/echo_rules.gd`, `puzzle/echo_solver.gd` | ✅ ported + tested (`-s res://tests/test_puzzles.gd`: same moves + state counts as TS) |
| `src/scenes/PuzzleScene.ts` | `scenes/puzzle.tscn` (+ `scenes/puzzle_menu.tscn` test menu) | ✅ ported + tested (`res://tests/test_puzzle_scene.tscn`). Open with `PuzzleScene.open(tree, {puzzleId, evidenceId, witness, returnTo})`, read `PuzzleScene.take_result()` |
| `src/scenes/ArchiveScene.ts` | `scenes/archive.tscn` | ✅ ported (beat → `pz_archive` → escaped → Finale; flag `archiveEscaped`) |
| `src/comic/*` (panels, shader, bubbles, SFX) | `comic/` (+ `comic_fx.gdshader`) | ⏳ GD2 |
| scenes Title → Village → Conversation → Memory → Deduction → Aftermath → Casebook → Archive → Finale → Ending | `scenes/*.tscn` | ⏳ GD3–GD8 |

Task list: the **Godot track** section at the bottom of `../TASKS.md`.
