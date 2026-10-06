# Story mode: design notes (branch `nav/eerie-trail`)

Echoes of Sorrow told as a **Terraria-style side-view world** (Gothicvania CC0 tiles and sprites, per-tile lighting, a little digging). It plays the way **Minecraft: Story Mode** plays: episodes, timed dialogue choices that characters remember, and quick-time events at action beats. The story follows `design/script_final` (Ivy → Luke → Hanna; the fourth person is withheld until the end).

**Play:** `npm run dev`, then pick **STORY MODE** on the title screen, or go to `/?scene=Story`. Add `&episode=3` to jump (0-based) and `&fresh=1` to wipe the save.
**Controls:** A/D move · W/Space jump · S drop through a plank · E interact · **hold F or the right mouse button to raise the lantern** · C evidence board · hold the left mouse button to dig · 1–4 pick a choice · Esc pause.

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
| 9 | Choices felt free of consequence | "Ivy will remember that." on key choices; Hanna recalls whether you asked her name; spotting the figure (Ivy, Luke) and hearing Hanna change Elias's finale lines. Each ghost's goodbye in the good ending depends on what you said to them, and on whether you helped Luke push the boat. The summary lists it all |

## Echo sight: the lantern (`Director.trace`, `Director.updateSight`)
The lantern is the detective tool, in the spirit of Hitman's instinct or Batman's detective mode.
- **Hold F, or the right mouse button,** to raise it. Elias walks at half speed, the screen closes into a teal vignette, the light grows and the lantern hums.
- **Echo traces** are hidden sprites that only appear inside the raised lantern's light. Once revealed they stay faintly visible, and the clue spot they gate gets its "!" mark.
- **The instinct:** while the lantern is down, a faint teal ring pulses from it whenever a hidden trace is within about seven tiles.
- **Where it's used:**
  - Episode 1: the footprints (the first required clue, so it teaches the mechanic) and the symbols on the well.
  - Episode 4: prints on the riverbank, a second chance at the CARRIED clue for players who watched Luke instead of the figure.
- Add a trace with `d.trace(id, x, y, textureKey)`. Gate a spot with `when: () => d.revealed(id)`. Traces are cleared at the end of each episode.

## The river
The river is dry in the present, as in the team script: a shallow bed of cracked mud with the last boat lying on its side, shallow enough to walk through and climb out of. In Luke's memory the water fills back in and the boat floats (`StoryScene.setRiver`). When the memory ends, it drains away again.

## Closing comic: the case file (`src/story/caseFile.ts`)
Before the results screen, the case is retold as Elias's hard-boiled detective comic: "CASE FILE 217: VEYRA".
- **Look:** three pages of ink-framed panels in near-greyscale halftone (the shared `ComicFxPipeline`), with typewritten captions in Special Elite, in his voice.
- **Art:** the painted backgrounds from the art pack (`public/assets/story/comic/`), with game sprites and props baked into each panel.
- **Pages:**
  1. The letter, the bell and the stopped clocks.
  2. The three witnesses, then the photograph and the lantern.
  3. The ending. In the good ending, colour floods back into Veyra at 2:18. In the forget ending, ink swallows the panel and the case stays open.
- Luke's caption changes if you helped push the boat.
- Click, Space or Enter moves on a beat. SKIP jumps to the last page, which can't be skipped.

## Quick-time events (`src/story/qte.ts`)
Every QTE opens with a short READY → NOW! lead-in that ignores input, so it never catches a dialogue key press. Mashing clicks on every tap. The timing QTE shows HIT or MISS each round and pauses between rounds, and its gold target brightens while a press would count. Failure text matches the QTE: TOO SLOW, NOT ENOUGH or MISSED.

## Evidence board (`src/world/board.ts`)
The board is laid out in columns: **People · What they remember · The village · Questions · The figure**.
- **Found cards** show an icon and a one-line caption. Click a card to read the detail.
- **"?" cards** are clues you haven't found yet. Their hints are deliberately vague ("Somewhere in the village") so the board never spoils a find.
- **No lines.** Lines across five columns always cut through some card, so the board draws none. Each card has a "N LINKS" tag on its top edge. Clicking a card dims everything unrelated and lights up the cards it links to. Each lit card's tag says why ("RANG, BUT NOBODY PULLED IT"). Cyan marks a link, red a **contradiction**, gold a **revelation**. The panel at the bottom repeats the links in words.
- **Deductions** are red question cards. Click one, or the story opens it for you. The question then sits in a banner across the top. Clicking a clue only **reads** it; the **PRESENT THIS CLUE** button submits it, so nothing is guessed by accident. A wrong answer explains why it doesn't fit and costs nothing. After two wrong answers the banner shows a hint. At three story beats the board opens on the question and waits:
  1. **What does the key open?** → the lock on the well. This sends you underground.
  2. **Did time stop at 2:17?** → Luke's 2:31 watch, or the watchman's log. This is the contradiction.
  3. **Who is the figure?** → the burned photo's fourth face. The THE FIGURE card flips to ELIAS. The player makes the twist.

Edit nodes, links and answers in the `NODES`, `LINKS` and `DEDUCTIONS` tables.

## The throughline
One idea ties every beat together: **Nia rings the bell, and every year her brother comes home and chooses whether to remember her.**

| Planted in Episode 1 | Paid off |
|---|---|
| A letter in a child's hand: COME HOME, ELI | The drawing in the schoolhouse is in the same hand (Ep 1). Nia: "I don't mind writing the letter." (Finale) |
| The bell rings, but the rope is thick with dust | Nia rings it (Finale) |
| A wooden toy horse rolls to his boot | Nia: "You found my horse." He keeps it in the good ending |
| Hanna: "Don't trust the first memory you see. Not even your own." | Elias erased his own memory (Ep 6) |
| Hanna: "You always come back to this house." (Ep 4) | The forget ending is a loop, and the letter is worn from rereading |
| Ivy: "You have the look of a boy I used to teach." (Ep 2) | Elias was Veyra's apprentice |
| Luke: "Someone helped me push the last boat." (Ep 3) | The push QTE, and the figure carrying Nia in her blanket |
| The blanket folded beside the plinth (Ep 5) | He carried her there himself (Ep 6) |

### Timeline of the night
| Time | What happens | Where the player sees it |
|---|---|---|
| ~2:05 | Elias carries Nia, wrapped in a blanket, toward the well | Luke's memory (if you watch the bank) |
| 2:17 | The lantern wakes under the well. The bell tolls and every clock stops | Ivy's memory, Luke's memory, Ep 6 |
| 2:17–2:31 | The night runs on for fourteen minutes: the river turns, Luke loads the boats, Hanna follows the sound to the well (2:20) | Luke's and Hanna's memories, the watchman's log |
| 2:31 | The light takes the village. Elias cuts his hand on the cage, locks the well and drops the key in the square | Luke's watch, Ep 6 |
| Ten years later | Found on a road with no memory and the lantern, Elias works as a ghost hunter. Every year Nia rings the bell and writes the letter | Opening, finale |
| 2:18 | In the good ending the clock finally moves on | Finale |

What happened that night, stated plainly in Episode 6: Elias tried to draw Nia's fever out with the Echo Lantern. Instead, the lantern drew in the whole village. Ivy, Luke and Hanna were caught at the edge of the light, half here. He then rewrote their memories and the records, and finally his own.

## Writing style
- Headings, buttons, banners and QTE prompts are in CAPS. Everything else is sentence case with full punctuation.
- One name per character. Name cards use a short role in sentence case ("The boatman").
- Use no "·" separators or em-dash asides in player-facing text; write them as full sentences instead.
- Objectives are imperative sentences ending in a full stop ("Go to the river dock.").

## Episodes (`src/world/script.ts`)
1. **Enter Veyra:** arrival, the bell, the toy, the figure in the window; free investigation (footprints → key, bell rope at the top of the tower, the woman in the doorway, records and photo; optional well and schoolhouse) → deduction 1.
2. **Ivy:** the schoolteacher; timed choice; timing QTE; her memory (crowd runs to the square; choose where to look).
3. **Luke:** the boatman; mash QTE; choose whom to watch; 2:31 vs 2:17 → deduction 2.
4. **Hanna:** identified; her memory leads to the well; press QTE; unlock the well; **dig through the rubble**.
5. **Under Veyra:** the vault records (memory alteration), the collapse QTE, the deepest chamber.
6. **The true memory:** deduction 3 (who is the figure), young Elias, Nia's fever, the lantern takes the village, and every memory is rewritten.
7. **Finale:** the bell rings once more and Nia appears. Then remember (2:17 → 2:18; each ghost says goodbye; dawn; Nia last) or forget (the loop restarts with a worn letter).

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
- Ivy, Luke and Hanna have no walk animation (they're ghosts, so they float). Nia uses the villager woman sprite scaled to child height, tinted as a ghost, with a three-pixel white flower in her hair. Her dialogue portrait (`pt_nia`) is drawn in code in the same crimson dress and bonnet; a hand-drawn `nia.png` like the other portraits would match them better.
- Rubble at the well is the only place digging is required; you can dig other dirt underground freely.
- Text speed and skip-scene settings are not built yet.
- Memories: the camera drifts after whoever is moving (`d.watch(npc)`), and `await d.follow()` eases back to Elias rather than snapping. Bells are shown as expanding rings (`d.toll`), never sound words.
- Saves are written at the end of each episode, so CONTINUE restarts the episode you were on, with all evidence kept. A finished story offers PLAY AGAIN.
- Every start of the Story scene passes explicit data (`{ fresh, episode }`): Phaser reuses a scene's last start data when given none.
