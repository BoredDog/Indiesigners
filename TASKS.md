# TASKS — live tracker

**Deadline Tue 6 Oct 16:00 IST · submit by 15:00 · feature freeze 12:00.** Design and schedule live in [PLAN.md](PLAN.md); team chat is the pinned **Team HQ** issue.

Status: `todo` · `doing` · `review` (PR open) · `done` · `blocked` (say why in Team HQ).
To pick up a task, set it to `doing`. Devs and Bhumi update this file in their PR; Arya just comments in Team HQ and Garv updates it.

**Art (all B*/A* art tasks, G9) is scheduled for tonight. Bhumi now has Claude Code (B0, B7–B9); everything else is being finished today (Garv, 5 Oct).**

**Scoring we're optimising for:** gameplay & mechanics 30 · theme 20 · technical stability 20 · audio-visual cohesion 20 · Hour 12 compliance 10.

## Milestones
| ID | Milestone | Done when | Due | Status |
|---|---|---|---|---|
| M0 | Team setup | Repo protected, CI + Pages live, Team HQ pinned, comic layer merged | Mon 10:00 | done |
| M1 | Mira vertical slice | On the Pages link: talk to Mira → memory page → 2 puzzles → 3 deductions → back to village | Mon 19:00 | done (5 Oct early; with real puzzles) |
| M2 | Content complete | Game playable start → credits on the Pages link; autoplay test passes for all 6 witness orders | Tue 02:30 | done: playable start → credits on Pages; 6/6 orders reach the summary (N8, #27) |
| M3 | Feature freeze | Final art in, playtested by 2 outsiders, only bug fixes after this | Tue 12:00 | todo |
| M4 | Submitted | itch.io page plays in a fresh browser; form + Discord done | Tue 15:00 | todo |

## Garv — lead, comic UI, build & release
| ID | Task | Done when | Due | Status |
|---|---|---|---|---|
| G1 | Project setup (Vite + TS + Phaser 3.90) | `npm run dev` / `npm run build` work | Mon 10:00 | done |
| G2 | Comic layer `src/comic/` (pages, panels, shader, SFX words, bubbles, markup, transitions) | Demo scene renders with no console errors; screenshots checked | Mon 10:00 | done |
| G3 | Art pipeline `npm run art` | Raw upload → trimmed WebP + `manifest.json` | Mon 10:00 | done |
| G4 | CI build check + GitHub Pages deploy | Every PR shows a green build; `main` auto-deploys to the Pages link | Mon 10:00 | done |
| G5 | Protect `main`, labels, pinned Team HQ issue | PR-only merges enforced; Team HQ pinned with the play link | Mon 10:00 | done |
| G6 | `MemoryPage` scene (zoom/dim, 5 fragments, Evidence 0/5, puzzle launch, RECONSTRUCT / LEAVE MEMORY) | Mira page playable from data | Mon 16:00 | done |
| G7 | Casebook (columns, timeline, FIGURE/NIA cards, CORROBORATES / CONTRADICTS / REVEALS threads, Figure flip) | Opens from anywhere; threads appear when both clues are known | Mon 23:00 | done |
| G8 | Opening (6 frames) + Finale (8 frames) + Truth ending + Summary/Credits | Plays start to end from data; silhouette dissolves into young Elias | Tue 02:30 | done |
| G9 | Import final background/prop art; style pass (crops, halftone, transitions, title idle). Characters/key art: Bhumi imports her own (B7/B8) | No placeholder art left | Tue 12:00 | tonight (art session) |
| G10 | README, LICENSE, CREDITS.md final, AI disclosure | Matches PLAN.md §10 | Tue 13:00 | done (README, LICENSE, CREDITS, AI disclosure); final pass with art credits |
| G11 | itch.io upload + fresh-browser test + submit | Plays on Chrome/Firefox/Edge from itch | Tue 15:00 | todo (after art) |
| G12 | Review, play-test and merge every PR | Each PR merged within ~1 h of opening, or feedback given | ongoing | doing |
| G13 | Ending: the clock moves 2:17 → 2:18 for **every** player, with "The village didn't forget what happened. I did." (from Vansh's final script); the 100% epilogue keeps the signed master log | Plays in every ending; `shots-sequence` checks the hand reaches 2:18 | Tue 01:00 | review (#46) |

## Nav — gameplay core  *(N6–N9 reassigned to Vansh, 5 Oct)*
| ID | Task | Done when | Due | Status |
|---|---|---|---|---|
| N1 | `GameState` + `SaveManager` (localStorage autosave, Continue/New Game) | Close tab → Continue restores evidence, deductions and witness states | Mon 13:00 | done |
| N2 | Extract blueprint text into `content/*.json` (exact IDs sis_1…mom_3) + `design/script_review.html` | Every on-screen line from Blueprint D, F–M is in JSON; review page readable | Mon 15:00 | done |
| N3 | `StoryData` loader + `DeductionController` | Unit test: right cards + conclusion confirms; wrong set returns "does not support" | Mon 15:00 | done |
| N4 | Boot → Title → Village hub (hotspots, hover status, NEW EVIDENCE shimmer) | Title Continue/New Game work; witnesses clickable | Mon 17:00 | done |
| N5 | Conversation scene (evidence-gated questions, ENTER MEMORY) + Deduction screen + Aftermath page | Mira loop works end to end with G6 | Mon 19:00 | done |
| N6 | Arun + Leela wiring, all 9 deductions + 6 threads, THE RECORD unlock, witness resolution beats | All 9 confirmable; archive opens at 9/9 | Tue 01:00 | done (Vansh, #28) |
| N7 | Pause/Settings (text size, Reduce Motion, fullscreen) → writes `comicSettings` | Settings persist in the save | Tue 01:00 | done (Vansh, #29) |
| N8 | Autoplay test (Playwright, all 6 witness orders to the credits) | `npm run test:autoplay` passes | Tue 02:30 | done (Vansh, #27) |
| N9 | Core bug fixes, cross-browser check | No open `bug` issues in core | Tue 12:00 | done (Vansh, #30): Chromium, Firefox, Edge, Brave reach the summary |
| N10 | Menu/settings extras (script_final): New Game confirmation "Start a new investigation? YES · NO" (when a save exists), "NO SAVED INVESTIGATION", TEXT SPEED, SCREEN SHAKE on/off (gates `impact()`), toasts MEMORY ECHO DETECTED / SAVE COMPLETE | In TitleScene/PauseScene/GameState settings; checks in check-core/smoke; `npm test` exit 0 | Tue 02:00 | todo → **Nav** (Team HQ 23:52) |

## Vansh — puzzles
| ID | Task | Done when | Due | Status |
|---|---|---|---|---|
| V1 | Puzzle JSON schema + pure-TS rules engine (move, light/ink, dial, lever/gate) + unit tests | Tests pass | Mon 13:00 | done |
| V2 | BFS solver `tools/solve-puzzles.ts` (CI fails on an unsolvable level) | Reports par + hint path per level | Mon 13:00 | done |
| V3 | Puzzle scene over panel art (wisp, ink shadows, rotation, undo/reset/hint/skip, win → evidence id) | `pz_tower` playable in the browser | Mon 16:00 | done |
| V4 | Levels `pz_tower`, `pz_sis_1`, `pz_sis_3` | Solver passes, playable from Mira's page | Mon 19:00 | done |
| V5 | Sluice/water, crate, sentinels, nodes, collapsing floor | Each mechanic has a unit test | Mon 23:00 | done |
| V6 | Levels `pz_bro_2`, `pz_bro_3`, `pz_mom_1`, `pz_mom_3`, `pz_archive` + Archive scene | Solver passes; archive escape leads to finale | Tue 02:30 | done |
| V7 | Difficulty tuning from playtests; stretch levels `pz_sis_2`, `pz_bro_1`, `pz_mom_2` if time | Testers finish every puzzle without skip | Tue 12:00 | done |
| V8 | Teach each mechanic in its first puzzle (one-time captions) | First-time player never needs HINT on a witness's first puzzle | Mon 06:15 | done |
| V9 | Feel: hover preview, wisp trail, ink splat on slip, catch shake (all off under Reduce Motion/Flashing) | Visible in shots-puzzle | Mon 07:15 | done |
| V10 | Readable without colour: group shape marks on ropes/gates/sluices/nodes | Greyscale screenshot of every board readable | Mon 08:00 | done |
| V11 | Archive escape polish: crumbling tiles, rumble, Elias lines | Archive → Finale smooth | Mon 09:00 | done |
| V14 | **Difficulty pass: medium levels, no redundant pieces.** Keep `pz_tower` and each `*_1` as teaching levels; rework `*_2`, `*_3` and `pz_archive` so each needs 2+ mechanics working together and has one "aha" (crate shadow as cover, dial order, timing a sentinel, a lever that also closes your way back). **Light rules stay exactly as they are.** References: Lara Croft GO / Hitman GO (turn-based patrols, lever sequencing), Felix the Reaper (shadow-walking, rotating the light), Sokoban / Stephen's Sausage Roll (no wasted tiles; pushes that can trap you). Levels stay in the shared `content/puzzles/*.json`, so the Phaser build gets them too | Every piece is needed (V15 passes); `*_2`/`*_3` par 16–30 with dead ends; a fresh tester finishes each with ≤1 HINT | Tue 10:00 | review (Vansh, #40) |
| V15 | **Redundancy + difficulty check** in `test:puzzles` (TS) and the GDScript solver: remove each piece (crate, dial, lever/sluice/node, gate, water, collapse tile, sentinel); if the level still solves with the same optimal moves, that piece is unused → fail. Print par, states explored, dead ends per level | Fails on today's levels (9 of 11 have unused pieces: sentinels in `pz_mom_1/2/3`, `pz_archive`; crate in `pz_bro_1`; dial in `pz_sis_3`; lever etc. in `pz_sis_2`); passes after V14 | Tue 06:00 | done (Vansh, #37) |
| V16 | **Godot 3D puzzle board** (on Vansh's laptop): diorama board, orthographic/isometric camera like Lara Croft GO; pillars/crates cast the *same* grid shadows the rules compute (light from the level's side, dial rotates it); wisp + sentinels as simple low-poly pieces. Same V12 rules engine, same V13 contract (Router data in, `justFound` out). The rest of the Godot game stays 2D | Every level playable in 3D in Godot; `test:godot` passes | Tue 12:00 | done (Vansh, #39) |
| V17 | **Unknown woman** (script_final §4): one-time village beat on the first visit: abandoned room, *"Whatever you find here, don't trust the first memory you see."*, she vanishes, the chair rocks (Creeeak…), narration *"I didn't know who she was. / But I remembered what she said."* In v2 she is Leela, never named here | Plays once; tested in autoplay/smoke | Tue 06:00 | doing (Vansh, `feat/unknown-woman-photo`) |
| V18 | **Burned photograph**: village hotspot clue showing Mira, Arun, Leela + a fourth lantern-carrier with the face scratched out → Casebook as IDENTITY UNKNOWN; in the Finale reveal the face becomes the investigator's (young Elias) | Clue pinned; finale swap visible; tests | Tue 06:00 | doing (Vansh, same branch) |
| V19 | **Phaser "3D" puzzle view (option)**: isometric 2.5D board in Phaser (extruded tiles, pillar/crate blocks, ink shadows from `Rules`, lantern on the light side); same rules + Puzzle contract; PUZZLE VIEW 2D/3D in Pause/Settings, **default 2D**, saved | `shots-puzzle` plays every level in both views; `npm test` exit 0; merged only if solid by ~10:00, else post-jam | Tue 10:00 | todo (Vansh, after V17/V18) |

### Art reference for tonight: *The Coffin of Andy and Leyley* (inspiration only, never copy)
Applies to every B and A task below. Take from it:
- **Palette:** a muted, desaturated, grimy base (browns, olive, sickly green, dried-blood red). Keep our two accents on top of it: amber lamplight and spirit teal.
- **Line and shading:** thick dark outlines, flat cel shading, hard-edged shadows, very few gradients.
- **Characters:**
  - expressive, slightly exaggerated faces with big readable eyes
  - one strong reaction expression per witness (the "+1" in B3/B4)
  - bust-portrait framing that reads at conversation size
- **Places:** dirty, lived-in rooms with stains, clutter and peeling walls. The tone is dark comedy-horror; it should be unsettling, not gory.
- **Do not reuse** their characters, designs or assets.

**Starting point (5 Oct):** Claude Code drew vector drafts in this style and they're in the game now. They are in `art/incoming/claude/`, with SVG sources in `art-src/claude/`, generated by `tools/draft-art.ts`.
- **Files:**
  - `bg_village`: the A2 base, same layout as the placeholder, with CC0 grime blended in
  - `char_mira`, `char_arun`, `char_leela`: the B3/B4 base
  - `char_figure`, `char_elias_young`: the B2 base
  - `char_nia`: the B4 base
- **How to use them:** paint over them or redraw them, keeping the same canvas size. Then upload under **the same file name** to your own folder; your file replaces the draft automatically.
- **Canvas sizes:**
  - village 1920×1080, with the clock at (910, 300) showing 2:17
  - witnesses 240×560, with feet at the bottom edge
  - Figure / young Elias 300×640, sharing the exact same outline
  - Nia 160×340

## Bhumi — character & key art, with Claude Code from 5 Oct (branch `feat/art-bhumi`)
Bhumi now has Claude Code, so she handles the technical side of her art: importing, crops, checking it in the game, and her own PRs. She no longer waits on Garv's Claude for any of this. **The drawing is still hers** (Krita/Photopea, `.kra` sources). Her Claude does not draw or redraw characters; it handles files, code and checks. Starter prompt: PLAN.md §9.
| ID | Task | Done when | Due | Status |
|---|---|---|---|---|
| B0 | Setup: Git, Node, Claude Code, clone, `npm install`, `npx playwright install chromium`, branch `feat/art-bhumi` (PLAN.md §11) | `npm run dev` shows the game locally | Mon 21:00 | todo |
| B1 | Style sample: Elias silhouette (back + full outline) + rough Mira | All 5 approve in Team HQ → style locked | Mon 12:00 | tonight (art session) |
| B2 | Elias final: back-view cutout, hands + lantern staff, solid silhouette, young Elias profile | In the game on her PR. Her Claude checks that `char_figure` and `char_elias_young` have the same outline (alpha-mask diff) | Mon 19:00 | tonight (art session) |
| B3 | Mira neutral + 1 expression | In the game on her PR; conversation + memory screenshots checked | Mon 19:00 | tonight (art session) |
| B4 | Arun neutral + 1, Leela neutral + 1, Nia | In the game on her PR; screenshots checked | Tue 01:00 | tonight (art session) |
| B5 | Finale reveal panel (young Elias at the console) | In the Finale on her PR | Tue 02:30 | tonight (art session) |
| B6 | Title cover, 2 ending panels, fixes; `.kra` sources | In Title/Ending on her PR; `.kra` files in `art-src/` | Tue 12:00 | tonight (art session) |
| B7 | **Import her own art (takes the character half of G9 from Garv).** Save to `art/incoming/bhumi/` under the draft's file name and canvas size → `npm run art` → check with `tsx tools/shots-conversation.ts`, `shots-memory.ts`, `shots-sequence.ts` → PR | No character drafts from `art/incoming/claude/` left in the game; `npm run build` passes | Tue 12:00 | todo |
| B8 | **Wire the art that has no slot yet:** the reaction expressions (`char_<witness>_react`, shown on the Conversation reaction beat), title cover, finale reveal panel, ending panels. Her Claude adds the keys to `BootScene.ART_REPLACES` / the scenes. OK to touch Title/Finale/Ending (Garv's) and Conversation (ask Vansh first in Team HQ) | Each piece shows in the game; `npm test` passes (check the exit code, not the tail) | Tue 11:00 | todo (after B3) |
| B9 | Log her Claude use in the AI disclosure in `CREDITS.md` (what it did: import, wiring, checks; not drawing) | Line added on her PR | Tue 12:00 | todo |
| B10 | Art for the new beats: abandoned room with rocking chair + woman silhouette (bg + cutout); burned photo in **two states** (face scratched / face = young Elias). `char_*`/`bg_*` naming | In the game via the art pipeline | Tue 09:00 | todo (after character art) |
| B11 | **Backgrounds for the scenes both scripts share** (moved from Arya's A2/A3/A5/A7, Garv 6 Oct), as paint-overs of Claude vector drafts: clock tower at 2:17 / village (`bg_village`), Mira's school + bell tower at night (`bg_mira`), Arun's river + boats (`bg_arun`), Leela's underground lantern chamber (`bg_leela`), the archive (`bg_archive`) | Same file names and canvas sizes as the drafts; the panel crops still frame the right content | Tue 11:00 | todo |

**Bhumi's priority tonight** (the scenes both v2 and script_final share, Garv 6 Oct): **1** Figure + young Elias on one outline (B2) → **2** the three witnesses (B3/B4) → **3** Nia (B4) → **4** rocking-chair room + burned photo, 2 states (B10) → **5** finale reveal panel (B5) → **6** backgrounds (B11) → **7** title cover + ending panels if time is left (B6).
**Draft support:** Garv's second Claude session builds vector drafts (Andy & Leyley direction) on `feat/art-drafts-2`, with a PR by about 04:30: `bg_mira`, `bg_arun`, `bg_leela`, `bg_archive`, props (watch at 2:31, bell rope, "E.V." lantern case) and the room + photo bases. Bhumi paints over them; her file in `art/incoming/bhumi/` with the same name replaces the draft automatically.

## Arya — environment art, assets, QA (upload to `art/incoming/arya/`)
| ID | Task | Done when | Due | Status |
|---|---|---|---|---|
| A1 | License-check fonts / ambientCG / Kenney / Outlander and log each in `CREDITS.md` | Every downloaded asset has a row with its source URL + license | Mon 13:00 | todo |
| A2 | Village hub background (ink-noir paint-over, clock at 2:17) | Uploaded as `bg_village.*` | Mon 19:00 | moved to Bhumi (B11) |
| A3 | Mira page background (classroom + clock tower interior) | Uploaded as `bg_mira.*` | Mon 19:00 | moved to Bhumi (B11) |
| A4 | Props: pocket watch 2:31, bell rope, silver hairclip, lantern case "E.V." | Uploaded as transparent PNGs | Tue 01:00 | tonight (art session) |
| A5 | Arun + Leela page backgrounds | Uploaded as `bg_arun.*`, `bg_leela.*` | Tue 01:00 | moved to Bhumi (B11) |
| A6 | Proofread `design/script_review.html`; play-test M1 | Findings filed as `text` / `bug` issues | Tue 01:00 | todo |
| A7 | Hidden Archive background | Uploaded as `bg_archive.*` | Tue 10:00 | moved to Bhumi (B11) |
| A8 | 2 external playtesters (Blueprint T1 log) | Log posted in Team HQ | Tue 11:30 | todo |
| A9 | itch.io page text: description, controls, content warning, AI disclosure | Text posted in Team HQ | Tue 12:00 | todo |

## Godot track (side project; the Phaser build stays the jam prototype) · **frozen until after the jam (Garv, 6 Oct)**
Port in `godot/` (see `godot/README.md`). Shared data in `content/`; `npm run test:godot` must pass.
| ID | Owner | Task | Done when | Status |
|---|---|---|---|---|
| GD1 | Garv | Project skeleton, content sync, StoryData / GameState / Deductions ports + headless tests | `npm run test:godot` passes (6 orders → 9/9, save round trip) | done |
| GD2 | Garv | Comic layer in Godot: panel crops, grey→colour/halftone/ink shader, SFX word, bubbles with markup | Demo scene matches the Phaser comic demo | done |
| GD3 | Garv | Memory page scene from `content/pages/*.json` | Mira page playable in Godot | done |
| GD4 | Garv | Title, Village, Conversation, Deduction, Aftermath | Mira loop playable start to finish | done |
| GD5 | Garv | Casebook | Threads + notes from GameState | done |
| GD6 | Garv | Opening, Finale, Ending | Game completable in Godot | done (#26) |
| V12 | Vansh | Puzzle rules engine + solver in GDScript | 11 levels solve at the TS par in a headless test | done |
| V13 | Vansh | Godot Puzzle scene (+ Archive) | Every level playable; returns `justFound` | done |
| GD7 | Garv | Web export + autoplay test in Godot | Exported build plays in a browser | todo |
