# Echoes of Sorrow: Script v2 (proposal)

> **Status:** applied to the game on 5 Oct 2026 (chosen by Garv). v2 now lives in `content/*.json`; the readable v2 script is `design/script_review_v2.html`. v1 is kept as the git tag `script-v1` and in `design/script_review.html`.
> **Scope:** the same 3 witnesses, 5 core fragments per page, the same 9 deduction ids, the same 11 puzzle ids, and the same evidence ids wherever possible. New ids are marked **NEW**.
> **Built for:** A1 spirit-light, A2 final accusation and B1 closeness feedback.
> **Legend:** **(changed)** means the line differs from v1. **(NEW)** means v1 has no such line. `=` means the line is unchanged from v1 and is listed only for context.
> Bubbles hold about 10 words or fewer. Narration boxes are always in the **investigator's** voice. Speech bubbles are always the witness.

---

## (a) One-page summary: what changed and why

**1. One canon timeline that every clue agrees with.** In v1, Leela's memory has Elias opening the network in the lantern-house at 2:17, yet Arun sees him carrying Nia *toward* the lantern-house after 2:17. Nothing explains 2:31, who wrote Mira's 2:31 entry while every clock was frozen, or where Nia was. v2 fixes the night as follows:

| Time | What happened | Who remembers it |
|---|---|---|
| Weeks before | Nia Vane (9), Mira's pupil, has a memory-wasting fever and lies in the schoolhouse sickroom, which is Veyra's only clinic. Leela lets her apprentice Elias, Nia's brother, run single-node trials on her. They fail. Leela hides the trial notes under her floor. | Leela P3, Mira P6 |
| 2:10 | The river runs at full current. | Arun P1 (ferry log) |
| **2:17** | In the lantern-house, Elias uses the **apprentice staff** (the network key) to open all 32 anchor nodes. Leela: "Elias, stop." Elias: "Just once." The bell rings by resonance and no hand touches the rope. Every *networked* clock locks at 2:17. Master log: "Anchors bind in fourteen minutes." | Mira P1–P3, Leela P4 |
| 2:17–2:31 | The lantern runs hot. The emergency sluice opens and drains the river into the lantern channels. Elias takes the staff to the schoolhouse, lifts Nia from the sickroom (Mira glimpses a hand at the door) and walks her across the **dry riverbed** (Arun watches, and his hand-wound watch is still ticking). Her hairclip snags on his coat. | Mira P5, Arun P3–P5 |
| **2:31** | Nia is in the chair. All 32 nodes fire at once and the field overloads. Veyra's 32 souls are pulled into the lantern as anchors. Arun's watch stops. Mira's last ledger line is written by her own watch. | Mira P4, Arun P2, Leela P5 |
| about 2:40 | Elias writes the **unsigned case request** in his apprentice hand and slips it into the lining of his lantern case. Then he runs the **self-purge**, keyed to the staff, which removes his name and face from every anchored memory, from the network records, *and from himself*. Leela's paper notes under the floor are offline, so they survive. He walks out of Veyra. | Leela P6, Archive |
| Ten years later | The investigator has carried the cracked teal lantern "as long as I can remember". The network stirs, the lantern lights, he finds the request in its case, and he comes to Veyra. | Opening |

**2. The twist is now fair.** Three independent chains point at the investigator before the reveal, and none of them uses his name:
- **Recognition.** The ghosts know his hand, his coat and his height, but they cannot see his face. The purge took the same face from the Figure.
- **Object.** His lantern case has a scratched patch, and under the spirit-light the Figure's case reads "E.V." in that spot. An Echo Lantern lights for one hand only, and his lantern lights. Nia's hairclip turns up in his coat pocket.
- **Document.** The case request, the apprentice log and the player's own Casebook are in one hand.

The **mechanism** that explains his amnesia (the self-purge) is now a **core** card, not optional.

**3. Early confessions removed.** v1 has the narrator confess mid-game: bro_3 "I was taking someone to the machine", mom_2 "I removed them", mom_3 "what I did". The Casebook shows "The fourth figure was the investigator himself" and "He caused the incident" as soon as those deductions are confirmed, because `CasebookScene` shows `final` on confirm. The Archive says "labels in my handwriting". v2 replaces all of these with deniable beats and adds a fair **misdirection**: Elias "walked out of Veyra", which sets up the A2 near-miss.

**4. Every deduction is provable from its required cards.** In v1, four deductions name a person or motive that no required card shows: sis_3 names Elias, bro_3 names Nia, mom_2 needs the purge, and mom_3 names Elias. v2 rewrites card text and required sets so that the right answer follows from the cards and each wrong option is ruled out by a card.

**5. The three new features carry the story:**
- **A1 spirit-light** carries the hidden layer: residue, "E.V." on every page, the Figure's rim and one light-only optional fragment per page.
- **B1** gives reasoning hints without naming cards.
- **A2** is the point where the player has to say it.

**Card swaps needed in JSON** (everything else is a text change):
- **Leela.** `ev_leela_paper` (self-purge) becomes **core** and moves behind `pz_mom_3`. `ev_leela_whoom` becomes **optional** (plain click). This keeps 5 core cards.
- **New cards.** `ev_leela_rule` (light-only), `ev_archive_record` and `ev_case_request` (Archive, automatic).
- **Light-only.** `ev_mira_erased_entry` and `ev_arun_hiss` become light-only.
- **Required sets.** sis_3, bro_3, mom_2 and mom_3 get new required sets.

---

## (b) Plot-hole table

| # | Issue | Where | Fix in v2 |
|---|---|---|---|
| 1 | **Timeline contradiction.** Elias opens the network *in the lantern-house* at 2:17 (Leela P4) but is seen carrying Nia *toward* the lantern-house after 2:17 (Arun P4). | `memory_text` leela.P4, arun.P4; bro_2 | Opening the link at 2:17 starts a 14-minute anchor bind. He leaves with the staff (the key, so Leela can't shut it down), fetches Nia and returns. All nodes fire at 2:31. The master log (`ev_leela_ash`) states the 14 minutes. |
| 2 | **2:31 means nothing.** Nothing in v1 says what happened at 2:31. | evidence, finale F2 | 2:31 is the overload, the moment the village was taken. Arun's watch stops and Mira writes her last line. `ev_leela_whoom`: "2:31: all 32 nodes fire at once." |
| 3 | **Who wrote Mira's 2:31 entry, and how?** Every clock was frozen at 2:17. | `ev_mira_later_entry`; sis_2 `requiredDescription` calls it "Arun's later timestamp" | Mira wrote it by her own wind-up watch, which is not networked (the same logic as Arun's). New text: "Mira's ledger, by her own watch: '2:31. Nia's cot is empty.'" |
| 4 | **sis_3 names "Elias Vane" but no required card names him.** The erased entry is optional. | deductions sis_3 | Conclusion becomes "Veyra's lantern apprentice…" (no name). The staff card says "apprentice staff". The name arrives via Leela's page or the light-only register entry. |
| 5 | **bro_3 question names Elias** ("Who was Elias carrying…") even if Arun is visited first, and no required card names Nia. Wrong option "one of Mira's pupils" may even be *true*. | deductions bro_3 | Question: "Who was the walker carrying?" `ev_arun_cloth`: "Nia's silver hairclip…" (Arun knows the village children). The pupil option is replaced by a direction near-miss. |
| 6 | **mom_2 concludes a "second pulse to erase his role", but the purge card is optional.** "Leela edited the records" is not ruled out. | mom_2 | `ev_leela_paper` becomes core and required, keyed to the apprentice staff, which only Elias carried. `ev_leela_hum` stays core, so the page keeps 5. |
| 7 | **mom_3 names Elias but requires only whoom + beep.** "Leela connected every node" is not ruled out. | mom_3 | Required: `ev_leela_click` (operator: E. Vane) + `ev_leela_hum` + `ev_leela_beep`. |
| 8 | **sis_1: the rope is untouched on no card.** The wrong option "a villager pulled the rope" can't be ruled out from the cards. | `ev_mira_bell` | "The bell rang at 2:17. The rope never moved." |
| 9 | **Case request never introduced.** The twist's key document first appears in Finale F6, and the `case_request` Casebook card is defined but never drawn. | opening, casebook_notes, CasebookScene | Opening F2 plants it ("found in my lantern case"). The Casebook card is drawn from the start. A2 shows the comparison. |
| 10 | **The self-purge of his own memory is optional** (`ev_leela_paper`), so most players never learn *why* the investigator doesn't remember. That makes the twist unfair. | evidence | Core in v2, plus `ev_archive_record` (purge list includes "the operator's own"), which is shown automatically before A2. |
| 11 | **Narrator confesses mid-game** in deduction reactions. | sis_3, bro_3, mom_1, mom_2, mom_3 `reaction` | Rewritten as third-person or uncanny-but-deniable (section d5). |
| 12 | **Casebook `final` notes leak.** They are shown as soon as the deduction is confirmed: sis_3 "the investigator himself", mom_3 "He caused the incident." | casebook_notes + `CasebookScene.ts:120` | All `final` notes are mid-game safe. Investigator-identity lines move to Finale only (section d7). |
| 13 | **Archive line gives the answer away** right before the accusation: "its labels in my handwriting". | `ArchiveScene.ts` TEXT.console | "The master console was still warm." The handwriting proof belongs to A2. |
| 14 | **Narration POV is mixed.** Some boxes are the witness (Arun P1 "I remember the water…", Leela opening "I remembered teaching them to him"), others the investigator. Leela's opening reads as if the investigator taught Elias. | pages/*.json | All narration boxes are the investigator. Witness memory moves to speech bubbles. |
| 15 | **Hairclip in two places at once.** Leela P3 shows it by the chair *before* the activation, but Arun sees it on the coat after 2:17. | memory_text leela.P3 | Leela P3 shows an empty strapped chair and a clinic card, with no clip. The clip stays on the coat and ends in the investigator's pocket and on his desk. |
| 16 | **River logic conflicts.** bro_1 says the river was "diverted", but Leela's thread reaction says "The river was another anchor." Nothing explains why a sluice would open. | threads th_bro1_mom3; `ev_arun_clank` | The sluice is the lantern's coolant intake ("opens when the lantern runs hot"). Thread reaction: "The lantern drank the river to keep burning." |
| 17 | **Dead reference.** The thread "why" mentions a "photograph" that exists nowhere. | th_mom2_sis3 | Points to the cut register entry instead. |
| 18 | **Weak thread logic.** "Nia's identity explains why the records were erased." | th_bro3_mom2 | It now connects the faceless walker to the purge: "He took himself out of every memory of her." |
| 19 | **Page narration states the deduction answer** before the player deduces it: Arun P4 "The figure moved after 2:17.", P3 "It was diverted.", Mira P4 "The minute was fixed. The night was not." | pages | Softened to observations ("He walked where the river should have been."). |
| 20 | **Opening F5 is heavy-handed** ("At least, that is what I remembered."), which points straight at amnesia in minute one. Leela P4 "I had forgotten the exact shape of the moment" is an explicit tell. | opening F5, leela P4 | "The window seemed to disagree." / "She remembered his words. Not his face." |
| 21 | **Art direction contradicts the story.** It puts spirit-light "handprints on the bell rope", but the rope was never touched. | design/art_direction.md (A1) | Handprint on the *sickroom door frame*. "E.V." scratched on the bell frame relay plate. (Note for Arya/Bhumi; not edited here.) |
| 22 | **"Fourth figure" is never explained**, and the Casebook mentions a "damaged lantern" that appears nowhere. | sis_3 question, casebook sis_3 | "The figure with the staff". The cracked lantern glass is the GLASS! clue, matching art_direction §4.2. |
| 23 | **Mira's first lines are odd.** "Ask what you found." comes before anything is found, and "a hand, but not its face" is ungrammatical. | dialogue mira.first | "Look where I looked." / "I remember a hand. Never the face above it." |
| 24 | **Why only 3 ghosts out of 32 anchors?** Never explained. | — | NEW Leela question: "The rest are sleeping. We saw too much to sleep." |
| 25 | **Nia's fate is never resolved**, and the purpose of the "child's route" echo is unclear. | finale, `ev_arun_whisper` | The echo in the water is what's left of Nia's memory in the spool. The ending gives her one line, "You came back.", which mirrors Mira's first line. |
| 26 | **Why does any evidence survive a purge?** | — | The ghosts keep the *hand*, but not the face. Leela's trial notes and master log were paper under the floor, off the network ("I kept records under the floor"). |
| 27 | **A2 hole: the near-miss is equally consistent with v1 evidence.** If the comparison is only "case request = apprentice log", then "Elias is still out there" fits just as well. | A2 design | The comparison shows **three** documents: request, apprentice log and **the player's own Casebook page** (Caveat hand, per art_direction §4.5). The purge list names "the operator's own" memory. |
| 28 | **A2 hole: brute force.** Five options, no penalty. | A2 | Slot feedback comes first ("2 of 3 witness cards hold"). The conclusion is judged only once all slots hold. The near-miss gets its own pointed hint. |
| 29 | **A2 hole: redundancy.** Finale F6 repeats the handwriting proof A2 just showed. | finale F6 | F6 becomes the *memory* of writing the request (emotional confirmation, not proof). |
| 30 | **Dead-end unlocks.** `loc_tower_basement`, `file_apprentice`, `record_personal` and the others lead nowhere (side scenes were cut), and `unlockText` isn't displayed. | deductions `unlocks` | Harmless today. Either drop them, or map `loc_well_tunnel` to THE RECORD hotspot (the Archive is "beneath the well"). |
| 31 | **`requiredDescription` mismatches** for 8 of 9 deductions (a "river ledger", "apprentice sketch" and "Nia monitor" that don't exist). | deductions | Rewritten to match the actual required cards (section d5). |
| 32 | **Docs disagree about `pz_mom_3`.** PLAN 3.3 says it guards ASH!, evidence.json says WHOOM!. | PLAN.md vs evidence.json | v2: `pz_mom_3` guards **PAPER!** (the self-purge). Puzzle title becomes "PAPER! The Self-Purge". |
| 33 | **Leela's role is unclear.** She is "archivist", yet she wrote the rules and taught Elias. | dialogue leela.role | "Leela, 56 - lantern-keeper and archivist. She taught the apprentice." |
| 34 | **Unused `twistNarration` lines (B4).** They aren't displayed, and some are wrong-voice ("The road should have taken me away…"). | memory_text | Folded into spirit-light first-light lines. The field can be dropped. |

---

## (c) Twist map: every foreshadowing beat in order of play

Strength: **S** = subtle (only noticed on replay), **M** = noticed but deniable, **L** = strong (careful players only, gated behind optional or light-only finds). Witness order is free, so the page beats are written so that any order works. The strongest beats are gated behind late or optional evidence.

| # | When | Beat | Carried by | Str. |
|---|---|---|---|---|
| 1 | Title | Subtitle "The village remembers you" | UI = | S |
| 2 | Opening F2 | "The request was unsigned. I found it in my lantern case." Scratched patch on the case. Three brass cuff buttons. Cracked lantern glass. Silver glint in the coat pocket. | Opening narration (changed) + art | M |
| 3 | Opening F4 | Mira: "You came back." | Opening dialogue = | M |
| 4 | Opening F5 | The window reflection is the Figure sprite. "The window seemed to disagree." | Opening (changed) | S |
| 5 | Leela first talk | "You have grown." | Dialogue = | M |
| 6 | Mira first talk | "I remember a hand. Never the face above it." | Dialogue (changed) | S |
| 7 | Clock tower `pz_tower` | The wisp you steer is *your* lantern's light, and it works in Veyra. Under the light, "E.V." is scratched on the relay plate. | Puzzle + A1 residue | S |
| 8 | Any page, first light | The Figure's rim lights; its lantern has a crack in the glass "like mine" (Mira P5). | A1 first-light narration | M |
| 9 | Mira P5 | "I knew the tools before I knew the face." | Page narration = | M |
| 10 | Mira P6 | Light-only: the scraped register entry "Elias Vane, apprentice". | A1 light-only fragment | S |
| 11 | Arun P5 | "That case. I had seen one like it." Light-only HISS! "E.V." on the case, on the same patch that is scratched on mine. | Narration (changed) + A1 light-only | M |
| 12 | Arun question (needs `ev_mira_staff`) | "He crossed the riverbed with it. Coat like yours." | Dialogue (changed) | M |
| 13 | Arun question (needs `ev_arun_hiss`) | "Yours is scratched in the same spot." | Dialogue (NEW) | L |
| 14 | Leela P2 | Light-only rule two: "A lantern lights for one hand only." | A1 light-only fragment (NEW) | M |
| 15 | Leela question (needs `ev_leela_rule`) | "I wondered who had lit yours." | Dialogue (NEW) | L |
| 16 | Leela P4 / P6 under light | Margin capitals "slanted like mine. Plenty of hands slant." | A1 first-light narration | S |
| 17 | Leela P6 / mom_2 | Self-purge erases "name, face, record". This is the amnesia mechanism, now core. | Fragment + deduction | M |
| 18 | Mira question (needs `ev_leela_paper`) | "Why did you say I came back?" → "Because you did. I can't see your face either." | Dialogue (NEW) | L |
| 19 | Misdirection | Leela: "He walked out of Veyra. Nobody followed." mom_3 reaction and Casebook final: "…walked away. Where to?" | Dialogue / reaction / Casebook | (red herring, true but incomplete) |
| 20 | Thread `th_bro3_mom2` | Leela: "He took himself out of every memory of her." | Aftermath thread | M |
| 21 | Casebook | THE CASE REQUEST card: "Old-fashioned capitals. Lantern-house ink." The Casebook itself is handwritten in Caveat, the same face as the request (art §4.5). | Casebook (NEW display) | S |
| 22 | Archive | "My feet knew the way down. I told myself it was instinct." | Archive = | M |
| 23 | Archive | `ev_archive_record`: the purge list ends "…and the operator's own." | Archive fragment (NEW, automatic) | L |
| 24 | **A2** | Request, apprentice log and *this Casebook*: one hand. "Who caused the incident?" → "The investigator. Me." | Accusation | Proof |
| 25 | Finale F3–F8 | "my sister", Leela: "Elias." The name is spoken for the first time. | Finale (changed) | Reveal |
| 26 | Ending | Nia's echo: "You came back." Hairclip on the desk. Record signed "Elias Vane". | Ending (changed / NEW) | Payoff |

**Can a careful player deduce it before the reveal?**
- **v1.** No, and they don't need to. v1 *tells* them mid-game (beats in 11–13 of the plot-hole table), but never gives a fair chain: the case request is not shown, the investigator is never linked to the lantern or "E.V.", and the purge is optional.
- **v2.**
  - **Base path.** Using core cards only, the player can reach "someone erased himself from Veyra and doesn't know it" (beat 17) plus the recognition beats (3, 5, 6). Beat 23 and A2 close the chain for everyone.
  - **Careful path.** A player using light-only and gated beats (11, 13, 14, 15, 18) can name the culprit early, because three independent chains each say "me". Each beat on its own is deniable.
  - **Misdirection.** Beat 19 gives a reasonable alternative, so the twist is not obvious.

**What v1 gives away too early (removed in v2):** the narrator's "I removed them" (mom_2), "what I did" (mom_3), "I was taking someone to the machine" (bro_3), "I had forgotten what it could cost" (mom_1), "I knew that shape. I just did not know I knew it." (sis_3), Casebook `final` for sis_3/mom_3, Archive "labels in my handwriting", Opening F5 "At least, that is what I remembered.", Leela P4 "I had forgotten the exact shape of the moment", and Leela opening "I remembered teaching them to him".

---

## (d) The full script

### d1. Opening (6 frames)

| F | See (art) | Narration | Dialogue | SFX |
|---|---|---|---|---|
| 1 | = Rainy Veyra road. Typed case file and lantern held from off-screen. | = The file was ten years old. The village was still listed as a disappearance. | — | = WIND... |
| 2 | **(changed)** Gloved hands with three brass cuff buttons set the lantern down. Cracked teal glass. The lantern case has a scratched patch where initials were. A handwritten note (Caveat) is pinned to the typed file. A silver glint shows in the coat pocket. The face is never shown. | **(changed)** The request was unsigned. I found it in my lantern case. | Prop text on the note **(NEW)**: *"Veyra stopped at 2:17. Someone has to remember it."* | = PAPER... |
| 3 | = Clock tower close-up frozen at 2:17. | = Every clock in Veyra stopped at the same minute. | — | = TICK...TICK... |
| 4 | = Mira appears by the schoolhouse. The investigator stays off-frame. | = She looked at me as though she had been waiting for ten years. | = **Mira:** You came back. | = KNOCK! |
| 5 | = The Figure sprite in the window reflection; it doubles for one beat. | **(changed)** I had never been to Veyra. The window seemed to disagree. | — | = GLASS! |
| 6 | = Village hub, three witnesses, clock tower, locked well. | = The case began with a missing village. It would end by asking who had erased it. | — | = BELL! |

- False assumption: = *I came here to investigate a ten-year-old disappearance.*
- First-clue tip: = *Inspect the loud comic words and strange objects to uncover evidence.*

### d2. Village hub and UI

- Status lines, hotspot labels and menu: = (as in `ui_text.json`).
- Village resolved notes: = BELL TOWER "Rung by the lantern network, not a hand." / RIVER PATH "The night went on past 2:17." / LANTERN-HOUSE "The network was opened on purpose."
- **(NEW)** THE RECORD hover, after 9/9: "Under the well. Leela's archive."
- Popup `archiveUnlocked`: = "The hidden archive is open."
- **(NEW)** `spiritLightTip`, the first time a memory page opens. It goes after `evidenceTip`:
  - "Hold L, or tap the lantern, to shine the spirit-light. Some things only show in the light."
  - Button: GOT IT
- **(NEW)** `spiritLightFound`, when a light-only fragment is revealed: "Found in the light: {evidence}"
- Popup `unsupported` is **replaced** by the B1 lines (see d5, "B1 strings").
- Title, summary and other popups: =.

### d3. Witness conversations

#### Mira (Schoolhouse)
- Role **(changed)**: "Mira, 28 - schoolteacher. Nia was her pupil."
- First conversation:
  1. = You came back.
  2. = The bell rang at 2:17.
  3. **(NEW)** Nobody touched the rope.
  4. **(changed)** I remember a hand. Never the face above it.
  5. **(changed)** Look where I looked.
- Button: = ENTER HER MEMORY
- Repeat: = The rope was untouched. Look at the bell.

| Question id | Requires | Player asks | Mira answers |
|---|---|---|---|
| `q_mira_watch` | `ev_arun_tick` | = Arun's watch says 2:31. | **(changed)** My ledger says 2:31 too. Clocks lie. Ink doesn't. |
| `q_mira_figure` | `ev_arun_footsteps` | = Arun saw a figure on the river path. | **(changed)** A coat. A staff. A hand on Nia's door. |
| `q_mira_lantern` | `ev_leela_tink` | = Leela says the lantern records memories. | = Then the bell was not ringing for us. It was listening. |
| `q_mira_name` **(NEW)** | `ev_mira_erased_entry` | Someone scraped a name from your register. | Elias. The lantern apprentice. Nia's brother. |
| `q_mira_you` **(NEW)** | `ev_leela_paper` | Why did you say I came back? | Because you did. I can't see your face either. |

- After the memory: = You found the hand I could not remember.
- Resolution:
  - Direction **(changed)**: "The investigator lays the bell card beside the lantern residue. Mira recognizes the machine's signature and lets her loop go."
  - Unresolved loop **(changed)**: "Cannot say who rang the bell, or whose hand took Nia."
  - Last line: = Now I remember the hand.

#### Arun (River road)
- Role: = "Arun, 24 - ferryman and timeline witness."
- First conversation:
  1. = The river was moving.
  2. **(NEW)** Nobody crosses without my ferry.
  3. = My watch says 2:31.
  4. = Every clock says 2:17.
  5. = Someone carried a child toward the lantern-house.
- Button: = ENTER HIS MEMORY
- Repeat: = Do not trust the clocks.

| Question id | Requires | Player asks | Arun answers |
|---|---|---|---|
| `q_arun_bell` | `ev_mira_bell` | = Mira heard the bell at 2:17. | = Everyone heard it. Nobody pulled it. |
| `q_arun_staff` | `ev_mira_staff` | = Mira saw an apprentice lantern staff. | **(changed)** He crossed the riverbed with it. Coat like yours. |
| `q_arun_nia` | `ev_leela_beep` | = Leela's notes name a child: Nia Vane. | **(changed)** Nia. Silver clip. Her brother kept the lanterns. |
| `q_arun_initials` **(NEW)** | `ev_arun_hiss` | The case was marked E.V. | Scratched deep. Yours is scratched in the same spot. |

- After the memory: = The night kept moving after they stopped it.
- Resolution:
  - Direction **(changed)**: "The 2:31 watch and the hairclip are laid side by side. Arun accepts that the walker carried Nia after the clocks stopped."
  - Unresolved loop: = (unchanged).
  - Last line: = The night did not end at two-seventeen.

#### Leela (Lantern-house)
- Role **(changed)**: "Leela, 56 - lantern-keeper and archivist. She taught the apprentice."
- First conversation:
  1. = You have grown.
  2. = I kept records under the floor.
  3. = The lantern was never a toy.
  4. = If you find the master log, read all of it.
- Button: = ENTER THE ARCHIVE MEMORY
- Repeat: = The apprentice knew the rules.

| Question id | Requires | Player asks | Leela answers |
|---|---|---|---|
| `q_leela_staff` | `ev_mira_staff` | = Mira saw the apprentice lantern staff. | = Only one apprentice ever carried it. |
| `q_leela_sluice` | `ev_arun_clank` | = Arun found a sluice beneath the workshop. | **(changed)** It cools the lantern. I sealed the channels after. |
| `q_leela_residue` | `ev_tower_residue` | = The clock tower carries lantern residue. | = Then the network is still awake. |
| `q_leela_ghosts` **(NEW)** | `ev_leela_hum` | Thirty-two anchors. Why only three of you? | The rest are sleeping. We saw too much to sleep. |
| `q_leela_elias` **(NEW)** | `ev_leela_click` | Where is Elias now? | He walked out of Veyra. Nobody followed. |
| `q_leela_rule` **(NEW)** | `ev_leela_rule` | Your rules say a lantern lights for one hand. | Yes. I wondered who had lit yours. |

- After the memory: = Some truths were buried because I helped bury them.
- Resolution:
  - Direction **(changed)**: "The master log is read aloud. Leela faces the record of the activation, her warning, and the trials she allowed."
  - Unresolved loop **(changed)**: "Cannot accept that she allowed the trials on Nia and failed to stop him."
  - Last line: = I should have stopped him.

### d4. Memory pages

Panel layout and art are unchanged except where the art direction says otherwise.

**A1 spirit-light, per page:** a residue layer, an "E.V." scratch, the Figure's rim, and one light-only optional fragment. The **first-light line** is a narration box that appears the first time the light touches residue on that page.

#### The clock tower (`pz_tower`, optional)
- HUM! `ev_tower_residue` **(changed)**: "Teal residue on the relay plate. It matches the Echo Lantern network."
- Light residue **(NEW)**: "E.V." scratched into the relay plate.
- First-light line **(NEW)**: "My lantern found the residue before I did."

#### Mira: "The Bell at 2:17"
- Opening narration: = The bell stopped the same way every clock did.
- Closing narration: = The evidence was clearer than the memory.

| Panel | Art | Speech (Mira) | Narration (investigator) | Fragment |
|---|---|---|---|---|
| P1 | = Classroom, register, clock | = The lesson ended before the bell. | = The village still looked ordinary before the minute that broke it. | BELL! `ev_mira_bell` core **(changed)**: "The bell rang at 2:17. The rope never moved." |
| P2 | = School clock, wall clock, register | = They all stopped together. | = The clocks agreed too perfectly. | TICK! `ev_mira_clocks` core **(changed)**: "School clock, tower clock, wall clock: all 2:17." |
| P3 *(sis_1)* | = Tower rope untouched; lantern symbol glowing in stone | = Who rang it? | = No hand had pulled the rope. Something else had. | HUM! `ev_mira_resonance` core, `pz_sis_1` **(changed)**: "Lantern resonance hums in the bell frame." |
| P4 *(sis_2)* | **(changed)** Mira writes in the wall ledger by her own wristwatch | = This was written after the bell. | **(changed)** The clocks had stopped. Her pen hadn't. | SCRATCH! `ev_mira_later_entry` core, `pz_sis_2` **(changed)**: "Mira's ledger, by her own watch: '2:31. Nia's cot is empty.'" |
| P5 *(sis_3)* | **(changed)** Sickroom doorway: black residue and the silhouette's hand on the frame, holding a lantern staff with cracked glass | = That hand... | = I knew the tools before I knew the face. | GLASS! `ev_mira_staff` core, `pz_sis_3` **(changed)**: "The hand at Nia's door held an apprentice lantern staff." |
| P6 | = Register with a scraped entry beside Nia's sickroom note | — | **(changed)** Someone had scraped a name from the register: [[Elias Vane]]. | INK! `ev_mira_clinic` optional **(changed)**: "Nia Vane: sickroom. Clinic record, in Mira's register." · PAPER! `ev_mira_erased_entry` **optional, LIGHT-ONLY (changed)**: "Under the light: 'Elias Vane, apprentice.' Scraped out." |

**Spirit-light on Mira's page:**
- A teal handprint on the sickroom door frame (P5).
- "E.V." scratched on the bell frame (P3).
- The Figure's rim (P5) shows a lantern hanging from the staff, with a crack in the glass.
- First-light line **(NEW)**: "Under the light the hand had a lantern. Its glass was cracked like mine."

#### Arun: "The Dry River"
- Opening narration **(changed)**: A ferryman remembers water. Arun remembered it leaving.
- Closing narration **(changed)**: The time on his watch was the time they erased.

| Panel | Art | Speech (Arun) | Narration (investigator) | Fragment |
|---|---|---|---|---|
| P1 | = Riverbank, boat at normal water level | = The river was moving. | **(changed)** The water was the last ordinary thing he remembered. | SPLASH! `ev_arun_splash` core **(changed)**: "Ferry log: full current at 2:10." |
| P2 *(bro_2)* | = Watch ticking while the tower shows 2:17 | = My watch kept going. | = The watch remembered a different night. | TICK! `ev_arun_tick` core, `pz_bro_2` **(changed)**: "Arun's wind-up watch ran past 2:17. It stopped at 2:31." |
| P3 *(bro_1)* | = Open sluice and dry channel | = This was not a drought. | **(changed)** No drought leaves a riverbed this clean. | CLANK! `ev_arun_clank` core, `pz_bro_1` **(changed)**: "Emergency sluice: opens when the lantern runs hot. Drains to the lantern-house." |
| P4 *(bro_3)* | = Silhouette carrying a child across the dry riverbed toward the lantern-house | **(changed)** Someone was carrying Nia. | **(changed)** He walked where the river should have been. | FOOTSTEPS! `ev_arun_footsteps` core **(changed)**: "Footsteps on the dry riverbed, minutes after the bell. Toward the lantern-house." · CLOTH! `ev_arun_cloth` core, `pz_bro_3` **(changed)**: "Nia's silver hairclip, snagged on the walker's coat." |
| P5 | = Close on the figure; lantern case with a scratched patch | = I knew the coat. | **(changed)** That case. I had seen one like it. | HISS! `ev_arun_hiss` **optional, LIGHT-ONLY (changed)**: "Under the light: 'E.V.' scratched into the lantern case." |
| P6 | = River floods the channel; echoes in the water | — | = The same water carried the same memory twice. | WHISPER! `ev_arun_whisper` optional **(changed)**: "An echo in the water: a child's voice, counting lanterns." |

**Spirit-light on Arun's page:**
- Teal footprints across the riverbed (P4).
- The Figure's rim shows a long coat and a high collar (P4).
- "E.V." on the case (P5) is the light-only fragment.
- First-light line **(NEW)**: "Teal footprints. Whoever walked here carried a lit lantern."

#### Leela: "The Lantern Below"
- Opening narration **(changed)**: The lantern had rules. Leela had written every one.
- Closing narration: = The machine did not malfunction. Someone told it to do this.

| Panel | Art | Speech | Narration (investigator) | Fragment |
|---|---|---|---|---|
| P1 *(mom_1)* | = Workbench, diagrams | = **Leela:** It records. It extracts. It can transfer. | = The lantern was never a simple lamp. | TINK! `ev_leela_tink` core, `pz_mom_1` **(changed)**: "Echo Lantern spool: records, extracts and transfers memory." |
| P2 | = Village network blueprint; rules board | = **Leela:** Never connect all nodes at once. | = The warning was written in her own hand. | HUM! `ev_leela_hum` core **(changed)**: "Village map: 32 anchor nodes, one for every soul." · SCRAWL! `ev_leela_rule` **(NEW) optional, LIGHT-ONLY**: "Under the light, rule two: 'A lantern lights for one hand only.'" |
| P3 | **(changed)** An empty child-sized chair with straps; Nia's clinic card clipped to it (no hairclip) | = **Leela:** She was the test. | = Someone had already asked the lantern a question it could not answer. | BEEP! `ev_leela_beep` core **(changed)**: "Nia Vane: memory fading. Single-node trials failed." |
| P4 *(mom_2)* | = Young Elias (silhouette) at the console with the staff, Leela reaching | = **Leela:** ~Elias, stop.~ · **Elias:** ~Just once.~ | **(changed)** She remembered his words. Not his face. | CLICK! `ev_leela_click` core, `pz_mom_2` **(changed)**: "2:17: link opened with the apprentice staff. Operator: E. Vane." |
| P5 *(mom_3)* | = Console overload; every node lit | = **Leela:** Shut it down! | = The lantern did what it had been told to do. | WHOOM! `ev_leela_whoom` **optional now** (plain click, **changed**): "2:31: all 32 nodes fire at once." · CRACK! `ev_leela_crack` optional **(changed)**: "Memory field overload. Not even the river could cool it." |
| P6 | = Archive collapsing; silhouette at the purge control | — | **(changed)** After the overload, someone took his own name out of the evidence. | PAPER! `ev_leela_paper` **core now, `pz_mom_3` (changed)**: "Self-purge, keyed to the apprentice staff: erase the operator's name, face and record." · ASH! `ev_leela_ash` optional **(changed)**: "Master log: 'Anchors bind in fourteen minutes. Then fetch Nia. If it fails, someone has to remember it.'" |

**Spirit-light on Leela's page:**
- Rule two on the board (P2) is the light-only fragment.
- "E.V." carved into the apprentice's stool (P1).
- Pencil margin notes on the blueprint (P2).
- The Figure's rim at the console (P6) reads young and slight.
- First-light line **(NEW)**: "Pencil notes in the margins. The capitals slanted like mine. Plenty of hands slant."
- Puzzle title change: `pz_mom_3` becomes "PAPER! The Self-Purge". The tip is unchanged.

### d5. The 9 deductions

**B1 strings (NEW, `ui_text.deduction`).** They are evaluated in this order and never name a card.

| Case | Line |
|---|---|
| Conclusion right, a required card missing | "The conclusion fits. The evidence isn't complete." |
| Conclusion right, a card that doesn't belong (not required or supporting) | "The conclusion fits. One card doesn't belong." (plural: "Some cards don't belong.") |
| Conclusion right, both missing and extra | "The conclusion fits. The cards need another look." |
| Cards exactly right, conclusion wrong | "The evidence holds. The conclusion doesn't." |
| Conclusion wrong, cards partly right | "{right} of your {picked} cards belong. The conclusion doesn't fit." |
| Nothing right | "None of this points there. Go back to the page." |

Each deduction below adds one **flavour hint** under the B1 line for its most likely wrong option. The hint points at the reasoning, never at a card.

---

**sis_1 · Mira P3**
- Question: **(changed)** Who rang the village bell at 2:17?
- Required: `ev_mira_bell`, `ev_mira_clocks`, `ev_mira_resonance`. Supporting: `ev_tower_residue`.
- Required description **(changed)**: "Rope never moved; every clock at 2:17; lantern resonance."
- Correct **(changed)**: The Echo Lantern network rang it. No hand touched the rope.
- Wrong:
  - = Mira rang the bell herself to warn the village. (Ruled out: the rope never moved.)
  - = A villager pulled the rope and fled before anyone saw. (Ruled out: the rope never moved.)
- Likely miss: the villager option with the right cards. B1: "The evidence holds. The conclusion doesn't." Hint: "*A bell can ring without a rope.*"
- Reaction: = The bell was never the warning. It was the broadcast.

**sis_2 · Mira P4**
- Question: = Why do witness memories show different times?
- Required: `ev_mira_clocks`, `ev_mira_later_entry`. Supporting: `ev_mira_bell`, `ev_arun_tick`.
- Required description **(changed)**: "Networked clocks at 2:17; Mira's own watch at 2:31."
- Correct **(changed)**: 2:17 is when the network froze the clocks. The night went on.
- Wrong:
  - = The clocks were simply broken. Nothing happened after 2:17. (Ruled out: a 2:31 entry exists.)
  - = The later entry is a mistake. Every clock was right. (Ruled out: it was written by a watch that is not on the network.)
- Likely miss: "simply broken". B1 line + hint: "*Broken clocks don't all stop on the same minute.*"
- Reaction: = If time was edited, someone edited it on purpose.

**sis_3 · Mira P5**
- Question: **(changed)** Who is the figure with the staff?
- Required: `ev_mira_staff`, `ev_mira_later_entry`. Supporting: `ev_mira_erased_entry`, `ev_mira_clinic`, `ev_arun_hiss`, `ev_arun_footsteps`.
- Required description **(changed)**: "Apprentice staff at Nia's door; Nia gone by 2:31."
- Correct **(changed)**: Veyra's lantern apprentice. He took Nia from the sickroom.
- Wrong:
  - = The figure was a stranger passing through Veyra. (Ruled out: an *apprentice* staff, and only one apprentice carried one.)
  - **(changed)** The figure was Leela, carrying her own staff. (Ruled out: an apprentice's staff, not the keeper's.)
- Likely miss: "stranger". B1 line + hint: "*Strangers don't carry Veyra's tools.*"
- Reaction **(changed)**: An apprentice's staff, and a name scraped off the page.

**bro_1 · Arun P3**
- Question: = Why did the river disappear?
- Required: `ev_arun_splash`, `ev_arun_clank`. Supporting: `ev_arun_whisper`, `ev_leela_crack`.
- Required description **(changed)**: "Full current at 2:10; sluice drains to the lantern-house."
- Correct **(changed)**: The emergency sluice drained it into the lantern's channels.
- Wrong:
  - = A long drought dried the river weeks before. (Ruled out: full current at 2:10.)
  - = The villagers dammed the river upstream. (Ruled out: the sluice drains *down*, to the lantern-house.)
- Likely miss: "drought". B1 line + hint: "*Droughts take weeks. This took minutes.*"
- Reaction: = The river did not vanish. It was sent somewhere.

**bro_2 · Arun P2**
- Question: = When did Arun actually see the figure?
- Required: `ev_arun_tick`, `ev_arun_footsteps`. Supporting: `ev_mira_clocks`, `ev_mira_bell`, `ev_mira_later_entry`, `ev_arun_clank`.
- Required description **(changed)**: "Watch ran 2:17 to 2:31; footsteps minutes after the bell."
- Correct **(changed)**: Between 2:17 and 2:31. The night went on after the clocks stopped.
- Wrong:
  - = Arun saw the figure before the clocks stopped. (Ruled out: the footsteps came minutes after the 2:17 bell.)
  - = Arun's watch ran fast. He saw nothing after 2:17. (Ruled out: he saw the footsteps after the bell, while his watch was still running past 2:17.)
- Likely miss: "before the clocks stopped". B1 line + hint: "*Which came first, the bell or the footsteps?*"
- Reaction: = The night kept moving after the clocks stopped.

**bro_3 · Arun P4**
- Question: **(changed)** Who was the walker carrying?
- Required: `ev_arun_cloth`, `ev_arun_footsteps`. Supporting: `ev_arun_hiss`, `ev_arun_whisper`, `ev_mira_clinic`, `ev_leela_beep`.
- Required description **(changed)**: "Nia's hairclip on the coat; footsteps toward the lantern-house."
- Correct **(changed)**: Nia Vane, carried across the dry river to the lantern-house.
- Wrong:
  - = A stranger's child, carried away from the flood. (Ruled out: her own hairclip, and there was no flood.)
  - **(changed)** Nia, carried away from the lantern-house to safety. (Ruled out: the footsteps go *toward* it.)
- Likely miss: "away to safety". B1 line + hint: "*Follow the footsteps. Which way were they going?*"
- Reaction **(changed)**: Nobody was rescued that night. She was being taken to the machine.

**mom_1 · Leela P1**
- Question: = What can the Echo Lantern actually do?
- Required: `ev_leela_tink`, `ev_leela_hum`. Supporting: `ev_tower_residue`, `ev_leela_rule`.
- Required description **(changed)**: "Spool records, extracts, transfers; 32 anchor nodes."
- Correct: = It can extract, store and transfer memories, and bind multiple minds as anchors.
- Wrong:
  - = It is only a lamp for reading old records.
  - = It can show memories, but it can never take them. (Ruled out: the spool extracts.)
- Likely miss: "can never take them". B1 line + hint: "*Read what the spool says it does.*"
- Reaction **(changed)**: A lamp that could hold a whole village. And someone lit it.

**mom_2 · Leela P4**
- Question: = Why were the memories altered?
- Required **(changed)**: `ev_leela_click`, `ev_leela_paper`. Supporting: `ev_leela_ash`, `ev_leela_beep`, `ev_mira_erased_entry`, `ev_arun_hiss`.
- Required description **(changed)**: "Purge keyed to the apprentice staff; operator E. Vane."
- Correct **(changed)**: Elias ran a self-purge. His name, face and record were erased from Veyra.
- Wrong:
  - = Ten years of grief wore the memories away. (Ruled out: a purge was run.)
  - **(changed)** Leela edited the records to hide her trials on Nia. (Ruled out: the purge is keyed to the apprentice's staff. Leela's own paper notes survived.)
- Likely miss: "Leela edited the records". B1 line + hint: "*Whose key does the purge answer to?*"
- Reaction **(changed)**: The missing pieces were not missing. Someone removed them. Carefully.

**mom_3 · Leela P5**
- Question: = What caused the mass disappearance?
- Required **(changed)**: `ev_leela_click`, `ev_leela_hum`, `ev_leela_beep`. Supporting: `ev_leela_whoom`, `ev_leela_crack`, `ev_leela_ash`, `ev_leela_rule`, `ev_arun_cloth`.
- Required description **(changed)**: "Operator E. Vane opened 32 nodes; Nia's trials failed."
- Correct **(changed)**: Elias opened every node to save Nia. The village became her anchors.
- Wrong:
  - = A storm struck the tower and overloaded the network. (Ruled out: the link was opened by hand, with a key.)
  - = Leela connected every node and lost control. (Ruled out: the operator was E. Vane.)
- Likely miss: "Leela connected every node". B1 line + hint: "*She wrote the rule. Who broke it?*"
- Reaction **(changed)**: Elias Vane did this. Then he walked out of Veyra.

Unlocks and `unlockText`: = (dead ends; see plot hole 30).

### d6. Threads and Aftermath

- Aftermath title: = Meanwhile...
- Nothing new: = Nothing new. Recheck the evidence.
- Return: = RETURN TO VILLAGE
- Post-memory and last lines: as in d3.

| Thread | Type | Why (Casebook) | Aftermath caption | Reaction |
|---|---|---|---|---|
| `th_sis1_mom1` | CORROBORATES | = The bell's resonance matches the Echo Lantern's network behaviour. | = The bell resonance matches the machine's documented network behavior. | = **Leela:** Then the bell was part of the machine. |
| `th_sis2_bro2` | CONTRADICTS | = The fixed 2:17 clocks conflict with Arun's 2:31 watch. | = The 2:17 freeze conflicts with Arun's 2:31 watch. | = **Arun:** So my watch was right. |
| `th_sis3_bro3` | REVEALS | **(changed)** The apprentice at Nia's door is the walker who carried her. | **(changed)** The same staff crosses the river. | = **Arun:** That was his case. |
| `th_bro1_mom3` | CORROBORATES | **(changed)** The sluice feeds the lantern chamber. The river fed the overload. | = The hidden sluice ends beneath the lantern chamber. | **(changed)** **Leela:** The lantern drank the river to keep burning. |
| `th_bro3_mom2` | REVEALS | **(changed)** The walker has no face because the purge took it. | **(changed)** The faceless walker is the purge's work. | **(changed)** **Leela:** He took himself out of every memory of her. |
| `th_mom2_sis3` | CORROBORATES | **(changed)** The purge explains the name scraped from Mira's register. | = The deleted apprentice entry explains the missing identity. | = **Mira:** The name was removed, not forgotten. |

### d7. Casebook notes

The **first** note is shown when a card is pinned, **after** once a related deduction is known, and **final** on confirm (mid-game). Every `final` note is therefore written to be safe before the twist.

| Card | Title | First | After | Final |
|---|---|---|---|---|
| sis_1 | = Who rang the bell? | **(changed)** The rope never moved. The bell rang anyway. | = Corroborates the lantern network. | = The bell was a broadcast, not a warning. |
| sis_2 | = The stopped clocks | = Every clock stopped at 2:17. | = Contradicts the 2:31 watch. | **(changed)** The clocks froze. The night didn't. |
| sis_3 | **(changed)** The figure with the staff | **(changed)** A staff at Nia's door. A name scraped from the register. | **(changed)** The same tools cross the river. | **(changed)** Veyra's lantern apprentice took Nia. |
| bro_1 | = The dry river | = The river vanished from the surface. | = Corroborates the underground network. | **(changed)** The sluice fed the river to the lantern. |
| bro_2 | = The 2:31 watch | = The watch says 2:31. | = Reveals the post-freeze timeline. | = The village clock cannot be trusted. |
| bro_3 | = The carried child | **(changed)** A silver hairclip on the walker's coat. | = Reveals Nia as the carried child. | **(changed)** The apprentice carried his sister to the machine. |
| mom_1 | = The Echo Lantern | = The Echo Lantern stores and transfers memory. | = Reveals the village-wide anchor mechanism. | = The machine could bind many minds at once. |
| mom_2 | = The altered records | = The records show deliberate edits. | **(changed)** The purge answers to the apprentice staff. | **(changed)** He erased himself. Name, face, record. |
| mom_3 | = The master console | **(changed)** The console logged an activation at 2:17. | = Reveals Elias as the operator. | **(changed)** Elias Vane opened Veyra. Then he walked away. Where to? |
| figure | = THE FIGURE | = Same outline appears near every major clue. | **(changed)** Tools match the apprentice's. So does the coat. | (Finale only) **(changed)** Young Elias. Me. |
| nia | = NIA VANE | **(changed)** Clinic card in the sickroom register. | = Matches the child carried in the figure scene. | (Finale only) = Elias's motive for the forbidden experiment. |
| case_request | = THE CASE REQUEST (**draw this card; NEW display**) | **(changed)** Unsigned. Found in my lantern case. | **(changed)** (after mom_2) Old-fashioned capitals. Lantern-house ink? | (A2 only) **(changed)** Same hand as the apprentice log. Same hand as this casebook. |

The investigator's Casebook notes stay in the Caveat hand, and the request prop uses the same font (art_direction §4.5).

### d8. Hidden Archive (THE RECORD)

- Intro: = My feet knew the way down. I told myself it was instinct.
- Console **(changed)**: Beneath the well, Leela's hidden archive. The master console was still warm.
- Fragment shown automatically **(NEW)**, `ev_archive_record`, SFX THUD!: "Purge list: thirty-two anchors' memories of the operator. And the operator's own."
- Fragment shown automatically **(NEW)**, `ev_case_request`, SFX PAPER...: "The unsigned case request, beside the apprentice log of E. Vane."
- Puzzle `pz_archive`: = title "THE RECORD: Archive Collapse", tip =.
- Collapse: = Then the archive began to fall in on itself.
- Escape button: = ESCAPE WITH THE RECORD
- Escaped: = I got out with the record. The archive did not.
- Next **(changed)**: "One question left." Button: CONTINUE → **A2 Accusation**.

### d9. A2 Final accusation (NEW)

- Screen title: **WHO CAUSED THE INCIDENT?**
- Instruction: "One card from each witness. Then name them."
- Shown automatically (locked card, cannot be removed): **THE ARCHIVE.** Three documents side by side, with the stamp **SAME HAND**:
  - the case request, *"Veyra stopped at 2:17. Someone has to remember it."*;
  - the apprentice log, signed E. Vane;
  - the player's own Casebook page.

| Slot | Prompt | Accepted cards (any one) | Notes |
|---|---|---|---|
| MIRA | "Mira saw..." | `ev_mira_staff` (core), `ev_mira_erased_entry` (light) | The staff is always available. |
| ARUN | "Arun saw..." | `ev_arun_cloth` (core), `ev_arun_hiss` (light) | The hairclip is always available. |
| LEELA | "Leela recorded..." | `ev_leela_click` (core), `ev_leela_paper` (core), `ev_leela_ash`, `ev_leela_rule` | Click and paper are always available. |

Only known evidence is offered, so the screen is solvable with core cards alone.

Conclusions (fixed order; the correct one is not first):
1. Elias Vane, the apprentice, still out there somewhere.
2. Leela, keeper of the lantern records.
3. **The investigator. Me.** (correct)
4. The Echo Lantern itself.
5. No one. It was an accident.

**Feedback, in this order.** There is no penalty and nothing locks.

| Result | Line |
|---|---|
| A slot doesn't hold (any conclusion) | "{n} of 3 witness cards hold. Look again at what they saw." |
| All slots hold, conclusion 1 (near-miss) | "The name is right. Look whose hand wrote these notes." |
| All slots hold, conclusion 2 | "Leela said stop. The log says who didn't." |
| All slots hold, conclusion 4 | "The lantern did what it was told. Who told it?" |
| All slots hold, conclusion 5 | "Accidents don't ignore a warning, then erase themselves." |
| Correct conclusion, a slot wrong | "That is the answer. {n} of 3 cards don't prove it yet." |
| **Correct** | Stamp **CONFIRMED**. Narration: "Every card pointed at the one witness I never questioned." Then **Finale**. |

**Why the near-miss is wrong, from evidence the player has at this point:**
- The request, the log and *my own* Casebook are one hand.
- The purge list includes "the operator's own" memory.
- The witnesses recognise me but cannot see my face.
- (Optional) A lantern lights for one hand, and mine lights. My case is scratched where his reads "E.V."

### d10. Finale (8 frames; the emotional confirmation)

| F | Narration | Shown / notes | SFX |
|---|---|---|---|
| 1 | = I thought I was solving three separate stories. | = Crop labels: MIRA "The bell rang with no hand on the rope." / ARUN "The watch kept going: 2:31." / LEELA "The lantern binds minds as anchors." | = LOW HEARTBEAT... |
| 2 | = The clocks stopped. The night did not. | = The 2:31 hand keeps moving. | = TICK... |
| 3 | **(changed)** I remembered a disappearance. I did not remember my sister. | = Clinic record: "Patient: Nia Vane / Sister of the lantern apprentice / Memory preservation trial: requested." | = PAPER! |
| 4 | **(changed)** I gave the lantern all of Veyra. | = Activation record; lines spread across the map. | = WHOOM! |
| 5 | = The stories were never separate. | = Threads snap onto THE FIGURE. | = THUMP! |
| 6 | **(changed)** I wrote the request before the purge. So someone would remember. | **(changed)** Young hands write the note by teal light and fold it into the lantern-case lining. (Replaces the handwriting proof, which A2 now carries.) | = SCRATCH! |
| 7 | = I knew the shape because I had been carrying it for years. | = The silhouette dissolves into young Elias. **(NEW)** Bubble, **Leela:** "Welcome back, Elias." | = WHOOM! |
| 8 | = I caused the incident. Then I erased the person who caused it. | = The unedited record: experiment, Nia, network, self-purge. Button: CONTINUE. | = SILENCE... CHIME. |

Popup `truthRevealed`: = "The investigator was part of the case."

### d11. Ending, epilogue and summary

- **Truth ending.**
  - Narration: = I came here looking for the person who erased the village. It was me.
  - Panels: = Nia / the overloaded lantern / the vanished village / Elias facing the archive.
  - **(NEW)** Bubble on the Nia panel (her echo): "You came back."
  - **(NEW)** Narration on the closing desk panel (case file, cracked lantern, Nia's hairclip; art B6): "I unkeyed the lantern. The anchors let go."
  - Final state: = no more loops. The silhouette is gone and Elias is fully visible.
- **Epilogue** (100% evidence, which now includes the three light-only fragments).
  - Clock 2:17 → 2:18: =.
  - **(NEW)** Stamp on the archived master log: "CASE CLOSED. Signed: Elias Vane." This is the unsigned request, finally signed.
  - Narration: = The truth was never missing. I was.
- **Summary.**
  - = "Investigation complete."
  - Replay hint **(changed)**: "Some evidence only shows in the light."
  - Buttons: = BACK TO TITLE / PLAY AGAIN.

---

### Appendix: JSON swap checklist

- **`evidence.json`**
  - Text changes as listed in d4.
  - `ev_leela_paper`: `core: true`, `puzzle: "pz_mom_3"`.
  - `ev_leela_whoom`: `core: false`, `puzzle: null`.
  - Add `lightOnly: true` to `ev_mira_erased_entry`, `ev_arun_hiss` and the NEW `ev_leela_rule` (P2, SFX SCRAWL!, optional).
  - NEW `ev_archive_record` and `ev_case_request` (witness `archive`, `core: false`). They are granted automatically in the Archive and don't count toward any page's 0/5 or toward the epilogue.
- **`deductions.json`:** questions, required/supporting sets, conclusions, wrong options and reactions as in d5. Add `closeHint` per deduction.
- **`dialogue.json`:** d3. Six NEW questions: `q_mira_name`, `q_mira_you`, `q_arun_initials`, `q_leela_ghosts`, `q_leela_elias`, `q_leela_rule`. That leaves Mira with 5 questions, Arun with 4 and Leela with 6.
- **`threads.json`:** d6. **`casebook_notes.json`:** d7, plus drawing the `case_request` card in `CasebookScene`.
- **`opening.json` / `finale.json`:** d1, d10, d11. NEW `accusation.json` for d9. **`ui_text.json`:** B1 strings, spirit-light popups, accusation strings.
- **`pages/*.json` + `memory_text.json`:** bubbles and narration from d4, plus `residue` entries (E.V. position, residue strokes, first-light line) per page. `twistNarration` can be dropped.
- **`ArchiveScene.ts` TEXT.console:** d8. **`pz_mom_3.json` title:** "PAPER! The Self-Purge".
- **Art note (do not edit here):** `art_direction.md` spirit-light "handprints on the bell rope" moves to the sickroom door frame (plot hole 21).
