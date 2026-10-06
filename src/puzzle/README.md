# src/puzzle — Echo Paths

Owner: Vansh. Turn-based grid puzzles that guard key evidence fragments.

| File | What it does |
|---|---|
| `types.ts` | Level file format (`LevelFile`), parsed `Level`, immutable `State`, `StepResult`. |
| `Rules.ts` | `parseLevel`, `initialState`, `step(level, state, dir)`, `inkTiles`, `sentinelAt`. Pure, no Phaser. |
| `Solver.ts` | BFS `solve(level, from?)`: shortest move list. Used by the solver tool and the in-game HINT. |
| `levels.ts` | Bundles every `content/puzzles/*.json` (Vite glob) + on-screen puzzle text. |
| `../scenes/PuzzleScene.ts` | Draws the board over the memory panel; undo / reset / hint (after 3 fails) / skip (after 6). |
| `../scenes/ArchiveScene.ts` | Hidden Archive beat → `pz_archive` collapse escape → Finale. |

## One turn
Wisp moves 1 tile (pushing a crate) → the entered tile acts (dial turns the light 90° clockwise; lever / sluice / node toggles its groups) → a collapsing tile it left falls away → sentinels step → shadows recast.
Then: wisp on ink = **slip**, on / in front of a sentinel = **caught** (both rewind one move and count toward HINT/SKIP), on the goal = **win**.

Shadows: light comes **from** `light` (N/E/S/W); every pillar and crate inks `shadow` tiles on the far side (stops at the next tall thing).

## Level file (`content/puzzles/<id>.json`)
```json
{ "id": "pz_sis_1", "title": "HUM! The Bell Rope", "tip": "The bell rope opens and closes the gates.",
  "reward": "ev_mira_resonance", "light": "W", "shadow": 2, "par": 10,
  "tiles": ["#....", "____A", ".....", "..S..", ".L.D."],
  "legend": { "A": "gate:g1", "L": "lever:g1" } }
```
Built-in tiles: `.` floor · `#` pillar · `_` pit · `S` start · `G` goal · `D` dial · `C` crate · `x` collapsing floor.
Legend kinds: `gate:g1` / `gate:g1:open`, `water:s1` / `water:s1:dry`, `lever:g1`, `sluice:s1`, `node:g1,g2`.
Sentinels: `"sentinels": [{ "path": [[2,1],[3,1]] }]` (ping-pong; `"loop": true` for a cycle; `"face"` for a static one).

## Tools
- `npx tsx tools/check-puzzle.ts` — unit checks per mechanic.
- `npx tsx tools/solve-puzzles.ts [--show] [id]` — proves each level solvable within par+4 and prints the hint path. Runs inside `npm run build`, so CI fails on a broken level.
- `npx tsx tools/gen-puzzles.ts <id> [samples] [seed]` — samples boards for a spec and keeps those that genuinely need each mechanic. Copy a result into the level file and tweak by hand.
- `npm run build && npx tsx tools/shots-puzzle.ts` — plays every level in headless Chrome through the real scene.

Contract: callers `scene.start('Puzzle', {puzzleId, evidenceId, witness, returnTo})`; on win the scene starts `returnTo` with `{witness, justFound: evidenceId}`. Missing level, or `?autosolve=1` in the URL → returns immediately the same way. Test hooks: `window.__puzzle.solve()`, `window.__puzzle.play('NESW')`.
