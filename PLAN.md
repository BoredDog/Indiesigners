# Echoes of Sorrow — 30-Hour Build Plan

> Design + schedule. **Live task tracker: [TASKS.md](TASKS.md).** Team chat: the pinned **Team HQ** issue.

**Team Indiesigners · TGC GameJam 2026 (Comic · Twist · Light)**
**Deadline: Tue 6 Oct 2026, 16:00 IST** · Plan runs Mon 5 Oct 10:00 → Tue 6 Oct 16:00 (30 hours)
Source of truth for story/text: `Echoes_of_Sorrow_Investigation_Thriller_Blueprint.pdf` (the investigation-thriller revision — **no Light/Dark moral choice**). `proposal.pdf` is the original pitch.

---

## 0. TL;DR

| Decision | Answer |
|---|---|
| **Engine** | **Phaser 3 + TypeScript + Vite** (browser build → itch.io HTML5 zip) |
| **Dimension** | 2D now. All story/puzzle data is engine-agnostic JSON, so a 3D port later only replaces rendering. |
| **Core new mechanic** | **Echo Paths**: memory fragments are retrieved through turn-based grid puzzles (Lara Croft GO movement + Felix the Reaper light/shadow rotation). |
| **Who codes** | Nav, Vansh, Garv (Claude Code) |
| **Who makes art/content** | Bhumi (characters + key panels), Arya (backgrounds, props, licenses, QA, itch page) |
| **Must ship** | Title → Opening → Village → 3 witnesses (talk → memory page + puzzles → deduction) → Hidden Archive → Finale reveal → Ending → Credits, with save/continue. |
| **Not now (cut for 30 h)** | Soundtrack/SFX audio, 3D, investigation-location side scenes, hidden epilogue, 3 of the 11 puzzles (stretch only), settings beyond text size / Reduce Motion / fullscreen |

### Judging criteria (how we're scored)
| Criterion | Weight | What it means for us |
|---|---|---|
| Gameplay & mechanics | **30** | Echo Paths puzzles + deductions must feel good and work every time. Biggest weight → puzzles and the deduction loop get the most dev time. |
| Theme interpretation | 20 | Comic (whole UI is a comic), Twist (narrator is the culprit), Light (spirit light drives the puzzles and reveals the truth). Make all three obvious in the first 2 minutes. |
| Technical stability | 20 | No crashes, no soft-locks, save/continue works, loads fast on itch. Autoplay test + every PR played before merge. Main always playable. |
| Audio-visual cohesion | 20 | One consistent ink-noir comic style (code-drawn UI + shader). Audio is parked for now (team decision, 5 Oct). |
| Compliance with Hour 12 plan | 10 | Parked for now (team decision, 5 Oct). |

---

## 1. Engine choice — why Phaser 3

| | Phaser 3 + TS (**pick**) | Godot 4 | Unity 6 |
|---|---|---|---|
| Browser build on itch | Native — it *is* a web page, tiny, instant load | Good (single-thread export), ~30–40 MB | Heavy WebGL, slow load, more browser bugs |
| Claude Code can build & test it end to end | **Yes** — all plain text files, runs in headless Chrome for automated tests | Partly — scene files are text but editor-centric | Weakest — scenes/prefabs/inspector work is manual |
| Fits a comic UI (panels, bubbles, text, tweens) | Excellent (tweens, masks, shaders, DOM text) | Good | Good but slow to iterate |
| 3D later | No (would add three.js or port) | **Best** path to 3D | Good |
| Time to first playable | ~1 hour | ~3 hours | ~4+ hours |

**Verdict:** with 30 hours, 3 Claude Code seats and a browser-only target, Phaser lets Claude write, run and auto-test nearly the entire game. 3D is realistically post-jam; keep all content in `content/*.json` so a later Godot/Unity 3D version can reuse the story, deductions and puzzle levels unchanged.

---

## 2. What the game is (condensed from the blueprint)

1. **Title** → "CLICK TO INVESTIGATE", Continue/New Game/Settings/Credits.
2. **Opening**: 6 comic frames (Blueprint F2). Elias is never shown — only hands, coat, lantern.
3. **Village hub** (one fixed 1920×1080 screen): Mira (schoolhouse), Arun (river road), Leela (lantern-house), clock tower, casebook, menu. Witnesses can be visited in **any order**.
4. **Witness conversation**: 3–6 bubbles + evidence-gated questions → **ENTER HER/HIS/THE ARCHIVE MEMORY**.
5. **Memory page**: one 6-panel comic page, starts grey, **5 evidence fragments** ("Evidence 0/5"). Simple fragments are revealed by clicking SFX words/objects; **each page's 3 key fragments sit at the end of an Echo Path puzzle** (section 3).
6. **Deduction (RECONSTRUCT)**: when the 2–3 required evidence items exist, the player picks the supporting cards plus one conclusion. Wrong → "The evidence does not support this conclusion yet." (no penalty). Right → stamp, casebook update, unlocks.
7. **Aftermath** "Meanwhile…" page: shows new evidence threads (CORROBORATES / CONTRADICTS / REVEALS) and their captions (Blueprint Part I).
8. **Casebook**: corkboard, 3 witness columns, shared timeline, THE FIGURE + NIA cards, threads drawn when both clues are known.
9. After all **9 deductions** (sis_1–3, bro_1–3, mom_1–3) → **THE RECORD** hotspot → **Hidden Archive** (collapse escape puzzle) → **Finale** 8 frames (Blueprint L2): the silhouette dissolves into young Elias → **Truth ending** → Summary + Credits.

No fail state, no timer, one canonical ending (+ optional epilogue if 100% evidence; stretch).

---

## 3. Fragment retrieval — "Echo Paths" puzzle design

Inspired by **Lara Croft GO** (turn-based node movement, enemies with readable patterns, levers) and **Felix the Reaper** (rotate the light source, which moves the shadows, and that changes where you can walk). It also expresses the **Light** theme directly.

### 3.1 Core rules (shared by every puzzle)
- When the player clicks a panel's locked fragment, the panel zooms and a **grid board** (5×5 to 7×7) is overlaid on the greyscale panel art.
- The player controls **the lantern wisp** (Elias's spirit-light probe, a teal glow). This keeps Elias off-screen, which the twist needs.
- **Turn-based**: click or tap an adjacent tile (arrow keys/WASD optional) and you move 1 tile. Everything else then takes its turn.
- **Light & ink (Felix rule):** a light source (moon / lantern / clock face) shines from one of 4 directions. Tall props (pillars, bell frame, crates) cast **shadow**. **Shadowed tiles are INK, the erased memory, and the wisp cannot enter them.**
- **Clock dial tile:** stepping on it rotates the light 90° (the clock hand jumps on from 2:17). The shadows move. If the wisp's own tile becomes ink, the memory "slips": a quick rewind to the start of the puzzle.
- **Goal:** reach the tile holding the glowing SFX word (e.g. `HUM!`). The word bursts, then the evidence card and fragment text appear.
- **Always available:** Undo (1 turn), Reset, and **Hint** after 3 resets (it shows the next 3 moves). After 6 resets a **Skip** button appears (a story game must never hard-block). A move counter is shown; there are no stars and no fail state.

### 3.2 One signature mechanic per witness (introduced in isolation, so visit order doesn't matter)
| Where | New element | Fiction |
|---|---|---|
| **Clock tower (tutorial, first spirit-lantern use, Blueprint F3)** | Movement + light rotation only | The tower clock frozen at 2:17 |
| **Mira page** | **Bell rope levers → gates** (a lever toggles linked gates) | The bell rang with no hand on the rope |
| **Arun page** | **Sluice switches → water tiles** (flood/drain channels) + **pushable crate** (it casts its own shadow) | The river was diverted underground |
| **Leela page** | **Memory echoes** (sentinel ghosts on fixed patrols, they step after you; walking into their facing tile = rewind) + **network nodes** (one node toggles several gates) | The lantern network and its anchors |
| **Hidden Archive** | **Collapsing floor** (each tile can be stepped on once) + everything above | "Archive collapse/scripted escape" (A14) |

### 3.3 Puzzle list (8 core + 3 stretch; fallback = 5)
| ID | Page / panel | Guards evidence for | Mechanics | Size | Target moves |
|---|---|---|---|---|---|
| `pz_tower` | Village clock tower | lantern residue (first clue) | move, light | 5×5 | 6–8 |
| `pz_sis_1` | Mira P3 | HUM! lantern resonance → sis_1 | light, lever | 5×5 | 8–10 |
| `pz_sis_2` | Mira P4 | SCRATCH! 2:31 entry → sis_2 | lever ×2, light | 6×6 | 10–14 |
| `pz_sis_3` | Mira P5 | GLASS! apprentice staff → sis_3 | lever, light, 2 dials | 6×6 | 12–16 |
| `pz_bro_2` | Arun P2 | TICK! watch 2:31 → bro_2 | sluice | 5×5 | 8–10 |
| `pz_bro_1` | Arun P3 | CLANK! sluice → bro_1 | sluice, crate | 6×6 | 10–14 |
| `pz_bro_3` | Arun P4 | CLOTH! hairclip → bro_3 | sluice, crate, light | 6×6 | 12–16 |
| `pz_mom_1` | Leela P1 | TINK! memory spool → mom_1 | echo sentinel | 5×5 | 8–10 |
| `pz_mom_2` | Leela P4 | CLICK! network link → mom_2 | sentinels, nodes | 6×6 | 10–14 |
| `pz_mom_3` | Leela P5 | ASH! master log → mom_3 | sentinels, nodes, light | 7×7 | 14–18 |
| `pz_archive` | Hidden Archive | THE RECORD (opens finale) | collapse + all | 7×7 | 16–20 |

**Core (build these):** `pz_tower`, `pz_sis_1`, `pz_sis_3`, `pz_bro_2`, `pz_bro_3`, `pz_mom_1`, `pz_mom_3`, `pz_archive`. The first puzzle on each page introduces that page's mechanic, so visit order still doesn't matter.

**Stretch (only after M2):** `pz_sis_2`, `pz_bro_1`, `pz_mom_2`. Until then their evidence is plain click-to-reveal.

**Fallback if behind at 02:30 Tue:** `pz_tower` + `pz_sis_1` + `pz_bro_2` + `pz_mom_1` + `pz_archive` (5 puzzles).

### 3.4 Puzzle level format (`content/puzzles/*.json`)
```json
{
  "id": "pz_sis_1", "w": 5, "h": 5,
  "tiles": ["#...G", ".P#..", "..L..", "D....", "S...."],
  "legend": {"#":"pillar","G":"goal","P":"gate:g1","L":"lever:g1","D":"dial","S":"start",".":"floor"},
  "light": "N",
  "sentinels": [], "crates": [], "water": [],
  "reward": "ev_sis_hum", "par": 9
}
```
A **BFS solver** (`tools/solve-puzzles.ts`) runs in CI and checks every level is solvable within `par + 4` moves. It also records the hint path. **Claude authors the levels and the solver proves them.**

---

## 4. Free assets — GUI and visuals

Rule: **CC0 first, then CC BY with attribution, SIL OFL/Apache for fonts.** No paid, NC, ND or "no license stated" assets. Log **every** file in `CREDITS.md` (name, creator, URL, license, where used, modified?). Arya verifies each license **on the source page** before it is committed.

### 4.1 Built in code by Claude (zero art cost)
Comic panel frames & gutters · speech/narration/thought bubbles (incl. `[[redacted]]` black bars and `~cracked~` text) · SFX burst lettering (BELL!, HUM!…) · **greyscale → colour and halftone/ink shaders** (art is drawn once, in colour) · spirit-light radial mask · casebook corkboard layout, cards, pins, threads (double line / broken line / arrow) · CORROBORATES / CONTRADICTS / REVEALS / CONFIRMED stamps · **all in-world documents** (clinic card, case request letter, school register, river ledger, master log, schematic) drawn from fonts + paper texture · puzzle board, tiles, wisp, sentinels, levers, gates, water, crates · rain/dust/ember particles · page-turn and panel-zoom transitions · menus, settings, pause.

### 4.2 Downloaded free assets
| Need | Source | License |
|---|---|---|
| SFX / title lettering | **Bangers** — Google Fonts | SIL OFL 1.1 |
| Speech bubbles | **Comic Neue** — Google Fonts | SIL OFL 1.1 |
| Narration boxes / case files | **Special Elite** — Google Fonts | Apache 2.0 |
| Elias's handwritten notes (the handwriting clue) | **Caveat** — Google Fonts | SIL OFL 1.1 |
| Paper, cork board, wood, stone textures | **ambientCG** (search "Paper", "Cork", "Wood", "Concrete") | CC0 |
| Cursors, UI icons (casebook, menu, settings, undo, reset, hint) | **Kenney**: Cursor Pack, Game Icons, Board Game Icons | CC0 |
| Glow / smoke / spark sprites (spirit light, residue) | **Kenney Particle Pack** | CC0 |
| Village & location backgrounds (base for paint-over) | **The Outlander — Free CC0 Village Backgrounds** (itch.io) | CC0, *AI-generated by its creator → disclose* |
| Extra props / textures if needed | **OpenGameArt.org** (filter to CC0) | CC0 (check each) |
| Optional ink reference / public-domain comic textures | Wikimedia Commons (PD-tagged files only) | Public domain |
| Engine/libs | Phaser 3 (MIT), Vite (MIT), TypeScript (Apache-2.0), Playwright (Apache-2.0, dev only) | Open source |

### 4.3 Drawn by the team (manual — cannot be automated well)
The **silhouette twist depends on consistent character art**, so characters are original. The style is **"ink noir"**: heavy black shapes, grey wash and 1 accent colour per character (Blueprint C). It's fast to draw and fits the silhouette motif.

Panels are **not** drawn 18 times. Each memory page = **1 wide background scene + character/prop cutouts**. Code crops 6 panel windows out of that scene and layers the cutouts in, so 3 pages need ~3 backgrounds rather than 18 panels.

---

## 5. Team & roles

| Person | Claude Code | Role | Owns |
|---|---|---|---|
| **Garv** (Gravity006, **repo owner / lead**) | ✅ | **Lead, comic UI, build & release** | Repo admin, Team HQ issue, status updates, **reviews, play-tests and merges every PR**. `src/comic/`, Memory / Casebook / Opening / Finale / Ending scenes, `src/main.ts`, build config, CI + GitHub Pages, art import (`npm run art`), `CREDITS.md`, itch.io release |
| **Nav** (BoredDog) | ✅ | **Gameplay core** | `src/core/` (GameState, SaveManager, StoryData, DeductionController), `content/*.json` + `design/script_review.html`, Boot / Title / Village / Conversation / Deduction / Aftermath / Pause scenes, autoplay test |
| **Vansh** (VaNsH-IIIT) | ✅ | **Puzzles** | `src/puzzle/`, `content/puzzles/`, Puzzle + Archive scenes, `tools/solve-puzzles.ts`: Echo Paths engine, 8 core levels (+3 stretch), hint/undo/reset/skip, archive escape |
| **Bhumi** (Bhumi-Chaudhari) | ❌ | **Character & key art** | `art/incoming/bhumi/`: Elias silhouette, young Elias, Mira, Arun, Leela, Nia, title cover, finale/ending panels |
| **Arya** (arya2707) | ❌ | **Environment art, assets, QA** | `art/incoming/arya/`: backgrounds (paint-over), props, asset license checks, `CREDITS.md` entries, text proofreading, bug reports, playtests, itch.io page text |

**Nobody edits another area's files.** Need a change in someone else's area? Ask in Team HQ or open an issue for them.

**Git rules (jam rule: every member commits from their own account):**
- Repo: **https://github.com/Gravity006/Indiesigners** (owner: Garv). All four teammates already have write access.
- **`main` is protected:** changes only through pull requests, and the automatic build must pass. Garv plays every PR before merging so `main` is always playable.
- Devs: branch `feat/<area>` → PR → Garv tests and merges. Merge at every sync point; don't sit on a branch longer than ~4 h. Garv's own PRs get a quick look from Nav.
- **Team communication: the pinned "Team HQ" issue.** Bugs = a new issue with the `bug` label. Anyone can do both from the GitHub website.
- Bhumi & Arya: upload via GitHub web ("Add file → Upload files") straight into `art/incoming/<your-name>/`. Garv's Claude moves the files into place. The website will offer to "create a new branch and start a pull request" because `main` is protected; accept it, and Garv merges it. This gives you real commits from your own accounts.

### Bhumi & Arya: no-AI workflow
Nothing in Bhumi's or Arya's tasks needs an AI subscription. Everything they do is drawing, picking, checking or playing, using free tools only:

| Need | Free tool |
|---|---|
| Drawing / painting | **Krita** (desktop) or **Photopea** (browser, Photoshop-like) |
| Paint-over / filters / cutting out props | Krita, **GIMP** or Photopea |
| Uploading art | GitHub website upload (no git or terminal needed) |
| Credits list | Edit `CREDITS.md` on the GitHub website (pencil icon → it opens a PR for you) |
| Bug reports | GitHub website → Issues → New issue, label `bug` (what happened, steps, screenshot) |
| Text fixes | GitHub website → Issues → New issue, label `text` (which line, what it should say) |
| Questions, status, art for approval | Comment in the pinned **Team HQ** issue |
| Playing test builds | The GitHub Pages link pinned in Team HQ (any browser) |

**Buddy system:** anything technical goes to a dev, whose Claude handles it.
- **Bhumi ↔ Garv**: Bhumi uploads raw PNG/KRA at any size. Garv's Claude resizes, trims, converts to WebP and places the art in the scenes, then sends Bhumi a screenshot to approve.
- **Arya ↔ Nav**: Nav's Claude applies `text` issues to `content/*.json` and generates a readable `design/script_review.html` (all game text as a script), so Arya never has to read JSON. Garv merges Arya's `CREDITS.md` PRs.
- Neither of them is ever blocked waiting on AI output. If a dev is asleep or busy, they keep drawing or testing from their own list.
- File names: lowercase snake_case (`mira_neutral.png`, `bg_river_road.webp`). Transparent PNG for cutouts, WebP/PNG for backgrounds, master size 1920×1080. Keep Krita `.kra` sources in `art-src/` (proof of authorship).

---

## 6. Repo layout (set up by Garv on `feat/comic`)
```
/                     package.json, vite.config.ts, tsconfig.json, README.md, LICENSE, CREDITS.md, TASKS.md, PLAN.md
/src/core             GameState.ts, SaveManager.ts, StoryData.ts, DeductionController.ts, EvidenceResolver.ts
/src/scenes           Boot, Title, Opening, Village, Conversation, Memory, Puzzle, Deduction, Aftermath, Casebook, Archive, Finale, Ending, Credits, Pause
/src/comic            PanelRenderer, Bubble, SfxWord, Shaders (grey/halftone/ink), Transitions
/src/puzzle           Board, Rules, Light, Entities, Undo, Hint
/content              story.json, evidence.json, deductions.json, threads.json, dialogue.json, ui_text.json, /puzzles/*.json
/public/assets        art (final), fonts, textures, ui
/art/incoming         raw uploads from Bhumi/Arya
/art-src              .kra sources
/tools                extract-blueprint, solve-puzzles, autoplay (Playwright)
/design               blueprint.pdf, proposal.pdf
```

---

## 7. The 30-hour schedule (Mon 10:00 → Tue 16:00)

Times are IST. **Sync** = 10-minute call: everyone says done / next / blocked, then Garv merges. Async status goes in Team HQ.
That's ~25 working hours plus one 5-hour sleep. With 30 hours instead of 40, the scope in §0 and §3.3 is already trimmed. Don't add anything back until M2 is green.

### Block A — Mon 10:00 → 13:00 · Setup & foundations
| Who | Tasks |
|---|---|
| All | 10:00 15-min call: confirm Phaser, roles, art style (ink noir), the itch.io page owner. Read §2–3. |
| Nav | Pull `main` (project + comic layer already set up by Garv). `GameState` + `SaveManager` (localStorage autosave, Continue/New Game), `StoryData` loader, Boot → Title → Village stubs. Start extracting blueprint text into `content/*.json`. |
| Vansh | Install Node. Puzzle JSON schema + pure-TS rules engine (move, light/ink, dial, lever/gate first) + BFS solver + unit tests. |
| Garv | ✅ *Done early (5 Oct night):* project setup, comic layer, art pipeline. Repo protection, Pages, CI, Team HQ. Then the `MemoryPage` scene from data (panel zoom/dim, 5 fragment hotspots, Evidence 0/5, locked fragments launch the puzzle, RECONSTRUCT / LEAVE MEMORY). Review + merge PRs. |
| Bhumi | Style sample: **Elias silhouette (back view + full outline)** + rough **Mira**. Upload by **12:00**. All 5 approve the style at the 12:00 check-in, then it's locked. |
| Arya | Download & license-check: 4 fonts, ambientCG paper + cork, Kenney Cursor/Game Icons/Particle packs, Outlander village pack. Log every asset in `CREDITS.md` (edit it on the GitHub website). |

**Sync 13:00.**

### Block B — Mon 13:00 → 19:00 · Core loop + Mira vertical slice
| Who | Tasks |
|---|---|
| Nav | Finish `content/*.json` (dialogue, evidence, deductions, threads, captions, UI text, finale frames) + `design/script_review.html` for Arya. `DeductionController`. Village hub (hotspots, hover status, NEW EVIDENCE shimmer), Conversation scene with evidence-gated questions, **Deduction screen** (pick cards + conclusion, stamps), **Aftermath** caption page. Wire Title → Village → Mira → Memory → Puzzle → Deduction → Aftermath → Village. |
| Vansh | Puzzle **scene**: board over panel art, wisp movement, ink shadows, light rotation, undo/reset/hint/skip, win → returns evidence id. Build + solver-verify `pz_tower`, `pz_sis_1`, `pz_sis_3`. Start sluice/water + crate. |
| Garv | Finish `MemoryPage`, first pass of the Casebook, import Bhumi's/Arya's first art (`npm run art`). Review, play-test and merge PRs at 13:00 / 16:00 / 19:00. |
| Bhumi | Final **Elias** pieces: back-view cutout, hands + lantern staff, solid silhouette, **young Elias** profile (reveal). **Mira** neutral + 1 expression. |
| Arya | **Village hub background** (Outlander base + ink-noir paint-over; clock at 2:17; schoolhouse, river road, lantern-house, well). **Mira page background** (classroom + clock tower interior). |

**🎯 Milestone M1 — 19:00: Mira playable end to end (talk → page → 2 puzzles → 3 deductions → back to village) on the Pages link. Everyone plays it once.**

### Block C — Mon 19:00 → Tue 02:30 · Content complete
| Who | Tasks |
|---|---|
| Nav | Arun + Leela content wiring, all 9 deductions + 6 threads, THE RECORD unlock after 9/9, witness resolution beats (fade + last line + location mark), Pause/Settings (text size, Reduce Motion, fullscreen). Claude **autoplay test** (Playwright plays all 6 witness orders to the credits) before sleeping. |
| Vansh | Sluice/crate, sentinels, network nodes, collapsing floor. Build + verify `pz_bro_2`, `pz_bro_3`, `pz_mom_1`, `pz_mom_3`, `pz_archive`. Hidden Archive scene around the escape puzzle. |
| Garv | Casebook (3 columns, timeline, FIGURE/NIA cards, threads: double / broken / arrow, Figure card flip). Opening (6 frames, F2), Finale (8 frames, L2: silhouette dissolve → young Elias), Truth ending, Summary + Credits. Import the art as it arrives. |
| Bhumi | **Arun** neutral + 1, **Leela** neutral + 1, **Nia**, then the **finale reveal panel** (young Elias at the console). |
| Arya | Prop cutouts (pocket watch 2:31, bell rope, silver hairclip, lantern case "E.V."). **Arun page background** (river road, dry channel, sluice), **Leela page background** (lantern workshop + console). Proofread `design/script_review.html` and file `text` issues. Play-test M1 and file `bug` issues. |

**🎯 Milestone M2 — 02:30: game completable start → credits on the Pages link (placeholder art allowed). Autoplay test green.**

**🛏 Sleep 02:30 → 07:30** (Bhumi/Arya can shift to ~00:30 → 06:30 and start early).

### Block D — Tue 07:30 → 12:00 · Art integration, polish, playtest
| Who | Tasks |
|---|---|
| Nav | Fix bugs in the core area, save/continue edge cases, Chrome/Firefox/Edge check, performance (WebP, lazy-load pages). |
| Vansh | Tune puzzle difficulty from the playtests. If time allows, add the stretch puzzles `pz_sis_2`, `pz_bro_1`, `pz_mom_2`. Otherwise help Garv with juice (wisp trail, ink spread on rewind). |
| Garv | All final art in, panel crops, ink/halftone tuning, transitions, title screen idle (rain, flicker, silhouette pass). |
| Bhumi | **Title cover** (Veyra, frozen clock, lantern, distant silhouette), 2 ending panels, art fixes the devs ask for. Upload `.kra` sources to `art-src/`. |
| Arya | Hidden Archive background. **2 external playtesters** (Blueprint T1 log). Final `CREDITS.md` check. Itch page text in a Google Doc: description, controls, content warning (R1), AI disclosure (Garv supplies the AI-tool list). |

**🎯 Milestone M3 — 12:00: FEATURE FREEZE.** Only bug fixes after this.

### Block E — Tue 12:00 → 16:00 · Release
| Time | Task | Who |
|---|---|---|
| 12:00–13:30 | Bug fixes only, final autoplay run | Nav, Vansh, Garv |
| 12:00–13:30 | Screenshots (3–5) + cover (Claude captures them), final README (itch link, controls, team, setup) | Garv + Arya |
| 13:30 | Build `dist/`, zip it, **upload to itch.io** (HTML5, 1920×1080, fullscreen button) | Garv |
| 13:45 | Fresh-browser test of the itch page on 3 browsers; fix → re-upload if needed | Everyone |
| **15:00** | **Submit** (form + Discord thread) — 1 h buffer | Garv + Arya |
| 15:00–16:00 | Buffer for disasters only. Repo public, LICENSE present, no commits after the deadline. | — |

### If you fall behind — cut in this order
1. Stretch puzzles (`pz_sis_2`, `pz_bro_1`, `pz_mom_2`) — already off the core list
2. Puzzles down to the 5-puzzle fallback (§3.3)
3. Casebook threads become static (cards only, with a text label)
4. Opening shortened to 3 frames; aftermath becomes one caption popup
5. Title cover becomes the village background with the logo

**Never cut:** finale reveal, save/continue, the ability to finish the game.

---

## 8. What Claude Code does automatically vs. what needs humans

### ✅ Claude Code can do on its own (on Nav/Vansh/Garv's machines)
- All game code: scenes, state, save, deductions, casebook, comic renderer, shaders, transitions, settings.
- **Turn the blueprint PDF into game data** (`content/*.json`), word for word.
- **Design all puzzle levels and prove they are solvable** (BFS solver) and generate hint paths.
- All code-drawn GUI: bubbles, panels, SFX lettering, stamps, threads, documents, puzzle tiles, particles.
- Download CC0 packs/fonts, wire them in, draft `CREDITS.md` entries.
- **Automated playthrough tests** (Playwright plays all 6 witness orders to the ending, checks for console errors).
- Screenshots/cover captures, README, LICENSE, AI-disclosure section, GitHub Pages deploy, itch.io upload script (butler).
- **Do the technical side of Bhumi's and Arya's work:** process their art (resize/trim/WebP/place), apply their `text` issues, merge their `CREDITS.md` PRs, and generate the readable script for proofreading.
- Watch the repo and pull new commits/uploads locally (already running in Garv's session).

### 🧑 Needs a human
| Task | Who |
|---|---|
| Character and key-panel art (style, silhouette consistency) | Bhumi |
| Background paint-over, art direction checks | Arya (+Bhumi) |
| **License verification on the actual source page** for every downloaded asset | Arya |
| Judging whether puzzles feel fun, if the twist lands, if the text reads well | Everyone, + 2 external testers |
| Creating the itch.io page, owning it, adding collaborators, final upload click (or giving an API key for butler) | Garv (owner) |
| Official form submission + Discord post | Garv / Arya |
| Each person committing from their **own** GitHub account | Everyone |
| Approving Claude's commits/PRs and merges | Garv (repo owner); Nav glances at Garv's PRs |
| Repo settings: public visibility, collaborators, GitHub Pages, branch protection | Garv (only the owner can do these) |

### 🙋 What we need from you (blocking items — please answer ASAP)
1. **Install Node.js 20 LTS** on all three dev machines (`winget install OpenJS.NodeJS.LTS`) and set git identity (`git config --global user.name/user.email`).
2. **Confirm Phaser 3** as the engine (or say otherwise in the first 30 minutes; switching later is expensive).
3. **Does the jam allow AI-generated assets** (e.g. the Outlander CC0 backgrounds, which are AI-made)? If unsure, Arya paints over them, or we draw backgrounds ourselves.
   **Decided 5 Oct (Garv): yes, AI-assisted art is allowed.** Disclose it in CREDITS.md (Claude Code's vector drafts are listed there).
4. **itch.io page owner: Garv.** For automated uploads, create an itch API key and keep it locally — never commit it.
5. ✅ Repo is public at `Gravity006/Indiesigners`, all 4 teammates are collaborators. Garv enables Pages + branch protection.
6. Lock the art style by **Mon 12:00** (Bhumi posts one Elias + one Mira sample; all 5 approve).

---

## 9. Starter prompts for each Claude Code seat

Paste these into Claude Code at the start of each block (each dev in their own clone, on their own branch).

**Nav (gameplay core):**
> Read PLAN.md, TASKS.md and the blueprint PDF in this repo. The Phaser 3 + TS + Vite project and src/comic already exist; only edit files in your area (PLAN.md §5). Build GameState, SaveManager (localStorage autosave) and a StoryData loader, and extract every on-screen text from the blueprint (Parts D, F, G, H, I, J, K, L, M) into content/*.json with the exact IDs (sis_1…mom_3). Then the Boot, Title, Village, Conversation, Deduction and Aftermath scenes, using src/comic for all comic visuals.

**Vansh:**
> Read PLAN.md §3 and TASKS.md; only edit files in your area (PLAN.md §5). Implement the Echo Paths puzzle system in src/puzzle as a pure rules engine (grid, turns, light direction + shadow-casting ink, dial rotation, levers/gates, sluice/water, pushable crates, sentinels with patrols, network nodes, collapsing floor), plus a Phaser Puzzle scene that renders it over panel art with undo/reset/hint/skip. Write tools/solve-puzzles.ts (BFS) and author the 8 core levels in content/puzzles (PLAN.md §3.3) so each one is solvable within par+4.

**Garv:**
> (Comic layer, art pipeline and project setup are done.) Read PLAN.md and TASKS.md. Build the Memory, Casebook, Opening, Finale and Ending scenes from content/*.json with src/comic, then review, play-test and merge open PRs.

---

## 10. Definition of done (submission checklist)
- [ ] All 9 deductions confirmable; all 6 visit orders reach the ending (autoplay test green)
- [ ] All puzzles solvable; hint + skip work
- [ ] Save → close tab → Continue works
- [ ] No console errors in Chrome, Firefox, Edge
- [ ] First playthrough ≈ 12–18 min (puzzles add a few minutes over the blueprint's 15)
- [ ] No placeholder text or art left
- [ ] `CREDITS.md` lists every third-party asset; AI disclosure in README + itch page
- [ ] Public repo with LICENSE, `.kra` sources committed, every member has commits
- [ ] itch.io HTML5 build plays from a fresh browser; uploaded by **13:30**, submitted by **15:00**

---

## 11. Setup — exact commands to download everything

Everything below has been tested on Windows 11. Run **PowerShell** commands in Windows Terminal → PowerShell, and **bash** commands in Git Bash.

### 11.1 Tools — devs (Nav, Vansh, Garv)
PowerShell, once per machine:
```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e               # Node 24 LTS
winget install --id Microsoft.VisualStudioCode -e      # optional editor
# Garv only (itch.io upload): butler is not on winget; download it from https://itch.io/docs/butler/installing.html
```
**Close and reopen the terminal**, then check the installs and set your git identity. It must be the email on **your own** GitHub account (jam rule):
```powershell
node -v; npm -v; git --version
git config --global user.name  "<your GitHub username>"
git config --global user.email "<email on your GitHub account>"
```
Claude Code CLI (if not installed already):
```powershell
npm install -g @anthropic-ai/claude-code
```

### 11.2 Tools — artists (Bhumi, Arya). Free, no AI subscription needed
```powershell
winget install --id KDE.Krita -e
winget install --id GIMP.GIMP.3 -e      # optional; Photopea (https://www.photopea.com) works in the browser with no install
```
No git needed. Upload through the GitHub website: repo → `art/incoming/<your-name>/` → **Add file → Upload files** → Commit.

### 11.3 Get the repo + project (devs)
**Everyone:**
```bash
git clone https://github.com/Gravity006/Indiesigners.git
cd Indiesigners
```
**Project setup:** already done by Garv (Phaser 3.90 + TS + Vite). Nothing to scaffold.
**Nav and Vansh, before starting:**
```bash
git pull
npm install
npx playwright install chromium
git checkout -b feat/core          # Nav
git checkout -b feat/puzzle        # Vansh
npm run dev                        # opens the game at http://localhost:5173
```

### 11.4 Free assets
**Automated** (fonts, ambientCG textures, Kenney packs). Run in Git Bash from the repo root. One dev runs it and commits `public/assets/`; `assets-raw/` stays local (gitignored):
```bash
bash tools/download-assets.sh
```
| Lands in | What |
|---|---|
| `public/assets/fonts/` | Bangers, Comic Neue (Regular/Bold), Special Elite, Caveat + each license file |
| `public/assets/textures/` | paper001–003, cork001, wood049, concrete034 (ambientCG colour maps, CC0) |
| `assets-raw/kenney/` | cursor-pack, game-icons, board-game-icons, particle-pack (CC0). Copy only the files you use into `public/assets/ui/` |

**Manual** (Arya). These sites need a click-through download, or a human has to check the license:
1. The Outlander CC0 village backgrounds → https://the-outlander.itch.io/free-cc0-village-backgrounds-pack-24-05-24-09-49-07 → "Download Now" → "No thanks, just take me to the downloads" → upload the backgrounds you pick to `art/incoming/arya/`. Add it to `CREDITS.md`: **CC0, AI-generated by its creator**.
2. Any extra OpenGameArt asset: CC0 filter only. Copy the license line from the page into `CREDITS.md` before using it.
3. For every asset (including the automated ones), open the source page once and confirm the license in `CREDITS.md`.

### 11.5 Daily commands (devs)
```bash
git pull                     # start of every block
npm run dev                  # play locally
npm run build                # production build into dist/
git add -A && git commit -m "<what changed>" && git push   # then open a PR to main; Garv merges
```

---

## 12. Ideas backlog: researched, NOT implemented yet

> Added 5 Oct (early morning) after looking at comparable games. **Nothing here is scheduled.** Garv picks what (if anything) goes into the Phaser jam build before the 12:00 freeze; the rest feeds the Godot version. Each idea lists the judging criterion it serves.

### A. Gaps against our own Blueprint (cheapest wins, Phaser)
| # | Idea | Serves | Effort | Notes |
|---|---|---|---|---|
| A1 | **Spirit-light lantern mode** (Blueprint F3, N "Spirit-light reveal", S "L: spirit-light mode"): hold L / toggle the lantern icon on a memory page → a soft light circle follows the cursor and reveals hidden residue + the silhouette's outline; some optional evidence only shows under the light | Theme (Light) 20 · Gameplay 30 | 2–3 h | **Built 5 Oct (Phaser):** LANTERN button / hold L; teal light follows the pointer; residue ("E.V.", "2:31", "NIA", "32 + 1 anchors") and one light-only optional clue per page (`light: true` / `residue` in `content/pages/*.json`). Godot: not yet. |
| A2 | **Final accusation at THE RECORD**: "Who caused the incident?", pick one clue per witness + the case-request handwriting, options include *"The investigator. Me."* | Theme (Twist) · Gameplay | 1–2 h | **Built 5 Oct (Phaser):** `AccusationScene` + `content/accusation.json`, Archive escape → Accusation → Finale; one clue per witness + the Archive handwriting match; per-option nudges. Godot: not yet (Archive still goes straight to the Finale). |
| A3 | **Unreliable narration made visible** (Blueprint B4): when a page's evidence contradicts its narration box, the box glitches and a corrected line is stamped over it | Theme (Twist) · AV cohesion | 1–2 h | Twist-planting lines already exist in `memory_text.json` (`twistNarration`). |
| A4 | Text size setting actually applied (N7) | Technical stability | 1 h | Already Nav's task. |

### B. Deduction design (from Golden Idol, Obra Dinn, Roottrees)
| # | Idea | Serves | Effort | Reference |
|---|---|---|---|---|
| B1 | **Closeness feedback instead of right/wrong**: when an attempt fails, say *"Your conclusion fits, but one card doesn't belong"* vs *"The cards fit, the conclusion doesn't"* | Gameplay | 1 h | Golden Idol's "two or fewer slots are incorrect" rewards being close without giving the answer ([Game Developer](https://www.gamedeveloper.com/design/case-of-the-golden-idol)). **Built 5 Oct (Phaser):** `DeductionController.closeness()`, text in `ui_text.json` → `closeness`; counts only, never names a card. Godot: not yet. |
| B2 | **Anti-guessing**: today a player can brute-force the 3 conclusions. Lock in deductions **in pairs/threes** (Obra Dinn rule of three), or hide which deduction was wrong | Gameplay | 2 h | Obra Dinn only confirms fates three at a time to stop brute-forcing ([Film Stories](https://filmstories.co.uk/?p=83249)) |
| B3 | **Fill-in-the-blanks night reconstruction** before the finale: *"At [2:17] the [Echo Lantern] rang the bell. At [2:31] [Elias] carried [Nia] to the [lantern chamber]…"*, word chips earned from evidence, colour-coded by type | Gameplay · Theme | 4–6 h | Golden Idol's "Thinking" page ([Adventure Game Hotspot](https://adventuregamehotspot.com/2022/11/21/the-case-of-the-golden-idol)) |
| B4 | **Player-made contradictions**: drag Arun's 2:31 card onto Mira's 2:17 card to *raise* the CONTRADICTION thread instead of it appearing automatically; fixes "each deduction is solvable from one page" | Gameplay | 3 h | Roottrees' evidence board shapes reasoning across sources ([DiGRA paper](https://dl.digra.org/index.php/dl/article/download/2932/2916/2975)) |

### C. Echo Paths puzzles (from Lara Croft GO, Felix the Reaper)
| # | Idea | Serves | Effort | Reference |
|---|---|---|---|---|
| C1 | **Shadow preview**: hovering the clock dial shows where ink will fall after the 90° turn | Gameplay (readability) | 1 h | Felix lets you preview the two shadow states before switching ([Gamereactor](https://www.gamereactor.eu/felix-the-reaper-handson-impressions)) |
| C2 | **Stacking**: a crate on a crate casts a longer shadow; plan moves *before* turning the light | Gameplay | 2–3 h | Felix stacks barrels on boxes to extend shade ([TheGamer](https://www.thegamer.com/felix-reaper-review/)) |
| C3 | **Readable enemy telegraphs**: each sentinel type shows its next step; one-mechanic-at-a-time introduction | Gameplay | 1–2 h | Lara GO: alternating turns + fixed enemy routes keep puzzles readable ([Macworld](https://www.macworld.com/article/226419/lara-croft-go-does-touchscreen-tomb-raiding-right.html)) |
| C4 | **Dial = clock hands**: rotating the light visibly moves a clock face 2:17 → 2:31, so the puzzle retells the timeline | Theme | 1 h | Ties Felix's sun rotation to our 2:17 motif |

### D. Comic presentation (from Gorogoa)
| # | Idea | Serves | Effort | Reference |
|---|---|---|---|---|
| D1 | **Enter a memory through a frame**: zoom into the window / clock face / lantern in the conversation art until it *becomes* the memory page | AV cohesion · Theme (Comic) | 2–3 h | Gorogoa's sub-framing: moving through doors, windows and paintings ([Unwinnable](https://unwinnable.com/2018/07/02/unwinnable_monthly_gorogoa_104/)) |
| D2 | **Finale panel ordering**: the player drags the 8 finale panels into the right order before the silhouette dissolves | Gameplay · Theme | 3 h | Gorogoa's slide / stack / zoom panel mechanics ([Mechanics of Magic](https://mechanicsofmagic.com/2026/07/29/how-gorogoa-connects-the-puzzle-of-looking-through-pictures/)) |

### E. Godot-version only (post-jam / side track)
| # | Idea | Notes |
|---|---|---|
| E1 | **2.5D village**: panels as quads in 3D space, camera flies *through* panel frames between scenes | The original "3D later" goal; Godot handles 3D natively |
| E2 | Toon/ink outline + halftone as a 3D post-process shader | Port of `ComicFxPipeline` |
| E3 | **Web export**: GL Compatibility (done), and on itch either tick **SharedArrayBuffer support** or export without threads | Common Godot-4-on-itch failure ([itch forum](https://itch.io/jam/go-godot-jam-4/topic/2853480/solved-godot-4-cant-export-for-web), [foosel](https://foosel.net/til/2023-05-14-how-to-export-a-godot-4-game-to-run-on-the-web-on-itchio/)) |
| E4 | Audio pass (parked for the jam): ChipTone SFX per comic word, the Blueprint O1 music picks | AV cohesion |

**Suggested picks if there's time before the freeze (Garv to decide):** A1 spirit-light (Light theme), A2 final accusation (Twist), B1 closeness feedback (Gameplay). All three are small, use existing systems and hit the three heaviest criteria.
