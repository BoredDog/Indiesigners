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
| 5 | **RECONSTRUCT** (shows when a deduction's required evidence is all found) | **Deduction** screen: pick evidence cards + one conclusion → **CONFIRM** (§3 rules). Wrong = B1 closeness line (+ a hint for the likely miss), no penalty. Right = stamp, unlocks, threads → back to Memory. |
| 6 | **LEAVE MEMORY** (shows at 3/3 deductions for this witness) | **Aftermath**: at 3/3 the witness becomes `resolved` (resolution scene + last line), new threads are captioned → Village. |
| 7 | Repeat for all three witnesses, **any order** | Each deduction only needs evidence from its own witness's page, so no visit order can soft-lock. |
| 8 | All **9/9** deductions confirmed | `finale` becomes `ready`; the well turns into **THE RECORD**. |
| 9 | Click **THE RECORD** | **Archive**: escape puzzle `pz_archive`; the escape grants the two archive documents automatically (§4) → **Accusation** (A2, §7) → **Finale** (8 frames: the silhouette becomes young Elias) → **Ending**: truth panels, epilogue *only if every optional page/tower evidence was found* (incl. the light-only ones), summary + credits. |

Any time: **C** = casebook, **Esc** = pause/settings (or close a zoomed panel), **L** (hold) or the LANTERN button = spirit-light on a memory page (shows residue and light-only clues). Clock tower in the Village = optional tower clue (`pz_tower`).

## 2. Fastest full playthrough (what to click)

### Mira: "The Bell at 2:17"
1. Village → Mira → click through the bubbles → **ENTER HER MEMORY**
2. On the page, click: **BELL!** (P1), **TICK!** (P2), **HUM!** (P3, puzzle `pz_sis_1`), **SCRATCH!** (P4, puzzle `pz_sis_2`), **GLASS!** (P5, puzzle `pz_sis_3`)
   - RECONSTRUCT **sis_1**: select **BELL!** + **TICK!** + **HUM!** → choose *"The Echo Lantern network rang it. No hand touched the rope."* → CONFIRM
   - RECONSTRUCT **sis_2**: select **TICK!** + **SCRATCH!** → choose *"2:17 is when the network froze the clocks. The night went on."* → CONFIRM
   - RECONSTRUCT **sis_3**: select **GLASS!** + **SCRATCH!** → choose *"Veyra's lantern apprentice. He took Nia from the sickroom."* → CONFIRM
3. **LEAVE MEMORY** → Aftermath → Village

### Arun: "The Dry River"
1. Village → Arun → click through the bubbles → **ENTER HIS MEMORY**
2. On the page, click: **SPLASH!** (P1), **TICK!** (P2, puzzle `pz_bro_2`), **CLANK!** (P3, puzzle `pz_bro_1`), **FOOTSTEPS!** (P4), **CLOTH!** (P4, puzzle `pz_bro_3`)
   - RECONSTRUCT **bro_1**: select **SPLASH!** + **CLANK!** → choose *"The emergency sluice drained it into the lantern's channels."* → CONFIRM
   - RECONSTRUCT **bro_2**: select **TICK!** + **FOOTSTEPS!** → choose *"Between 2:17 and 2:31. The night went on after the clocks stopped."* → CONFIRM
   - RECONSTRUCT **bro_3**: select **CLOTH!** + **FOOTSTEPS!** → choose *"Nia Vane, carried across the dry river to the lantern-house."* → CONFIRM
3. **LEAVE MEMORY** → Aftermath → Village

### Leela: "The Lantern Below"
1. Village → Leela → click through the bubbles → **ENTER THE ARCHIVE MEMORY**
2. On the page, click: **TINK!** (P1, puzzle `pz_mom_1`), **HUM!** (P2), **BEEP!** (P3), **CLICK!** (P4, puzzle `pz_mom_2`), **PAPER!** (P6, puzzle `pz_mom_3`)
   - RECONSTRUCT **mom_1**: select **TINK!** + **HUM!** → choose *"It can extract, store and transfer memories, and bind multiple minds as anchors."* → CONFIRM
   - RECONSTRUCT **mom_2**: select **CLICK!** + **PAPER!** → choose *"Elias ran a self-purge. His name, face and record were erased from Veyra."* → CONFIRM
   - RECONSTRUCT **mom_3**: select **CLICK!** + **HUM!** + **BEEP!** → choose *"Elias opened every node to save Nia. The village became her anchors."* → CONFIRM
3. **LEAVE MEMORY** → Aftermath → Village

Then **THE RECORD** → escape → Accusation (§7) → Finale → Ending. For the epilogue, also find every optional fragment in §4 first (light-only ones need the LANTERN).

## 3. Deduction rules (what CONFIRM accepts)

A deduction is confirmed only when **all three** hold (`DeductionController.check`):
1. The **correct conclusion** is chosen (the other two are authored wrong answers).
2. **Every required** evidence card is selected.
3. Every selected card is **required or supporting**. Selecting any other card makes it fail.

The conclusion order on screen is fixed per deduction (rotated by id), so the right answer isn't always first.

### sis_1 · Mira · P3: Who rang the village bell at 2:17?

- **Required:** **BELL!** The bell rang at 2:17. The rope never moved. `ev_mira_bell`; **TICK!** School clock, tower clock, wall clock: all 2:17. `ev_mira_clocks`; **HUM!** Lantern resonance hums in the bell frame. `ev_mira_resonance`
- **Supporting (allowed, not needed):** **HUM!** Teal residue on the relay plate. It matches the Echo Lantern network. `ev_tower_residue`
- ✅ **Correct:** The Echo Lantern network rang it. No hand touched the rope.
- ❌ Wrong: Mira rang the bell herself to warn the village.
- ❌ Wrong: A villager pulled the rope and fled before anyone saw. (B1 hint: *"A bell can ring without a rope."*)
- **Unlocks:** `loc_tower_basement`, `note_timeline_1` (Unlock clock-tower basement and first corrected timeline note.)
- **Narrator reaction:** "The bell was never the warning. It was the broadcast."
- **Threads:** `sis_1` CORROBORATES `mom_1`

### sis_2 · Mira · P4: Why do witness memories show different times?

- **Required:** **TICK!** School clock, tower clock, wall clock: all 2:17. `ev_mira_clocks`; **SCRATCH!** Mira's ledger, by her own watch: '2:31. Nia's cot is empty.' `ev_mira_later_entry`
- **Supporting (allowed, not needed):** **BELL!** The bell rang at 2:17. The rope never moved. `ev_mira_bell`; **TICK!** Arun's wind-up watch ran past 2:17. It stopped at 2:31. `ev_arun_tick`
- ✅ **Correct:** 2:17 is when the network froze the clocks. The night went on.
- ❌ Wrong: The clocks were simply broken. Nothing happened after 2:17. (B1 hint: *"Broken clocks don't all stop on the same minute."*)
- ❌ Wrong: The later entry is a mistake. Every clock was right.
- **Unlocks:** `overlay_timeline` (Unlock corrected timeline overlay.)
- **Narrator reaction:** "If time was edited, someone edited it on purpose."
- **Threads:** `sis_2` CONTRADICTS `bro_2`

### sis_3 · Mira · P5: Who is the figure with the staff?

- **Required:** **GLASS!** The hand at Nia's door held an apprentice lantern staff. `ev_mira_staff`; **SCRATCH!** Mira's ledger, by her own watch: '2:31. Nia's cot is empty.' `ev_mira_later_entry`
- **Supporting (allowed, not needed):** **PAPER!** Under the light: 'Elias Vane, apprentice.' Scraped out. `ev_mira_erased_entry`; **INK!** Nia Vane: sickroom. Clinic record, in Mira's register. `ev_mira_clinic`; **HISS!** Under the light: 'E.V.' scratched into the lantern case. `ev_arun_hiss`; **FOOTSTEPS!** Footsteps on the dry riverbed, minutes after the bell. Toward the lantern-house. `ev_arun_footsteps`
- ✅ **Correct:** Veyra's lantern apprentice. He took Nia from the sickroom.
- ❌ Wrong: The figure was a stranger passing through Veyra. (B1 hint: *"Strangers don't carry Veyra's tools."*)
- ❌ Wrong: The figure was Leela, carrying her own staff.
- **Unlocks:** `file_apprentice` (Unlock sealed apprentice file.)
- **Narrator reaction:** "An apprentice's staff, and a name scraped off the page."
- **Threads:** `sis_3` REVEALS `bro_3` · `mom_2` CORROBORATES `sis_3`

### bro_1 · Arun · P3: Why did the river disappear?

- **Required:** **SPLASH!** Ferry log: full current at 2:10. `ev_arun_splash`; **CLANK!** Emergency sluice: opens when the lantern runs hot. Drains to the lantern-house. `ev_arun_clank`
- **Supporting (allowed, not needed):** **WHISPER!** An echo in the water: a child's voice, counting lanterns. `ev_arun_whisper`; **CRACK!** Memory field overload. Not even the river could cool it. `ev_leela_crack`
- ✅ **Correct:** The emergency sluice drained it into the lantern's channels.
- ❌ Wrong: A long drought dried the river weeks before. (B1 hint: *"Droughts take weeks. This took minutes."*)
- ❌ Wrong: The villagers dammed the river upstream.
- **Unlocks:** `loc_well_tunnel` (Unlock well and tunnel route.)
- **Narrator reaction:** "The river did not vanish. It was sent somewhere."
- **Threads:** `bro_1` CORROBORATES `mom_3`

### bro_2 · Arun · P2: When did Arun actually see the figure?

- **Required:** **TICK!** Arun's wind-up watch ran past 2:17. It stopped at 2:31. `ev_arun_tick`; **FOOTSTEPS!** Footsteps on the dry riverbed, minutes after the bell. Toward the lantern-house. `ev_arun_footsteps`
- **Supporting (allowed, not needed):** **TICK!** School clock, tower clock, wall clock: all 2:17. `ev_mira_clocks`; **BELL!** The bell rang at 2:17. The rope never moved. `ev_mira_bell`; **SCRATCH!** Mira's ledger, by her own watch: '2:31. Nia's cot is empty.' `ev_mira_later_entry`; **CLANK!** Emergency sluice: opens when the lantern runs hot. Drains to the lantern-house. `ev_arun_clank`
- ✅ **Correct:** Between 2:17 and 2:31. The night went on after the clocks stopped.
- ❌ Wrong: Arun saw the figure before the clocks stopped. (B1 hint: *"Which came first, the bell or the footsteps?"*)
- ❌ Wrong: Arun's watch ran fast. He saw nothing after 2:17.
- **Unlocks:** `timeline_post_217` (Unlock post-2:17 timeline segment.)
- **Narrator reaction:** "The night kept moving after the clocks stopped."
- **Threads:** `sis_2` CONTRADICTS `bro_2`

### bro_3 · Arun · P4: Who was the walker carrying?

- **Required:** **CLOTH!** Nia's silver hairclip, snagged on the walker's coat. `ev_arun_cloth`; **FOOTSTEPS!** Footsteps on the dry riverbed, minutes after the bell. Toward the lantern-house. `ev_arun_footsteps`
- **Supporting (allowed, not needed):** **HISS!** Under the light: 'E.V.' scratched into the lantern case. `ev_arun_hiss`; **WHISPER!** An echo in the water: a child's voice, counting lanterns. `ev_arun_whisper`; **INK!** Nia Vane: sickroom. Clinic record, in Mira's register. `ev_mira_clinic`; **BEEP!** Nia Vane: memory fading. Single-node trials failed. `ev_leela_beep`
- ✅ **Correct:** Nia Vane, carried across the dry river to the lantern-house.
- ❌ Wrong: A stranger's child, carried away from the flood.
- ❌ Wrong: Nia, carried away from the lantern-house to safety. (B1 hint: *"Follow the footsteps. Which way were they going?"*)
- **Unlocks:** `record_nia_medical` (Unlock Nia's medical record and motive clue.)
- **Narrator reaction:** "Nobody was rescued that night. She was being taken to the machine."
- **Threads:** `sis_3` REVEALS `bro_3` · `bro_3` REVEALS `mom_2`

### mom_1 · Leela · P1: What can the Echo Lantern actually do?

- **Required:** **TINK!** Echo Lantern spool: records, extracts and transfers memory. `ev_leela_tink`; **HUM!** Village map: 32 anchor nodes, one for every soul. `ev_leela_hum`
- **Supporting (allowed, not needed):** **HUM!** Teal residue on the relay plate. It matches the Echo Lantern network. `ev_tower_residue`; **SCRAWL!** Under the light, rule two: 'A lantern lights for one hand only.' `ev_leela_rule`
- ✅ **Correct:** It can extract, store and transfer memories, and bind multiple minds as anchors.
- ❌ Wrong: It is only a lamp for reading old records.
- ❌ Wrong: It can show memories, but it can never take them. (B1 hint: *"Read what the spool says it does."*)
- **Unlocks:** `diagram_ritual` (Unlock the complete ritual diagram.)
- **Narrator reaction:** "A lamp that could hold a whole village. And someone lit it."
- **Threads:** `sis_1` CORROBORATES `mom_1`

### mom_2 · Leela · P4: Why were the memories altered?

- **Required:** **CLICK!** 2:17: link opened with the apprentice staff. Operator: E. Vane. `ev_leela_click`; **PAPER!** Self-purge, keyed to the apprentice staff: erase the operator's name, face and record. `ev_leela_paper`
- **Supporting (allowed, not needed):** **ASH!** Master log: 'Anchors bind in fourteen minutes. Then fetch Nia. If it fails, someone has to remember it.' `ev_leela_ash`; **BEEP!** Nia Vane: memory fading. Single-node trials failed. `ev_leela_beep`; **PAPER!** Under the light: 'Elias Vane, apprentice.' Scraped out. `ev_mira_erased_entry`; **HISS!** Under the light: 'E.V.' scratched into the lantern case. `ev_arun_hiss`
- ✅ **Correct:** Elias ran a self-purge. His name, face and record were erased from Veyra.
- ❌ Wrong: Ten years of grief wore the memories away.
- ❌ Wrong: Leela edited the records to hide her trials on Nia. (B1 hint: *"Whose key does the purge answer to?"*)
- **Unlocks:** `record_personal` (Unlock sealed personal record.)
- **Narrator reaction:** "The missing pieces were not missing. Someone removed them. Carefully."
- **Threads:** `bro_3` REVEALS `mom_2` · `mom_2` CORROBORATES `sis_3`

### mom_3 · Leela · P5: What caused the mass disappearance?

- **Required:** **CLICK!** 2:17: link opened with the apprentice staff. Operator: E. Vane. `ev_leela_click`; **HUM!** Village map: 32 anchor nodes, one for every soul. `ev_leela_hum`; **BEEP!** Nia Vane: memory fading. Single-node trials failed. `ev_leela_beep`
- **Supporting (allowed, not needed):** **WHOOM!** 2:31: all 32 nodes fire at once. `ev_leela_whoom`; **CRACK!** Memory field overload. Not even the river could cool it. `ev_leela_crack`; **ASH!** Master log: 'Anchors bind in fourteen minutes. Then fetch Nia. If it fails, someone has to remember it.' `ev_leela_ash`; **SCRAWL!** Under the light, rule two: 'A lantern lights for one hand only.' `ev_leela_rule`; **CLOTH!** Nia's silver hairclip, snagged on the walker's coat. `ev_arun_cloth`
- ✅ **Correct:** Elias opened every node to save Nia. The village became her anchors.
- ❌ Wrong: A storm struck the tower and overloaded the network.
- ❌ Wrong: Leela connected every node and lost control. (B1 hint: *"She wrote the rule. Who broke it?"*)
- **Unlocks:** `archive_reconstruction` (Unlock final archive reconstruction.)
- **Narrator reaction:** "Elias Vane did this. Then he walked out of Veyra."
- **Threads:** `bro_1` CORROBORATES `mom_3`

## 4. All evidence

Core = counts toward "Evidence n/5" and can be required. Optional = never required; finding **all** optional page and tower evidence unlocks the epilogue. **Light-only** = invisible until the spirit-light (LANTERN / hold L) passes over it. Archive evidence is granted automatically on the escape and never counts.

### Mira

| Panel | SFX | Text | Id | Core | Puzzle | Required by | Supports |
|---|---|---|---|---|---|---|---|
| P1 | BELL! | The bell rang at 2:17. The rope never moved. | `ev_mira_bell` | core | - | sis_1 | sis_2, bro_2 |
| P2 | TICK! | School clock, tower clock, wall clock: all 2:17. | `ev_mira_clocks` | core | - | sis_1, sis_2 | bro_2 |
| P3 | HUM! | Lantern resonance hums in the bell frame. | `ev_mira_resonance` | core | pz_sis_1 | sis_1 | - |
| P4 | SCRATCH! | Mira's ledger, by her own watch: '2:31. Nia's cot is empty.' | `ev_mira_later_entry` | core | pz_sis_2 | sis_2, sis_3 | bro_2 |
| P5 | GLASS! | The hand at Nia's door held an apprentice lantern staff. | `ev_mira_staff` | core | pz_sis_3 | sis_3 | - |
| P6 | PAPER! | Under the light: 'Elias Vane, apprentice.' Scraped out. | `ev_mira_erased_entry` | optional, light-only | - | - | sis_3, mom_2 |
| P6 | INK! | Nia Vane: sickroom. Clinic record, in Mira's register. | `ev_mira_clinic` | optional | - | - | sis_3, bro_3 |

### Arun

| Panel | SFX | Text | Id | Core | Puzzle | Required by | Supports |
|---|---|---|---|---|---|---|---|
| P1 | SPLASH! | Ferry log: full current at 2:10. | `ev_arun_splash` | core | - | bro_1 | - |
| P2 | TICK! | Arun's wind-up watch ran past 2:17. It stopped at 2:31. | `ev_arun_tick` | core | pz_bro_2 | bro_2 | sis_2 |
| P3 | CLANK! | Emergency sluice: opens when the lantern runs hot. Drains to the lantern-house. | `ev_arun_clank` | core | pz_bro_1 | bro_1 | bro_2 |
| P4 | FOOTSTEPS! | Footsteps on the dry riverbed, minutes after the bell. Toward the lantern-house. | `ev_arun_footsteps` | core | - | bro_2, bro_3 | sis_3 |
| P4 | CLOTH! | Nia's silver hairclip, snagged on the walker's coat. | `ev_arun_cloth` | core | pz_bro_3 | bro_3 | mom_3 |
| P5 | HISS! | Under the light: 'E.V.' scratched into the lantern case. | `ev_arun_hiss` | optional, light-only | - | - | sis_3, bro_3, mom_2 |
| P6 | WHISPER! | An echo in the water: a child's voice, counting lanterns. | `ev_arun_whisper` | optional | - | - | bro_1, bro_3 |

### Leela

| Panel | SFX | Text | Id | Core | Puzzle | Required by | Supports |
|---|---|---|---|---|---|---|---|
| P1 | TINK! | Echo Lantern spool: records, extracts and transfers memory. | `ev_leela_tink` | core | pz_mom_1 | mom_1 | - |
| P2 | HUM! | Village map: 32 anchor nodes, one for every soul. | `ev_leela_hum` | core | - | mom_1, mom_3 | - |
| P2 | SCRAWL! | Under the light, rule two: 'A lantern lights for one hand only.' | `ev_leela_rule` | optional, light-only | - | - | mom_1, mom_3 |
| P3 | BEEP! | Nia Vane: memory fading. Single-node trials failed. | `ev_leela_beep` | core | - | mom_3 | bro_3, mom_2 |
| P4 | CLICK! | 2:17: link opened with the apprentice staff. Operator: E. Vane. | `ev_leela_click` | core | pz_mom_2 | mom_2, mom_3 | - |
| P5 | WHOOM! | 2:31: all 32 nodes fire at once. | `ev_leela_whoom` | optional | - | - | mom_3 |
| P5 | CRACK! | Memory field overload. Not even the river could cool it. | `ev_leela_crack` | optional | - | - | bro_1, mom_3 |
| P6 | ASH! | Master log: 'Anchors bind in fourteen minutes. Then fetch Nia. If it fails, someone has to remember it.' | `ev_leela_ash` | optional | - | - | mom_2, mom_3 |
| P6 | PAPER! | Self-purge, keyed to the apprentice staff: erase the operator's name, face and record. | `ev_leela_paper` | core | pz_mom_3 | mom_2 | - |

### Village clock tower

| Panel | SFX | Text | Id | Core | Puzzle | Required by | Supports |
|---|---|---|---|---|---|---|---|
| - | HUM! | Teal residue on the relay plate. It matches the Echo Lantern network. | `ev_tower_residue` | optional | pz_tower | - | sis_1, mom_1 |

### Hidden Archive (automatic)

| Panel | SFX | Text | Id | Core | Puzzle | Required by | Supports |
|---|---|---|---|---|---|---|---|
| - | THUD! | Purge list: thirty-two anchors' memories of the operator. And the operator's own. | `ev_archive_record` | automatic | - | - | - |
| - | PAPER... | The unsigned case request, beside the apprentice log of E. Vane. | `ev_case_request` | automatic | - | - | - |

## 5. Evidence threads (casebook links)

A thread appears when **both** of its deductions are confirmed (any order), is captioned on the next Aftermath page, and is drawn in the casebook.

| From | Type | To | Why | Aftermath caption | Reaction |
|---|---|---|---|---|---|
| sis_1 | **CORROBORATES** | mom_1 | The bell's resonance matches the Echo Lantern's network behaviour. | The bell resonance matches the machine's documented network behavior. | Leela: "Then the bell was part of the machine." |
| sis_2 | **CONTRADICTS** | bro_2 | The fixed 2:17 clocks conflict with Arun's 2:31 watch. | The 2:17 freeze conflicts with Arun's 2:31 watch. | Arun: "So my watch was right." |
| sis_3 | **REVEALS** | bro_3 | The apprentice at Nia's door is the walker who carried her. | The same staff crosses the river. | Arun: "That was his case." |
| bro_1 | **CORROBORATES** | mom_3 | The sluice feeds the lantern chamber. The river fed the overload. | The hidden sluice ends beneath the lantern chamber. | Leela: "The lantern drank the river to keep burning." |
| bro_3 | **REVEALS** | mom_2 | The walker has no face because the purge took it. | The faceless walker is the purge's work. | Leela: "He took himself out of every memory of her." |
| mom_2 | **CORROBORATES** | sis_3 | The purge explains the name scraped from Mira's register. | The deleted apprentice entry explains the missing identity. | Mira: "The name was removed, not forgotten." |

Line styles: CORROBORATES = double line · CONTRADICTS = broken line · REVEALS = arrow.

## 6. Evidence-gated conversation questions

| Witness | Question id | Needs evidence | Player asks | Answer |
|---|---|---|---|---|
| Mira | `q_mira_watch` | `ev_arun_tick` | Arun's watch says 2:31. | My ledger says 2:31 too. Clocks lie. Ink doesn't. |
| Mira | `q_mira_figure` | `ev_arun_footsteps` | Arun saw a figure on the river path. | A coat. A staff. A hand on Nia's door. |
| Mira | `q_mira_lantern` | `ev_leela_tink` | Leela says the lantern records memories. | Then the bell was not ringing for us. It was listening. |
| Mira | `q_mira_name` | `ev_mira_erased_entry` | Someone scraped a name from your register. | Elias. The lantern apprentice. Nia's brother. |
| Mira | `q_mira_you` | `ev_leela_paper` | Why did you say I came back? | Because you did. I can't see your face either. |
| Arun | `q_arun_bell` | `ev_mira_bell` | Mira heard the bell at 2:17. | Everyone heard it. Nobody pulled it. |
| Arun | `q_arun_staff` | `ev_mira_staff` | Mira saw an apprentice lantern staff. | He crossed the riverbed with it. Coat like yours. |
| Arun | `q_arun_nia` | `ev_leela_beep` | Leela's notes name a child: Nia Vane. | Nia. Silver clip. Her brother kept the lanterns. |
| Arun | `q_arun_initials` | `ev_arun_hiss` | The case was marked E.V. | Scratched deep. Yours is scratched in the same spot. |
| Leela | `q_leela_staff` | `ev_mira_staff` | Mira saw the apprentice lantern staff. | Only one apprentice ever carried it. |
| Leela | `q_leela_sluice` | `ev_arun_clank` | Arun found a sluice beneath the workshop. | It cools the lantern. I sealed the channels after. |
| Leela | `q_leela_residue` | `ev_tower_residue` | The clock tower carries lantern residue. | Then the network is still awake. |
| Leela | `q_leela_ghosts` | `ev_leela_hum` | Thirty-two anchors. Why only three of you? | The rest are sleeping. We saw too much to sleep. |
| Leela | `q_leela_elias` | `ev_leela_click` | Where is Elias now? | He walked out of Veyra. Nobody followed. |
| Leela | `q_leela_rule` | `ev_leela_rule` | Your rules say a lantern lights for one hand. | Yes. I wondered who had lit yours. |

## 7. A2 final accusation (after the Archive escape)

Pick one card per witness and a conclusion, then **ACCUSE**. Slots are judged first ("{n} of 3 witness cards hold"); the conclusion is judged only once all three hold. No penalty.

- **MIRA SAW...** accepts any of: **GLASS!** The hand at Nia's door held an apprentice lantern staff. `ev_mira_staff`; **PAPER!** Under the light: 'Elias Vane, apprentice.' Scraped out. `ev_mira_erased_entry`
- **ARUN SAW...** accepts any of: **CLOTH!** Nia's silver hairclip, snagged on the walker's coat. `ev_arun_cloth`; **HISS!** Under the light: 'E.V.' scratched into the lantern case. `ev_arun_hiss`
- **LEELA RECORDED...** accepts any of: **CLICK!** 2:17: link opened with the apprentice staff. Operator: E. Vane. `ev_leela_click`; **PAPER!** Self-purge, keyed to the apprentice staff: erase the operator's name, face and record. `ev_leela_paper`; **ASH!** Master log: 'Anchors bind in fourteen minutes. Then fetch Nia. If it fails, someone has to remember it.' `ev_leela_ash`; **SCRAWL!** Under the light, rule two: 'A lantern lights for one hand only.' `ev_leela_rule`

- ❌ Elias Vane, the apprentice, still out there somewhere. → "The name is right. Look whose hand wrote these notes."
- ❌ Leela, keeper of the lantern records. → "Leela said stop. The log says who didn't."
- ✅ **Correct:** The investigator. Me. → "Every card pointed at the one witness I never questioned."
- ❌ The Echo Lantern itself. → "The lantern did what it was told. Who told it?"
- ❌ No one. It was an accident. → "Accidents don't ignore a warning, then erase themselves."

## 8. Dev shortcuts

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
