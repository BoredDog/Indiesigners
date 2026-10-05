## @Bhumi-Chaudhari: what we're making, what's already drawn, and your tasks

From the design lead (Vansh's design chat). Read this once. Your editor setup and export steps are in the comment above and haven't changed.

### 1. The look in one paragraph
Echoes of Sorrow is now a **dark, grimy, 2D pixel-art mystery**. Think a quiet horror-comic drawn on a 480×270 canvas. Everything is muted (soot, mud, sickly olive, bone, dried blood), shaded with hard steps, with thick dark outlines. **Only two things are allowed to glow:**
- **Amber** is the living present. In the present day it appears only on **Elias's scarf**; in memories it is also lamplight.
- **Teal** is the **Echo Lantern** and anything it touches: memories, hidden symbols, the network.

The twist lives in the colours: **Elias is the only character who carries both.** So never put amber or teal on anyone else. Light, fog, rain, glitches and the ghost wash are all **done in code**, which is why you paint everything flat and unlit.

### 2. How the story maps to screens
| # | Scene | What the player sees | Draft folder | Owner |
|---|---|---|---|---|
| 1 | Entering Veyra | Elias walks in from behind, lantern on a staff, face hidden | `scene1/` | Vansh |
| 2 | Clock tower | 2:17, frozen second hand, DONG DONG, crows | `scene2/` | Vansh |
| 3 | Toy + window | toy rolls and stops; a figure in a window, gone | `scene3/` | draft ships |
| 4 | Ten years ago | 5 sepia silhouette panels, ending on CASE CLOSED | `scene4/` | **you, if time** |
| 5 | Village hub | square with the 7 clues, residue symbols | `scene5/` | Vansh |
| 6 | Abandoned room | pale woman in a rocking chair; burned photo ×2 | `scene6/` | Vansh |
| 7 | Ivy's memory | schoolhouse at night, lamp, crowd running, 2:17 glitch | `scene7/` | **you** |
| 8 | Luke's memory | river, boat push, water runs backwards, watch 2:31 vs tower 2:17 | `scene8/` | **you** |
| 9 | Hanna's memory | candlelit archive, shelf door, teal chamber, "Stop." | `scene9/` | **you** |
| 10 | Under Veyra | stone tileset, tunnels, lantern archive, well lock | `scene10/` | Vansh |
| 11 | The fourth person | bedside, the network, the sister's ghost, Elias erases himself, alone | `scene11/` | **you** |

**Every scene already has an approved draft.** Each draft is a full set of PNG layers plus a live HTML page in `design/pixel/`. You polish, you don't redraw. Whatever isn't polished by ~07:50 ships as the draft.

**Live references** (checkout `design/pixel-art`, then open in a browser; GitHub won't render them):
`chars_cast.html` · `scene1_entering_veyra.html` · `scene2_clock_tower.html` · `scene3_4_ten_years_ago.html` · `scene5_village_square.html` · `scene6_abandoned_room.html` · `scene7_ivy_memory.html` · `scene8_luke_memory.html` · `scene9_hanna_memory.html` · `scene10_under_veyra.html` · `scene11_fourth_person.html`

### 3. Your cast
| Character | Read at a glance | Accent |
|---|---|---|
| **Hanna** | archivist, 50s: grey bun with a white streak, round spectacles, high collar, mud shawl, small dried-blood brooch, stern mouth | violet |
| **Ivy** | teacher, 20s: dark bob + silver clip, big worried eyes, chalk on her cheek, dusty-blue cardigan, dried-blood skirt | dusty blue |
| **Luke** | boatman, 30s: flat cap, short beard, heavy brows, olive oilskin, roll-neck, watch chain | olive |
| **Sister** | about 9, ill: long braid, bone nightgown, dried-blood blanket, grey under the eyes | dried blood |
| **Unknown woman** | Hanna's exact outline, colourless (bone / mist only) | none |
| **Young Elias** | ~19: messy dark hair, pale tired face, hat, long soot coat, amber scarf, lantern staff. **One teal pixel in each eye** (the lantern's reflection) | amber + teal |

### 4. Your tasks (in this order; tick them here as you go)
Each task: paint over the named drafts, keep **file name + canvas size + outline/position**, export to `art/incoming/bhumi/`, post a screenshot here.

- [ ] **B-1 · Hanna portrait** (~40 min) · `chars/portrait_hanna.png` 64×64
  - Rounder spectacles; a softer bun (the draft is too pointed); let more violet show at the collar and dress; a stern, tired mouth.
  - **Done when:** she reads as Hanna at conversation size, and Vansh can make the unknown woman from her.
- [ ] **B-2 · Ivy + Luke portraits** (~50 min) · `portrait_ivy.png`, `portrait_luke.png`
  - Ivy: refine the eyes and lashes, keep the chalk smudge and the silver clip.
  - Luke: his eyes currently read like glasses, so fix that. Add beard texture and keep the watch chain, which is a clue.
- [ ] **B-3 · Bodies** (~50 min) · `char_hanna_body`, `char_unknown_woman`, `char_sister`, `char_ivy_body`, `char_luke_body`, `char_luke_push` (32×58, feet on y=56)
  - Faces only need 2–3 px. Give the sister her braid.
  - Unknown woman = your final Hanna outline, recoloured to bone/mist.
- [ ] **B-4 · Scene 7, Ivy's memory** (~50 min) · `scene7/bg_ivy_room.png` (+ `bg_ivy_outside`, `bg_ivy_fg`, `prop_oil_lamp`)
  - Add classroom clutter (maps, slates, a globe). Make the satchel on the desk readable. Give the chalkboard a child's drawing of the clock.
  - **Keep the window panes transparent**: the running crowd is code behind them.
- [ ] **B-5 · Scene 8, Luke's memory** (~50 min) · `scene8/bg_luke_bank`, `bg_luke_far`, `prop_boat_villagers`, `bg_watch_close`
  - In `bg_watch_close` the gloved hand looks like a loaf, so paint a real gloved hand holding the watch.
  - **Both clocks must stay readable** (2:31 and 2:17); that shot is the CONTRADICTION clue.
- [ ] **B-6 · Scene 9, Hanna's memory** (~50 min) · `scene9/bg_archive`, `prop_shelf_door`, `bg_chamber`, `char_hanna_reach`
  - Put Hanna at the desk reading (not in front of it).
  - The figure beside the lantern **stays faceless and scarf-less**. It must not give the twist away.
- [ ] **B-7 · Scene 11, the finale** (~60 min) · `chars/portrait_elias_young.png` **first**, then `scene11/panel_*.png`
  - Young Elias's face is the most important face in the game: the first and only time we see him. Keep the outline of `char_elias_young` identical to the Elias sheet.
  - `panel_erase.png` is the portrait scaled ×4 as a stand-in. Paint a proper 480×270 close-up of him lifting the lantern to his own face.
- [ ] **B-8 · If time:** scene 4 (`scene4/panel_*.png`): add detail to the 5 sepia panels. Keep them silhouettes.

**Checkpoints (post here):** ~03:55 B-1 + B-2 · ~05:55 B-3 → B-5 · ~07:55 the rest. If you're short on time, **skip ahead to B-7's portrait**: that face matters more than any background.

### 5. Delivery rules (from the coding chat, which wires your art in)
- **Where:** save finals as PNG in `art/incoming/bhumi/` under **exactly** the draft's file name.
- **Size:** keep the **same canvas size** as the draft. `npm run pixel` **ignores a file with a different size** and prints a warning, so a resized file silently won't show up.
- **Positions:** layer order and offsets are fixed in code, so keep everything where the draft has it.
- **New animation sheets** (more than one frame in a file): ask in this thread first; the code needs the frame size.
- **Already in the game** (PR #52), so you can see your art live with `npm run pixel && npm run dev`:
  - scene 1 and scene 2 (Opening)
  - scene 5 (Village hub)
  - scene 6 (the woman's room)
  - scene 7 (Ivy's memory)
  - scene 8 (Luke's memory)
- **Not wired yet:** scenes 9–11 wait for code, so check them against their `design/pixel/*.html` page instead.

### 6. Quick self-check before each export
1. Only palette colours? (No new colour appeared in the editor's "used colours".)
2. Same size and same file name as the draft?
3. No amber/teal except Elias's scarf, the lantern and lantern-touched things?
4. Toggle your layer against the draft: outline and feet in the same place?

Questions about the look: ask here and tag @VaNsH-IIIT. The design chat reads this thread through him.
