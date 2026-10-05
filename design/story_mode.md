# Story mode: design notes (branch `nav/eerie-trail`)

Echoes of Sorrow told as a **Terraria-style side-view world** (Gothicvania CC0 tiles and sprites, per-tile lighting, a little digging). It plays the way **Minecraft: Story Mode** plays: episodes, timed dialogue choices that characters remember, and quick-time events at action beats. The story follows `design/script_final` (Ivy → Luke → Hanna; the fourth person is withheld until the end).

**Play:** `npm run dev`, then pick **STORY MODE** on the title screen, or go to `/?scene=Story`. Add `&episode=3` to jump (0-based) and `&fresh=1` to wipe the save.
**Controls:** A/D move · W/Space jump · S drop through a plank · E interact · C evidence board · hold the left mouse button to dig · 1–4 pick a choice · Esc pause.

## Playtest review: what was confusing, and the fix
| # | Problem (as a player) | Fix |
|---|---|---|
| 1 | Ivy and Hanna used the same sprite; Elias's portrait didn't match the character you control | The ghosts use the team's pixel sprites in-world (same faces as their portraits); Elias's portrait is his in-game sprite |
| 2 | One person, many names: "unknown woman", "???", "Hanna", "the archivist"; "the figure" / "apprentice" / "fourth person" / "unknown person" | **One name each.** Hanna is only "The woman" until identified. The hooded person is only ever "the figure", and "the apprentice" appears exactly once, as the clue. A **name card** shows on first meeting (`IVY · the schoolteacher`) |
| 3 | No stated goal or role at the start | The opening says it: Elias Vane, ghost hunter; everyone vanished at 2:17; three ghosts remain; find out why |
| 4 | The casebook was a list of notes, so you never had to think | An **evidence board** (graph) with three **deductions the player makes** by linking clues (below) |
| 5 | "Investigate (2/4)" didn't say *what*; prompts only showed when you were standing on top of things | **"!" markers** over everything still unchecked; objectives say exactly what to do; board "?" cards hint where the missing clues are |
| 6 | Nia appeared out of nowhere in the final episode | Planted early: the child's toy in the prologue, the "ELI + NIA" drawing in the schoolhouse, and the small bundle the figure carries at the river. All on the board, linked to Nia at the end |
| 7 | Every memory opened with the same QTE | Ivy: timing (steady the lantern) · Luke: mash (push the boat) · Hanna: press (reach for her) · tunnel: press (run) · chamber: mash (hold the light) |
| 8 | The final choice didn't say what it meant | "REMEMBER: let the clock move, the ghosts can rest, I carry it" vs "FORGET: use the lantern on myself. Again." |
| 9 | Choices felt free of consequence | "Ivy will remember that." on key choices; Hanna recalls whether you asked her name; spotting the figure (Ivy, Luke) and hearing Hanna change Elias's finale lines; the summary lists it all |

## Evidence board (`src/world/board.ts`)
The board is laid out in columns: **People · What they remember · The village · Questions · The figure**.
- **Found cards** show an icon and a one-line caption. Click a card to read the detail.
- **"?" cards** are clues you haven't found yet, each with a hint ("Climb the clock tower").
- **Lines** appear once both ends are found. Red dashed lines mark a **contradiction** and gold lines a **revelation**.
- **Deductions** are red question cards. Click one, then click the clue that answers it. A wrong clue gets "That doesn't fit." and a small shake. At three story beats the board opens on the question and waits:
  1. **What does the key open?** → the lock on the well. This sends you underground.
  2. **Did time stop at 2:17?** → Luke's 2:31 watch (or the records). This is the contradiction.
  3. **Who is the figure?** → the burned photo's fourth face. The THE FIGURE card flips to ELIAS. The player makes the twist.

Edit nodes, links and answers in the `NODES`, `LINKS` and `DEDUCTIONS` tables.

## Episodes (`src/world/script.ts`)
1. **Enter Veyra:** arrival, the bell, the toy, the figure in the window; free investigation (footprints → key, bell rope at the top of the tower, the woman in the doorway, records and photo; optional well and schoolhouse) → deduction 1.
2. **Ivy:** the schoolteacher; timed choice; timing QTE; her memory (crowd runs to the square; choose where to look).
3. **Luke:** the boatman; mash QTE; choose whom to watch; 2:31 vs 2:17 → deduction 2.
4. **Hanna:** identified; her memory leads to the well; press QTE; unlock the well; **dig through the rubble**.
5. **Under Veyra:** the vault records (memory alteration), the collapse QTE, the deepest chamber.
6. **The true memory:** deduction 3 (who is the figure), young Elias, Nia, the network, every memory rewritten.
7. **Finale:** remember (2:17 → 2:18, ghosts rest, dawn) or forget (the loop).

## Files
| File | What it is |
|---|---|
| `src/world/worldgen.ts` | The map as data: town, tower, river, shaft, vault, chamber, anchors |
| `src/world/tiles.ts` | The tileset built from the Gothicvania sheets, sprites, animations |
| `src/world/Lighting.ts` | Terraria-style flood-fill tile lighting |
| `src/scenes/StoryScene.ts` | Tilemap, parallax, player physics, digging, NPCs |
| `src/world/Director.ts` | Dialogue, timed choices, "remember", QTEs, objectives, markers, board hooks |
| `src/world/board.ts` | The evidence board |
| `tools/shots-story.ts` | Screenshot run (`npm run test:story`) |

## Known gaps
- Ivy, Luke and Hanna have no walk animation (they're ghosts, so they float). Nia has no sprite; she only speaks.
- Rubble at the well is the only place digging is required; you can dig other dirt underground freely.
- Text speed and skip-scene settings are not built yet.
