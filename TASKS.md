# TASKS — live tracker

**Deadline Tue 6 Oct 16:00 IST · submit by 15:00 · feature freeze 12:00.** Design and schedule live in [PLAN.md](PLAN.md); team chat is the pinned **Team HQ** issue.

Status: `todo` · `doing` · `review` (PR open) · `done` · `blocked` (say why in Team HQ).
To pick up a task, set it to `doing`. Devs update this file in their PR; Bhumi/Arya just comment in Team HQ and Garv updates it.

**Scoring we're optimising for:** gameplay & mechanics 30 · theme 20 · technical stability 20 · audio-visual cohesion 20 · Hour 12 compliance 10.

## Milestones
| ID | Milestone | Done when | Due | Status |
|---|---|---|---|---|
| M0 | Team setup | Repo protected, CI + Pages live, Team HQ pinned, comic layer merged | Mon 10:00 | done |
| M1 | Mira vertical slice | On the Pages link: talk to Mira → memory page → 2 puzzles → 3 deductions → back to village | Mon 19:00 | todo |
| M2 | Content complete | Game playable start → credits on the Pages link; autoplay test passes for all 6 witness orders | Tue 02:30 | todo |
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
| G9 | Import all final art; style pass (crops, halftone, transitions, title idle) | No placeholder art left | Tue 12:00 | todo |
| G10 | README, LICENSE, CREDITS.md final, AI disclosure | Matches PLAN.md §10 | Tue 13:00 | todo |
| G11 | itch.io upload + fresh-browser test + submit | Plays on Chrome/Firefox/Edge from itch | Tue 15:00 | todo |
| G12 | Review, play-test and merge every PR | Each PR merged within ~1 h of opening, or feedback given | ongoing | doing |

## Nav — gameplay core
| ID | Task | Done when | Due | Status |
|---|---|---|---|---|
| N1 | `GameState` + `SaveManager` (localStorage autosave, Continue/New Game) | Close tab → Continue restores evidence, deductions and witness states | Mon 13:00 | done |
| N2 | Extract blueprint text into `content/*.json` (exact IDs sis_1…mom_3) + `design/script_review.html` | Every on-screen line from Blueprint D, F–M is in JSON; review page readable | Mon 15:00 | done |
| N3 | `StoryData` loader + `DeductionController` | Unit test: right cards + conclusion confirms; wrong set returns "does not support" | Mon 15:00 | done |
| N4 | Boot → Title → Village hub (hotspots, hover status, NEW EVIDENCE shimmer) | Title Continue/New Game work; witnesses clickable | Mon 17:00 | done |
| N5 | Conversation scene (evidence-gated questions, ENTER MEMORY) + Deduction screen + Aftermath page | Mira loop works end to end with G6 | Mon 19:00 | done |
| N6 | Arun + Leela wiring, all 9 deductions + 6 threads, THE RECORD unlock, witness resolution beats | All 9 confirmable; archive opens at 9/9 | Tue 01:00 | todo |
| N7 | Pause/Settings (text size, Reduce Motion, fullscreen) → writes `comicSettings` | Settings persist in the save | Tue 01:00 | todo |
| N8 | Autoplay test (Playwright, all 6 witness orders to the credits) | `npm run test:autoplay` passes | Tue 02:30 | todo |
| N9 | Core bug fixes, cross-browser check | No open `bug` issues in core | Tue 12:00 | todo |

## Vansh — puzzles
| ID | Task | Done when | Due | Status |
|---|---|---|---|---|
| V1 | Puzzle JSON schema + pure-TS rules engine (move, light/ink, dial, lever/gate) + unit tests | Tests pass | Mon 13:00 | todo |
| V2 | BFS solver `tools/solve-puzzles.ts` (CI fails on an unsolvable level) | Reports par + hint path per level | Mon 13:00 | todo |
| V3 | Puzzle scene over panel art (wisp, ink shadows, rotation, undo/reset/hint/skip, win → evidence id) | `pz_tower` playable in the browser | Mon 16:00 | todo |
| V4 | Levels `pz_tower`, `pz_sis_1`, `pz_sis_3` | Solver passes, playable from Mira's page | Mon 19:00 | todo |
| V5 | Sluice/water, crate, sentinels, nodes, collapsing floor | Each mechanic has a unit test | Mon 23:00 | todo |
| V6 | Levels `pz_bro_2`, `pz_bro_3`, `pz_mom_1`, `pz_mom_3`, `pz_archive` + Archive scene | Solver passes; archive escape leads to finale | Tue 02:30 | todo |
| V7 | Difficulty tuning from playtests; stretch levels `pz_sis_2`, `pz_bro_1`, `pz_mom_2` if time | Testers finish every puzzle without skip | Tue 12:00 | todo |

## Bhumi — character & key art (upload to `art/incoming/bhumi/`)
| ID | Task | Done when | Due | Status |
|---|---|---|---|---|
| B1 | Style sample: Elias silhouette (back + full outline) + rough Mira | All 5 approve in Team HQ → style locked | Mon 12:00 | todo |
| B2 | Elias final: back-view cutout, hands + lantern staff, solid silhouette, young Elias profile | Uploaded as transparent PNG | Mon 19:00 | todo |
| B3 | Mira neutral + 1 expression | Uploaded | Mon 19:00 | todo |
| B4 | Arun neutral + 1, Leela neutral + 1, Nia | Uploaded | Tue 01:00 | todo |
| B5 | Finale reveal panel (young Elias at the console) | Uploaded | Tue 02:30 | todo |
| B6 | Title cover, 2 ending panels, fixes; `.kra` sources | Uploaded | Tue 12:00 | todo |

## Arya — environment art, assets, QA (upload to `art/incoming/arya/`)
| ID | Task | Done when | Due | Status |
|---|---|---|---|---|
| A1 | License-check fonts / ambientCG / Kenney / Outlander and log each in `CREDITS.md` | Every downloaded asset has a row with its source URL + license | Mon 13:00 | todo |
| A2 | Village hub background (ink-noir paint-over, clock at 2:17) | Uploaded as `bg_village.*` | Mon 19:00 | todo |
| A3 | Mira page background (classroom + clock tower interior) | Uploaded as `bg_mira.*` | Mon 19:00 | todo |
| A4 | Props: pocket watch 2:31, bell rope, silver hairclip, lantern case "E.V." | Uploaded as transparent PNGs | Tue 01:00 | todo |
| A5 | Arun + Leela page backgrounds | Uploaded as `bg_arun.*`, `bg_leela.*` | Tue 01:00 | todo |
| A6 | Proofread `design/script_review.html`; play-test M1 | Findings filed as `text` / `bug` issues | Tue 01:00 | todo |
| A7 | Hidden Archive background | Uploaded as `bg_archive.*` | Tue 10:00 | todo |
| A8 | 2 external playtesters (Blueprint T1 log) | Log posted in Team HQ | Tue 11:30 | todo |
| A9 | itch.io page text: description, controls, content warning, AI disclosure | Text posted in Team HQ | Tue 12:00 | todo |
