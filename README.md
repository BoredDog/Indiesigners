# Echoes of Sorrow

*A ghostbuster returns to a village where every clock stopped at 2:17, and slowly finds out he is the case.*

Supernatural investigation thriller told as an interactive comic. TGC GameJam 2026, themes **Comic · Twist · Light**. Team **Indiesigners**.

- ▶️ **Play in the browser:** https://gravity006.github.io/Indiesigners/ (latest `main` build)
- 🎮 **itch.io:** *link added at release*

## How to play
Talk to the three ghosts of Veyra, step into their memories, and click the loud comic words (BELL!, TICK!…) to recover evidence. Some fragments are guarded by **Echo Paths** puzzles. When a deduction's evidence is complete, **RECONSTRUCT** what really happened. Confirm all nine deductions to open the record beneath the village.

| Input | Action |
|---|---|
| Left click | Everything: advance, select, inspect, zoom a panel |
| Space / Enter | Advance comic frames |
| Arrow keys / WASD | Move in Echo Paths puzzles · **Z** undo · **R** reset (HINT after 3 slips, SKIP after 6) |
| C | Open / close the casebook |
| Esc | Pause menu (settings) · close a zoomed panel / casebook |
| ← VILLAGE (memory page) | Leave a memory any time; progress is saved |

No timer and no fail state. Progress autosaves; **Continue** resumes it.
**Content warning:** death, disappearance, grief, family illness, guilt, memory manipulation, supernatural horror. No graphic gore.

## Run it locally
Needs Node 20+.
```bash
npm install
npm run dev        # http://localhost:5173  (dev shortcut: /?scene=Memory&witness=arun)
npm run build      # production build in dist/
npm test           # full headless test suite (needs: npx playwright install chromium)
npx tsx tools/check-links.ts   # every puzzle-locked clue → real puzzle → evidence back (after npm run build)
```
Testers' spoiler sheet (every clue, deduction answer and puzzle): `design/ANSWER_KEY.md` (`npm run answer-key`).

## Project
- [PLAN.md](PLAN.md): design and schedule · [TASKS.md](TASKS.md): who does what
- Story source of truth: `Echoes_of_Sorrow_Investigation_Thriller_Blueprint.pdf` (original pitch: `proposal.pdf`)
- Code: `src/core` (game state, story data), `src/comic` (comic rendering), `src/scenes`, `src/puzzle`; content in `content/*.json`
- **Godot 4 side track** (2D port of the same game, same `content/` data, post-jam route to 3D): `godot/`. See `godot/README.md`, `npm run test:godot`. The Phaser build is the jam submission.

## Team
Garv Singh · Nav Singhal · Vansh Jaiswal · Bhumi Chaudhari · Arya Pandey. Roles, asset credits and the **AI disclosure** are in [CREDITS.md](CREDITS.md).

## License
Code: MIT ([LICENSE](LICENSE)). Original art and writing: CC BY 4.0. Third-party assets: see CREDITS.md.
