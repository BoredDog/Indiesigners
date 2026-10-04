# ANSWER KEY: dev / tester only (spoilers)

> Generated from `content/*.json` by `npx tsx tools/answer-key.ts`. **Don't edit by hand**: change the content files and re-run.
> Don't ship this to players. It lives in `design/`, which isn't part of the build.

## 1. How the game progresses

| Step | What the player does | What the game does (trigger) |
|---|---|---|
| 1 | Title → **NEW GAME** | Wipes the save, plays the **Opening** (6 frames, SKIP available) → page turn → **Village** |
| 2 | Village: click a witness | **Conversation**: first talk sets the witness to `active`. Extra questions appear when their required evidence is known (§6). |
| 3 | **ENTER HER/HIS/THE ARCHIVE MEMORY** | **Memory** page for that witness (6 panels, grey). |
| 4 | Click SFX words on panels | Evidence added (autosaves). A panel turns colour when all its fragments are found. Fragments with a puzzle (◆) open **Puzzle** first; while the Puzzle scene isn't built, the first click just unlocks them. |
| 5 | **RECONSTRUCT** (shows when a deduction's required evidence is all found) | **Deduction** screen: pick evidence cards + one conclusion → **CONFIRM** (§3 rules). Wrong = "does not support", no penalty. Right = stamp, unlocks, threads → back to Memory. |
| 6 | **LEAVE MEMORY** (shows at 3/3 deductions for this witness) | **Aftermath**: at 3/3 the witness becomes `resolved` (resolution scene + last line), new threads are captioned → Village. |
| 7 | Repeat for all three witnesses, **any order** | Each deduction only needs evidence from its own witness's page, so no visit order can soft-lock. |
| 8 | All **9/9** deductions confirmed | `finale` becomes `ready`; the well turns into **THE RECORD**. |
| 9 | Click **THE RECORD** | **Archive** escape puzzle (when built) → **Finale** (8 frames: the silhouette becomes young Elias) → **Ending**: truth panels, epilogue *only if every optional evidence was found*, summary + credits. |

Any time: **C** = casebook, **Esc** = pause/settings (or close a zoomed panel). Clock tower in the Village = optional tower clue (`pz_tower`).

## 2. Fastest full playthrough (what to click)

### Mira: "The Bell at 2:17"
1. Village → Mira → click through the bubbles → **ENTER HER MEMORY**
2. On the page, click: **BELL!** (P1), **TICK!** (P2), **HUM!** (P3, puzzle `pz_sis_1`), **SCRATCH!** (P4, puzzle `pz_sis_2`), **GLASS!** (P5, puzzle `pz_sis_3`)
   - RECONSTRUCT **sis_1**: select **BELL!** + **TICK!** + **HUM!** → choose *"The Echo Lantern triggered the bell through the underground network. No person rang it."* → CONFIRM
   - RECONSTRUCT **sis_2**: select **TICK!** + **SCRATCH!** → choose *"2:17 is the system freeze. Events continued after the clocks stopped."* → CONFIRM
   - RECONSTRUCT **sis_3**: select **GLASS!** + **SCRATCH!** → choose *"The recurring figure is Elias Vane, the former Veyra apprentice."* → CONFIRM
3. **LEAVE MEMORY** → Aftermath → Village

### Arun: "The Dry River"
1. Village → Arun → click through the bubbles → **ENTER HIS MEMORY**
2. On the page, click: **SPLASH!** (P1), **TICK!** (P2, puzzle `pz_bro_2`), **CLANK!** (P3, puzzle `pz_bro_1`), **FOOTSTEPS!** (P4), **CLOTH!** (P4, puzzle `pz_bro_3`)
   - RECONSTRUCT **bro_1**: select **SPLASH!** + **CLANK!** → choose *"The river was diverted underground during the lantern overload."* → CONFIRM
   - RECONSTRUCT **bro_2**: select **TICK!** + **FOOTSTEPS!** → choose *"The night continued after 2:17, proving the village timeline is false."* → CONFIRM
   - RECONSTRUCT **bro_3**: select **CLOTH!** + **FOOTSTEPS!** → choose *"Nia was the child in Elias's arms. The experiment was meant to preserve her mind."* → CONFIRM
3. **LEAVE MEMORY** → Aftermath → Village

### Leela: "The Lantern Below"
1. Village → Leela → click through the bubbles → **ENTER THE ARCHIVE MEMORY**
2. On the page, click: **TINK!** (P1, puzzle `pz_mom_1`), **HUM!** (P2), **BEEP!** (P3), **CLICK!** (P4, puzzle `pz_mom_2`), **WHOOM!** (P5, puzzle `pz_mom_3`)
   - RECONSTRUCT **mom_1**: select **TINK!** + **HUM!** → choose *"It can extract, store and transfer memories, and bind multiple minds as anchors."* → CONFIRM
   - RECONSTRUCT **mom_2**: select **CLICK!** + **BEEP!** → choose *"Elias triggered a second pulse to erase his role and hide the experiment."* → CONFIRM
   - RECONSTRUCT **mom_3**: select **WHOOM!** + **BEEP!** → choose *"Elias activated the network to save Nia, trapping villagers and creating the ghost loops."* → CONFIRM
3. **LEAVE MEMORY** → Aftermath → Village

Then **THE RECORD** → Finale → Ending. For the epilogue, also find every optional fragment in §4 first.

## 3. Deduction rules (what CONFIRM accepts)

A deduction is confirmed only when **all three** hold (`DeductionController.check`):
1. The **correct conclusion** is chosen (the other two are authored wrong answers).
2. **Every required** evidence card is selected.
3. Every selected card is **required or supporting**. Selecting any other card makes it fail.

The conclusion order on screen is fixed per deduction (rotated by id), so the right answer isn't always first.

### sis_1 · Mira · P3: Who activated the village bell at 2:17?

- **Required:** **BELL!** The village bell rang at 2:17. `ev_mira_bell`; **TICK!** Three clocks stopped at 2:17. `ev_mira_clocks`; **HUM!** Lantern resonance reached the bell tower. `ev_mira_resonance`
- **Supporting (allowed, not needed):** **HUM!** Lantern residue matches the Echo Lantern network. `ev_tower_residue`
- ✅ **Correct:** The Echo Lantern triggered the bell through the underground network. No person rang it.
- ❌ Wrong: Mira rang the bell herself to warn the village.
- ❌ Wrong: A villager pulled the rope and fled before anyone saw.
- **Unlocks:** `loc_tower_basement`, `note_timeline_1` (Unlock clock-tower basement and first corrected timeline note.)
- **Narrator reaction:** "The bell was never the warning. It was the broadcast."
- **Threads:** `sis_1` CORROBORATES `mom_1`

### sis_2 · Mira · P4: Why do witness memories show different times?

- **Required:** **TICK!** Three clocks stopped at 2:17. `ev_mira_clocks`; **SCRATCH!** A later entry reads 2:31. `ev_mira_later_entry`
- **Supporting (allowed, not needed):** **BELL!** The village bell rang at 2:17. `ev_mira_bell`; **TICK!** Pocket watch stopped at 2:31. `ev_arun_tick`
- ✅ **Correct:** 2:17 is the system freeze. Events continued after the clocks stopped.
- ❌ Wrong: The clocks were simply broken. Nothing happened after 2:17.
- ❌ Wrong: The later entry is a mistake. Every clock was right.
- **Unlocks:** `overlay_timeline` (Unlock corrected timeline overlay.)
- **Narrator reaction:** "If time was edited, someone edited it on purpose."
- **Threads:** `sis_2` CONTRADICTS `bro_2`

### sis_3 · Mira · P5: Who is the fourth figure?

- **Required:** **GLASS!** The figure carried the apprentice lantern staff. `ev_mira_staff`; **SCRATCH!** A later entry reads 2:31. `ev_mira_later_entry`
- **Supporting (allowed, not needed):** **PAPER!** Elias Vane, apprentice - entry removed. `ev_mira_erased_entry`; **HISS!** Case initials: E.V. `ev_arun_hiss`; **FOOTSTEPS!** Figure crossed the river path. `ev_arun_footsteps`
- ✅ **Correct:** The recurring figure is Elias Vane, the former Veyra apprentice.
- ❌ Wrong: The figure was a stranger passing through Veyra.
- ❌ Wrong: The figure was Arun, carrying lanterns down to the river.
- **Unlocks:** `file_apprentice` (Unlock sealed apprentice file.)
- **Narrator reaction:** "I knew that shape. I just did not know I knew it."
- **Threads:** `sis_3` REVEALS `bro_3` · `mom_2` CORROBORATES `sis_3`

### bro_1 · Arun · P3: Why did the river disappear?

- **Required:** **SPLASH!** River current recorded before the incident. `ev_arun_splash`; **CLANK!** Emergency sluice opens beneath the workshop. `ev_arun_clank`
- **Supporting (allowed, not needed):** **WHISPER!** Memory echo repeats the child's route. `ev_arun_whisper`
- ✅ **Correct:** The river was diverted underground during the lantern overload.
- ❌ Wrong: A long drought dried the river weeks before.
- ❌ Wrong: The villagers dammed the river upstream.
- **Unlocks:** `loc_well_tunnel` (Unlock well and tunnel route.)
- **Narrator reaction:** "The river did not vanish. It was sent somewhere."
- **Threads:** `bro_1` CORROBORATES `mom_3`

### bro_2 · Arun · P2: When did Arun actually see the figure?

- **Required:** **TICK!** Pocket watch stopped at 2:31. `ev_arun_tick`; **FOOTSTEPS!** Figure crossed the river path. `ev_arun_footsteps`
- **Supporting (allowed, not needed):** **TICK!** Three clocks stopped at 2:17. `ev_mira_clocks`; **BELL!** The village bell rang at 2:17. `ev_mira_bell`; **SCRATCH!** A later entry reads 2:31. `ev_mira_later_entry`
- ✅ **Correct:** The night continued after 2:17, proving the village timeline is false.
- ❌ Wrong: Arun saw the figure before the clocks stopped.
- ❌ Wrong: Arun's watch ran fast. He saw nothing after 2:17.
- **Unlocks:** `timeline_post_217` (Unlock post-2:17 timeline segment.)
- **Narrator reaction:** "The night kept moving after the clocks stopped."
- **Threads:** `sis_2` CONTRADICTS `bro_2`

### bro_3 · Arun · P4: Who was Elias carrying to the lantern chamber?

- **Required:** **CLOTH!** Silver hairclip caught on the coat. `ev_arun_cloth`; **FOOTSTEPS!** Figure crossed the river path. `ev_arun_footsteps`
- **Supporting (allowed, not needed):** **HISS!** Case initials: E.V. `ev_arun_hiss`; **WHISPER!** Memory echo repeats the child's route. `ev_arun_whisper`; **INK!** Nia Vane - clinic record. `ev_mira_clinic`; **BEEP!** Nia Vane - memory preservation notes. `ev_leela_beep`
- ✅ **Correct:** Nia was the child in Elias's arms. The experiment was meant to preserve her mind.
- ❌ Wrong: A stranger's child, carried away from the flood.
- ❌ Wrong: One of Mira's pupils, fleeing the bell.
- **Unlocks:** `record_nia_medical` (Unlock Nia's medical record and motive clue.)
- **Narrator reaction:** "I was not rescuing the village. I was taking someone to the machine."
- **Threads:** `sis_3` REVEALS `bro_3` · `bro_3` REVEALS `mom_2`

### mom_1 · Leela · P1: What can the Echo Lantern actually do?

- **Required:** **TINK!** Echo Lantern memory spool. `ev_leela_tink`; **HUM!** 32 village anchor points. `ev_leela_hum`
- **Supporting (allowed, not needed):** **HUM!** Lantern residue matches the Echo Lantern network. `ev_tower_residue`
- ✅ **Correct:** It can extract, store and transfer memories, and bind multiple minds as anchors.
- ❌ Wrong: It is only a lamp for reading old records.
- ❌ Wrong: It can show memories, but it can never take them.
- **Unlocks:** `diagram_ritual` (Unlock the complete ritual diagram.)
- **Narrator reaction:** "I knew what it did. I had forgotten what it could cost."
- **Threads:** `sis_1` CORROBORATES `mom_1`

### mom_2 · Leela · P4: Why were the memories altered?

- **Required:** **CLICK!** Network link opened by Elias. `ev_leela_click`; **BEEP!** Nia Vane - memory preservation notes. `ev_leela_beep`
- **Supporting (allowed, not needed):** **ASH!** Master log: Elias activated the network. `ev_leela_ash`; **PAPER!** Self-purge sequence. `ev_leela_paper`; **PAPER!** Elias Vane, apprentice - entry removed. `ev_mira_erased_entry`
- ✅ **Correct:** Elias triggered a second pulse to erase his role and hide the experiment.
- ❌ Wrong: Ten years of grief wore the memories away.
- ❌ Wrong: Leela edited the records to hide her own mistake.
- **Unlocks:** `record_personal` (Unlock sealed personal record.)
- **Narrator reaction:** "The missing pieces were not missing. I removed them."
- **Threads:** `bro_3` REVEALS `mom_2` · `mom_2` CORROBORATES `sis_3`

### mom_3 · Leela · P5: What caused the mass disappearance?

- **Required:** **WHOOM!** All village nodes activated. `ev_leela_whoom`; **BEEP!** Nia Vane - memory preservation notes. `ev_leela_beep`
- **Supporting (allowed, not needed):** **CRACK!** Memory field overload. `ev_leela_crack`; **ASH!** Master log: Elias activated the network. `ev_leela_ash`; **HUM!** 32 village anchor points. `ev_leela_hum`
- ✅ **Correct:** Elias activated the network to save Nia, trapping villagers and creating the ghost loops.
- ❌ Wrong: A storm struck the tower and overloaded the network.
- ❌ Wrong: Leela connected every node and lost control.
- **Unlocks:** `archive_reconstruction` (Unlock final archive reconstruction.)
- **Narrator reaction:** "The case stopped being about what happened to them. It became about what I did."
- **Threads:** `bro_1` CORROBORATES `mom_3`

## 4. All evidence

Core = counts toward "Evidence n/5" and can be required. Optional = never required; finding **all** optional evidence unlocks the epilogue.

### Mira

| Panel | SFX | Text | Id | Core | Puzzle | Required by | Supports |
|---|---|---|---|---|---|---|---|
| P1 | BELL! | The village bell rang at 2:17. | `ev_mira_bell` | core | - | sis_1 | sis_2, bro_2 |
| P2 | TICK! | Three clocks stopped at 2:17. | `ev_mira_clocks` | core | - | sis_1, sis_2 | bro_2 |
| P3 | HUM! | Lantern resonance reached the bell tower. | `ev_mira_resonance` | core | pz_sis_1 | sis_1 | - |
| P4 | SCRATCH! | A later entry reads 2:31. | `ev_mira_later_entry` | core | pz_sis_2 | sis_2, sis_3 | bro_2 |
| P5 | GLASS! | The figure carried the apprentice lantern staff. | `ev_mira_staff` | core | pz_sis_3 | sis_3 | - |
| P6 | PAPER! | Elias Vane, apprentice - entry removed. | `ev_mira_erased_entry` | optional | - | - | sis_3, mom_2 |
| P6 | INK! | Nia Vane - clinic record. | `ev_mira_clinic` | optional | - | - | bro_3 |

### Arun

| Panel | SFX | Text | Id | Core | Puzzle | Required by | Supports |
|---|---|---|---|---|---|---|---|
| P1 | SPLASH! | River current recorded before the incident. | `ev_arun_splash` | core | - | bro_1 | - |
| P2 | TICK! | Pocket watch stopped at 2:31. | `ev_arun_tick` | core | pz_bro_2 | bro_2 | sis_2 |
| P3 | CLANK! | Emergency sluice opens beneath the workshop. | `ev_arun_clank` | core | pz_bro_1 | bro_1 | - |
| P4 | FOOTSTEPS! | Figure crossed the river path. | `ev_arun_footsteps` | core | - | bro_2, bro_3 | sis_3 |
| P4 | CLOTH! | Silver hairclip caught on the coat. | `ev_arun_cloth` | core | pz_bro_3 | bro_3 | - |
| P5 | HISS! | Case initials: E.V. | `ev_arun_hiss` | optional | - | - | sis_3, bro_3 |
| P6 | WHISPER! | Memory echo repeats the child's route. | `ev_arun_whisper` | optional | - | - | bro_1, bro_3 |

### Leela

| Panel | SFX | Text | Id | Core | Puzzle | Required by | Supports |
|---|---|---|---|---|---|---|---|
| P1 | TINK! | Echo Lantern memory spool. | `ev_leela_tink` | core | pz_mom_1 | mom_1 | - |
| P2 | HUM! | 32 village anchor points. | `ev_leela_hum` | core | - | mom_1 | mom_3 |
| P3 | BEEP! | Nia Vane - memory preservation notes. | `ev_leela_beep` | core | - | mom_2, mom_3 | bro_3 |
| P4 | CLICK! | Network link opened by Elias. | `ev_leela_click` | core | pz_mom_2 | mom_2 | - |
| P5 | WHOOM! | All village nodes activated. | `ev_leela_whoom` | core | pz_mom_3 | mom_3 | - |
| P5 | CRACK! | Memory field overload. | `ev_leela_crack` | optional | - | - | mom_3 |
| P6 | ASH! | Master log: Elias activated the network. | `ev_leela_ash` | optional | - | - | mom_2, mom_3 |
| P6 | PAPER! | Self-purge sequence. | `ev_leela_paper` | optional | - | - | mom_2 |

### Village clock tower

| Panel | SFX | Text | Id | Core | Puzzle | Required by | Supports |
|---|---|---|---|---|---|---|---|
| - | HUM! | Lantern residue matches the Echo Lantern network. | `ev_tower_residue` | optional | pz_tower | - | sis_1, mom_1 |

## 5. Evidence threads (casebook links)

A thread appears when **both** of its deductions are confirmed (any order), is captioned on the next Aftermath page, and is drawn in the casebook.

| From | Type | To | Why | Aftermath caption | Reaction |
|---|---|---|---|---|---|
| sis_1 | **CORROBORATES** | mom_1 | The bell's resonance matches the Echo Lantern's documented network behavior. | The bell resonance matches the machine's documented network behavior. | Leela: "Then the bell was part of the machine." |
| sis_2 | **CONTRADICTS** | bro_2 | The fixed 2:17 clocks conflict with Arun's 2:31 watch, exposing the false timeline. | The 2:17 freeze conflicts with Arun's 2:31 watch. | Arun: "So my watch was right." |
| sis_3 | **REVEALS** | bro_3 | The same figure and tools connect the apprentice to the person carrying Nia. | The same tools identify the fourth figure. | Arun: "That was his case." |
| bro_1 | **CORROBORATES** | mom_3 | The underground sluice ends beneath the lantern chamber, proving the river was displaced by the network event. | The hidden sluice ends beneath the lantern chamber. | Leela: "The river was another anchor." |
| bro_3 | **REVEALS** | mom_2 | Nia's identity explains why Elias later erased the records: he was protecting the secret experiment and his guilt. | Nia's identity explains why the records were erased. | Leela: "He was trying to save her." |
| mom_2 | **CORROBORATES** | sis_3 | The erased apprentice entry explains why the photograph and witness memories lost Elias's identity. | The deleted apprentice entry explains the missing identity. | Mira: "The name was removed, not forgotten." |

Line styles: CORROBORATES = double line · CONTRADICTS = broken line · REVEALS = arrow.

## 6. Evidence-gated conversation questions

| Witness | Question id | Needs evidence | Player asks | Answer |
|---|---|---|---|---|
| Mira | `q_mira_watch` | `ev_arun_tick` | Arun's watch says 2:31. | The clocks agreed too perfectly. Someone made them agree. |
| Mira | `q_mira_figure` | `ev_arun_footsteps` | Arun saw a figure on the river path. | A coat. A staff. I remember a hand, but not its face. |
| Mira | `q_mira_lantern` | `ev_leela_tink` | Leela says the lantern records memories. | Then the bell was not ringing for us. It was listening. |
| Arun | `q_arun_bell` | `ev_mira_bell` | Mira heard the bell at 2:17. | Everyone heard it. Nobody pulled it. |
| Arun | `q_arun_staff` | `ev_mira_staff` | Mira saw an apprentice lantern staff. | He carried it on the river too. I knew the coat. |
| Arun | `q_arun_nia` | `ev_leela_beep` | Leela's notes name a child: Nia Vane. | Nia. She had a silver clip in her hair. |
| Leela | `q_leela_staff` | `ev_mira_staff` | Mira saw the apprentice lantern staff. | Only one apprentice ever carried it. |
| Leela | `q_leela_sluice` | `ev_arun_clank` | Arun found a sluice beneath the workshop. | The channels run under my floor. I sealed them myself. |
| Leela | `q_leela_residue` | `ev_tower_residue` | The clock tower carries lantern residue. | Then the network is still awake. |

## 7. Dev shortcuts

| URL | Opens |
|---|---|
| `/?scene=Village` | Village hub |
| `/?scene=Memory&witness=arun` | A memory page (mira / arun / leela) |
| `/?scene=Casebook` | Casebook |
| `/?scene=Opening` · `/?scene=Finale` · `/?scene=Ending` | Sequences |
| `/?scene=ComicDemo` | Comic-layer test bench |

Browser console (`window.__echoes`):
```js
const g = __echoes.gameState;
g.newGame();                                  // fresh save
g.addEvidence('ev_mira_bell');                // give a clue
g.confirmDeduction('sis_1');                  // confirm a deduction (applies unlocks + threads)
['sis_1','sis_2','sis_3','bro_1','bro_2','bro_3','mom_1','mom_2','mom_3'].forEach(id => g.confirmDeduction(id)); // jump to THE RECORD
g.snapshot();                                 // inspect the whole save
```
