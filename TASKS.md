# TASKS — live tracker

**Deadline Tue 6 Oct 16:00 IST · submit by 15:00 · feature freeze 12:00.** Design and schedule live in [PLAN.md](PLAN.md); team chat is the pinned **Team HQ** issue.

Status: `todo` · `doing` · `review` (PR open) · `done` · `blocked` (say why in Team HQ).
To pick up a task, set it to `doing`. Devs update this file in their PR; Bhumi/Arya just comment in Team HQ and Garv updates it.

**Art (all B*/A* art tasks, G9) is scheduled for tonight; everything else is being finished today (Garv, 5 Oct).**

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
| G9 | Import all final art; style pass (crops, halftone, transitions, title idle) | No placeholder art left | Tue 12:00 | tonight (art session) |
| G10 | README, LICENSE, CREDITS.md final, AI disclosure | Matches PLAN.md §10 | Tue 13:00 | done (README, LICENSE, CREDITS, AI disclosure); final pass with art credits |
| G11 | itch.io upload + fresh-browser test + submit | Plays on Chrome/Firefox/Edge from itch | Tue 15:00 | todo (after art) |
| G12 | Review, play-test and merge every PR | Each PR merged within ~1 h of opening, or feedback given | ongoing | doing |

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
| V14 | **Difficulty pass: medium levels, no redundant pieces.** Keep `pz_tower` and each `*_1` as teaching levels; rework `*_2`, `*_3` and `pz_archive` so each needs 2+ mechanics working together and has one "aha" (crate shadow as cover, dial order, timing a sentinel, a lever that also closes your way back). **Light rules stay exactly as they are.** References: Lara Croft GO / Hitman GO (turn-based patrols, lever sequencing), Felix the Reaper (shadow-walking, rotating the light), Sokoban / Stephen's Sausage Roll (no wasted tiles; pushes that can trap you). Levels stay in the shared `content/puzzles/*.json`, so the Phaser build gets them too | Every piece is needed (V15 passes); `*_2`/`*_3` par 16–30 with dead ends; a fresh tester finishes each with ≤1 HINT | Tue 10:00 | todo (Vansh) |
| V15 | **Redundancy + difficulty check** in `test:puzzles` (TS) and the GDScript solver: remove each piece (crate, dial, lever/sluice/node, gate, water, collapse tile, sentinel); if the level still solves with the same optimal moves, that piece is unused → fail. Print par, states explored, dead ends per level | Fails on today's levels (9 of 11 have unused pieces: sentinels in `pz_mom_1/2/3`, `pz_archive`; crate in `pz_bro_1`; dial in `pz_sis_3`; lever etc. in `pz_sis_2`); passes after V14 | Tue 06:00 | todo (Vansh) |
| V16 | **Godot 3D puzzle board** (on Vansh's laptop): diorama board, orthographic/isometric camera like Lara Croft GO; pillars/crates cast the *same* grid shadows the rules compute (light from the level's side, dial rotates it); wisp + sentinels as simple low-poly pieces. Same V12 rules engine, same V13 contract (Router data in, `justFound` out). The rest of the Godot game stays 2D | Every level playable in 3D in Godot; `test:godot` passes | Tue 12:00 | todo (Vansh) |

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

## Bhumi — character & key art (upload to `art/incoming/bhumi/`)
| ID | Task | Done when | Due | Status |
|---|---|---|---|---|
| B1 | Style sample: Elias silhouette (back + full outline) + rough Mira | All 5 approve in Team HQ → style locked | Mon 12:00 | tonight (art session) |
| B2 | Elias final: back-view cutout, hands + lantern staff, solid silhouette, young Elias profile | Uploaded as transparent PNG | Mon 19:00 | tonight (art session) |
| B3 | Mira neutral + 1 expression | Uploaded | Mon 19:00 | tonight (art session) |
| B4 | Arun neutral + 1, Leela neutral + 1, Nia | Uploaded | Tue 01:00 | tonight (art session) |
| B5 | Finale reveal panel (young Elias at the console) | Uploaded | Tue 02:30 | tonight (art session) |
| B6 | Title cover, 2 ending panels, fixes; `.kra` sources | Uploaded | Tue 12:00 | tonight (art session) |

## Arya — environment art, assets, QA (upload to `art/incoming/arya/`)
| ID | Task | Done when | Due | Status |
|---|---|---|---|---|
| A1 | License-check fonts / ambientCG / Kenney / Outlander and log each in `CREDITS.md` | Every downloaded asset has a row with its source URL + license | Mon 13:00 | todo |
| A2 | Village hub background (ink-noir paint-over, clock at 2:17) | Uploaded as `bg_village.*` | Mon 19:00 | tonight (art session) |
| A3 | Mira page background (classroom + clock tower interior) | Uploaded as `bg_mira.*` | Mon 19:00 | tonight (art session) |
| A4 | Props: pocket watch 2:31, bell rope, silver hairclip, lantern case "E.V." | Uploaded as transparent PNGs | Tue 01:00 | tonight (art session) |
| A5 | Arun + Leela page backgrounds | Uploaded as `bg_arun.*`, `bg_leela.*` | Tue 01:00 | tonight (art session) |
| A6 | Proofread `design/script_review.html`; play-test M1 | Findings filed as `text` / `bug` issues | Tue 01:00 | todo |
| A7 | Hidden Archive background | Uploaded as `bg_archive.*` | Tue 10:00 | tonight (art session) |
| A8 | 2 external playtesters (Blueprint T1 log) | Log posted in Team HQ | Tue 11:30 | todo |
| A9 | itch.io page text: description, controls, content warning, AI disclosure | Text posted in Team HQ | Tue 12:00 | todo |

## Godot track (side project; the Phaser build stays the jam prototype)
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
