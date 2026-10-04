# Echoes of Sorrow — 30-Hour Build Plan & Tasks

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
| **Nav** (boredcat, **repo owner**) | ✅ | **Lead dev / integrator** | Repo settings (public, branch rules, GitHub Pages, collaborator access), project skeleton, GameState, Save, scene flow, village hub, conversations, deduction logic, build + deploy, reviews and merges every PR into `main`, itch.io upload |
| **Vansh** (groot-ji) | ✅ | **Puzzle dev** | Echo Paths engine, 8 core levels (+3 stretch), solver, hint/undo/reset/skip, archive escape |
| **Garv** (Gravity006) | ✅ | **Presentation dev + art pipeline** | Comic renderer (panels, bubbles, SFX, shaders), memory page scene, casebook, aftermath, opening/finale/ending sequences, settings/pause. **Imports all art** from Bhumi and Arya (resize, crop, convert, place). |
| **Bhumi** | ❌ | **Character & key art** | Elias silhouette, young Elias, Mira, Arun, Leela, Nia, title cover, finale/ending panels |
| **Arya** | ❌ | **Environment art, assets, QA & release** | Backgrounds (paint-over), props, asset sourcing + license check, credits list, text proofreading, playtests, itch.io page text |

**Git rules (jam rule: every member commits from their own account):**
- Nav adds Vansh, Garv, Bhumi and Arya as **collaborators (write access)** on `BoredDog/Indiesigners` in Block A.
- Devs: branch `feat/<area>` → PR → Nav reviews and merges. Merge at every sync point; don't sit on a branch longer than ~4 h. Nav's own PRs are reviewed by Garv.
- Bhumi & Arya: upload via GitHub web ("Add file → Upload files") straight into `art/incoming/<your-name>/`. Garv's Claude moves the files into place. This gives you real commits from your own accounts.

### Bhumi & Arya: no-AI workflow
Nothing in Bhumi's or Arya's tasks needs an AI subscription. Everything they do is drawing, picking, checking or playing, using free tools only:

| Need | Free tool |
|---|---|
| Drawing / painting | **Krita** (desktop) or **Photopea** (browser, Photoshop-like) |
| Paint-over / filters / cutting out props | Krita, **GIMP** or Photopea |
| Uploading art | GitHub website upload (no git or terminal needed) |
| Credits list, bug log, text comments | One shared **Google Sheet** (tabs: `Credits`, `Bugs`, `Text fixes`) |
| Playing test builds | The GitHub Pages link Nav shares (any browser) |

**Buddy system:** anything technical goes to a dev, whose Claude handles it.
- **Bhumi ↔ Garv**: Bhumi uploads raw PNG/KRA at any size. Garv's Claude resizes, trims, converts to WebP and places the art in the scenes, then sends Bhumi a screenshot to approve.
- **Arya ↔ Nav**: Arya fills the Sheet. Nav's Claude turns `Credits` into `CREDITS.md` and `Bugs` into GitHub Issues, and applies `Text fixes` to `content/*.json`. Nav's Claude also generates a readable `design/script_review.html` (all game text as a script), so Arya never has to read JSON.
- Neither of them is ever blocked waiting on AI output. If a dev is asleep or busy, they keep drawing or testing from their own list.
- File names: lowercase snake_case (`mira_neutral.png`, `bg_river_road.webp`). Transparent PNG for cutouts, WebP/PNG for backgrounds, master size 1920×1080. Keep Krita `.kra` sources in `art-src/` (proof of authorship).

---

## 6. Repo layout (Nav creates in Block A, by 11:30)
```
/                     package.json, vite.config.ts, tsconfig.json, README.md, LICENSE, CREDITS.md, tasks.md
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

Times are IST. **Sync** = 10-minute call: everyone says done / next / blocked, then Nav merges.
That's ~25 working hours plus one 5-hour sleep. With 30 hours instead of 40, the scope in §0 and §3.3 is already trimmed. Don't add anything back until M2 is green.

### Block A — Mon 10:00 → 13:00 · Setup & foundations
| Who | Tasks |
|---|---|
| All | 10:00 15-min call: confirm Phaser, roles, art style (ink noir), the itch.io page owner. Read §2–3. |
| Nav | **10:00–10:30 owner-only repo setup:** make the repo public, add the 4 collaborators, enable Pages (Actions). **By 11:30:** Node 20+, Vite+Phaser+TS scaffold, 1920×1080 letterboxed canvas, Boot→Title→Village stubs, folder layout, LICENSE, README stub, Pages deploy live, play link shared. Then `GameState` + `SaveManager` (localStorage autosave, Continue/New Game). |
| Vansh | Install Node. Puzzle JSON schema + pure-TS rules engine (move, light/ink, dial, lever/gate first) + BFS solver + unit tests. |
| Garv | Install Node. `PanelRenderer`: 6-panel page from one background + crop rects, grey→colour shader, SFX word pop, bubble component (incl. `[[redacted]]`/`~cracked~`). |
| Bhumi | Style sample: **Elias silhouette (back view + full outline)** + rough **Mira**. Upload by **12:00**. All 5 approve the style at the 12:00 check-in, then it's locked. |
| Arya | Download & license-check: 4 fonts, ambientCG paper + cork, Kenney Cursor/Game Icons/Particle packs, Outlander village pack. Create the shared Google Sheet (`Credits`, `Bugs`, `Text fixes`) and log every asset. |

**Sync 13:00.**

### Block B — Mon 13:00 → 19:00 · Core loop + Mira vertical slice
| Who | Tasks |
|---|---|
| Nav | Have Claude **extract all blueprint text into `content/*.json`** (dialogue, evidence, deductions, threads, captions, UI text, finale frames) + generate `design/script_review.html` for Arya. `StoryData` loader, `DeductionController`. Village hub (hotspots, hover status, NEW EVIDENCE shimmer), Conversation scene with evidence-gated questions. Wire Title → Village → Mira → Memory → Puzzle → Deduction → Aftermath → Village. |
| Vansh | Puzzle **scene**: board over panel art, wisp movement, ink shadows, light rotation, undo/reset/hint/skip, win → returns evidence id. Build + solver-verify `pz_tower`, `pz_sis_1`, `pz_sis_3`. Start sluice/water + crate. |
| Garv | `MemoryPage` scene from data (panel zoom/dim, 5 fragment hotspots, Evidence 0/5, locked fragments launch the puzzle, RECONSTRUCT / LEAVE MEMORY). Deduction screen (pick cards + conclusion, stamps). Aftermath caption page. Write `tools/process-art.ts` and import Bhumi's/Arya's first art. |
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
| Arya | Prop cutouts (pocket watch 2:31, bell rope, silver hairclip, lantern case "E.V."). **Arun page background** (river road, dry channel, sluice), **Leela page background** (lantern workshop + console). Proofread `design/script_review.html` and log fixes in `Text fixes`. Play-test M1 and log bugs in `Bugs`. |

**🎯 Milestone M2 — 02:30: game completable start → credits on the Pages link (placeholder art allowed). Autoplay test green.**

**🛏 Sleep 02:30 → 07:30** (Bhumi/Arya can shift to ~00:30 → 06:30 and start early).

### Block D — Tue 07:30 → 12:00 · Art integration, polish, playtest
| Who | Tasks |
|---|---|
| Nav | Fix the bug list (owns triage), save/continue edge cases, Chrome/Firefox/Edge check, performance (WebP, lazy-load pages). |
| Vansh | Tune puzzle difficulty from the playtests. If time allows, add the stretch puzzles `pz_sis_2`, `pz_bro_1`, `pz_mom_2`. Otherwise help Garv with juice (wisp trail, ink spread on rewind). |
| Garv | All final art in, panel crops, ink/halftone tuning, transitions, title screen idle (rain, flicker, silhouette pass). |
| Bhumi | **Title cover** (Veyra, frozen clock, lantern, distant silhouette), 2 ending panels, art fixes the devs ask for. Upload `.kra` sources to `art-src/`. |
| Arya | Hidden Archive background. **2 external playtesters** (Blueprint T1 log). Final `Credits` check. Itch page text in a Google Doc: description, controls, content warning (R1), AI disclosure (Nav supplies the AI-tool list). |

**🎯 Milestone M3 — 12:00: FEATURE FREEZE.** Only bug fixes after this.

### Block E — Tue 12:00 → 16:00 · Release
| Time | Task | Who |
|---|---|---|
| 12:00–13:30 | Bug fixes only, final autoplay run | Nav, Vansh, Garv |
| 12:00–13:30 | Screenshots (3–5) + cover (Claude captures them), final README (itch link, controls, team, setup) | Garv + Arya |
| 13:30 | Build `dist/`, zip it, **upload to itch.io** (HTML5, 1920×1080, fullscreen button) | Nav |
| 13:45 | Fresh-browser test of the itch page on 3 browsers; fix → re-upload if needed | Everyone |
| **15:00** | **Submit** (form + Discord thread) — 1 h buffer | Nav + Arya |
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
- **Do the technical side of Bhumi's and Arya's work:** process their art (resize/trim/WebP/place), turn their Sheet into `CREDITS.md` + GitHub Issues + text fixes, and generate the readable script for proofreading.
- Watch the repo and pull new commits/uploads locally (already running in Garv's session).

### 🧑 Needs a human
| Task | Who |
|---|---|
| Character and key-panel art (style, silhouette consistency) | Bhumi |
| Background paint-over, art direction checks | Arya (+Bhumi) |
| **License verification on the actual source page** for every downloaded asset | Arya |
| Judging whether puzzles feel fun, if the twist lands, if the text reads well | Everyone, + 2 external testers |
| Creating the itch.io page, owning it, adding collaborators, final upload click (or giving an API key for butler) | Nav (owner) |
| Official form submission + Discord post | Nav / Arya |
| Each person committing from their **own** GitHub account | Everyone |
| Approving Claude's commits/PRs and merges | Nav (repo owner); Garv reviews Nav's PRs |
| Repo settings: public visibility, collaborators, GitHub Pages | Nav (only the owner can do these) |

### 🙋 What we need from you (blocking items — please answer ASAP)
1. **Install Node.js 20 LTS** on all three dev machines (`winget install OpenJS.NodeJS.LTS`) and set git identity (`git config --global user.name/user.email`).
2. **Confirm Phaser 3** as the engine (or say otherwise in the first 30 minutes; switching later is expensive).
3. **Does the jam allow AI-generated assets** (e.g. the Outlander CC0 backgrounds, which are AI-made)? If unsure, Arya paints over them, or we draw backgrounds ourselves.
4. **Who owns the itch.io page?** (Plan assumes Nav.) For automated uploads, create an itch API key and keep it locally — never commit it.
5. **Nav (repo owner):** make `BoredDog/Indiesigners` **public**, add all 4 teammates as collaborators, and enable **GitHub Pages → Source: GitHub Actions** so the team can play test builds.
6. Lock the art style by **Mon 12:00** (Bhumi posts one Elias + one Mira sample; all 5 approve).

---

## 9. Starter prompts for each Claude Code seat

Paste these into Claude Code at the start of each block (each dev in their own clone, on their own branch).

**Nav (repo owner / integrator):**
> Read tasks.md and the blueprint PDF in this repo. Scaffold a Phaser 3 + TypeScript + Vite project per tasks.md §6 (1920×1080 logical canvas, letterboxed). Then build GameState, SaveManager (localStorage autosave) and a StoryData loader, and extract every on-screen text from the blueprint (Parts D, F, G, H, I, J, K, L, M) into content/*.json with the exact IDs (sis_1…mom_3). Add a GitHub Actions workflow that deploys to GitHub Pages.

**Vansh:**
> Read tasks.md §3. Implement the Echo Paths puzzle system in src/puzzle as a pure rules engine (grid, turns, light direction + shadow-casting ink, dial rotation, levers/gates, sluice/water, pushable crates, sentinels with patrols, network nodes, collapsing floor), plus a Phaser Puzzle scene that renders it over panel art with undo/reset/hint/skip. Write tools/solve-puzzles.ts (BFS) and author the 8 core levels in content/puzzles (tasks.md §3.3) so each one is solvable within par+4.

**Garv:**
> Read tasks.md §2 and §4.1. Build the comic presentation layer in src/comic: a page = one background + 6 crop rects + cutout layers, grey→colour and halftone/ink shaders, speech/narration bubbles supporting [[redacted]] and ~cracked~ markup, SFX word pop animation, page-turn and panel-zoom transitions. Then build the Memory, Deduction, Aftermath, Casebook, Opening, Finale and Ending scenes from content/*.json. Also write tools/process-art.ts: it takes raw uploads in art/incoming/, trims, resizes to the 1920×1080 spec, converts to WebP and writes them into public/assets/ with snake_case names.

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
# Nav only (itch.io upload): butler is not on winget; download it from https://itch.io/docs/butler/installing.html
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
**Everyone** (after Nav has added you as a collaborator):
```bash
git clone https://github.com/BoredDog/Indiesigners.git
cd Indiesigners
```
**Nav only, once, in Block A** (creates the Phaser project in the repo root; then commit + push):
```bash
npm create vite@latest phaser-tmp -- --template vanilla-ts
cp -rn phaser-tmp/. . && rm -rf phaser-tmp    # -n = never overwrite our files (tasks.md, .gitignore, tools/)
npm install
npm install phaser
npm install -D @playwright/test tsx
npx playwright install chromium
git checkout -b feat/skeleton
git add -A && git commit -m "Scaffold Phaser + TS + Vite" && git push -u origin feat/skeleton
```
**Vansh and Garv, after Nav's skeleton is merged:**
```bash
git pull
npm install
npx playwright install chromium
git checkout -b feat/puzzle        # Vansh
git checkout -b feat/comic         # Garv
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
1. The Outlander CC0 village backgrounds → https://the-outlander.itch.io/free-cc0-village-backgrounds-pack-24-05-24-09-49-07 → "Download Now" → "No thanks, just take me to the downloads" → upload the backgrounds you pick to `art/incoming/arya/`. Note in the Sheet: **CC0, AI-generated by its creator**.
2. Any extra OpenGameArt asset: CC0 filter only. Copy the license line from the page into the Sheet before using it.
3. For every asset (including the automated ones), open the source page once and confirm the license in the Sheet's `Credits` tab.

### 11.5 Daily commands (devs)
```bash
git pull                     # start of every block
npm run dev                  # play locally
npm run build                # production build into dist/
git add -A && git commit -m "<what changed>" && git push   # then open a PR to main; Nav merges
```
