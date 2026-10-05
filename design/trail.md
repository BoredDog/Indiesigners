# The Road to Veyra (branch `nav/eerie-trail`)

An eerie 2.5D side-scrolling mode: *Oregon Trail* resource travel told by a *Shutter Island* unreliable narrator. It plays as a prologue: arriving at Veyra hands over to the main game's Opening.

**Play it:** `npm run dev`, then click **THE ROAD TO VEYRA** on the title screen, or go straight to `http://localhost:5173/?scene=Trail`.

## The idea
Elias walks the night road from Ashcombe Ferry to Veyra, pushing a handcart. His little sister **Nia** walks beside him. The question the player slowly asks is whether she is really there. (In the main game Elias "did not remember my sister": this is how his mind fills that gap.)

## How it plays (about 6–10 minutes)
| System | What it does |
|---|---|
| **Travel** | Parallax silhouette layers scroll past (hills, dead trees, telegraph poles, road, foreground grass). The world is dark except for the pool of light around Elias's lantern. One in-game hour passes every ~0.5 s. 140 miles in all. |
| **Outfitter** (Oregon Trail) | 80 coins to spend at the ferry: lamp oil, bread, Dr. Hale's tonic. |
| **Pace / Lantern** | Pace (steady / strenuous / grueling) trades composure for speed. Lantern (dim / bright) trades oil for composure. Running out of oil plunges you into the dark, and composure collapses. |
| **Composure** (Shutter Island) | Below 45 the narrator stops being reliable: HUD numbers lie, Nia flickers and gains an echo, the camera sways, and *phantom* events appear that never happened. |
| **Events** | ~10 per run. Choice cards (a lantern-bearer with your own coat and hat, crows on the wire, a woman in a rocking chair, asylum attendants…). |
| **Landmarks** | Marsh Telegraph, Saint Ione's Asylum, the Dry River (ford / float / pay the ferryman), Schoolhouse Mile, Veyra. Search, camp or move on. |
| **Doubts** | Six clues that Nia isn't there. Examples: the ferryman takes one fare, one set of footprints, no shadow in bright light, your own patient file at the asylum, a telegram saying SHE IS NOT WITH YOU, and the ledger's "two portions" when only one share of bread is ever gone. Find them through choices, searches and **QUESTION IT** in the ledger. |
| **Tonic** | +32 composure, but it erases your newest doubt and blacks out a ledger line. Clarity versus truth. |
| **Endings** | 3+ doubts: **THE EMPTY CART** (she was never there). Fewer: **SHE WENT AHEAD** (denial). Both lead into the main game. Composure 0 gives **THE FOG KEEPS YOU**: you wake at the last landmark with a little oil and bread (no dead ends). |

## Files
- `src/trail/TrailData.ts`: all text and tuning numbers (edit here).
- `src/trail/TrailState.ts`: rules, no Phaser.
- `src/scenes/TrailScene.ts`: the scene.
- `src/scenes/trail/trailArt.ts`: code-drawn stand-in art. Replace any texture key with painted art at the same size.
- `src/scenes/trail/trailAudio.ts`: Kenney CC0 samples plus synthesized wind and drone.
- `tools/check-trail.ts`: plays 6,000 simulated runs (careful / rushing / random players). Every run reaches Veyra; careful players find the truth.
- `tools/shots-trail.ts`: Playwright run-through with screenshots. Use `--chrome` to use the installed Chrome.

`npm run test:trail` runs both.

## Art swap list (same keys, same sizes)
`tr_hills` 1920×420 · `tr_trees_far` 1920×380 · `tr_poles` 1920×640 · `tr_trees_near` 1920×720 · `tr_grass` 1920×160 · `tr_road` 1920×260 · `tr_cart` 300×150 · `tr_wheel` 76×76 · `lm_ferry` · `lm_telegraph` · `lm_asylum` · `lm_river` · `lm_school` · `lm_veyra`. Characters reuse `char_figure` (Elias) and `char_nia`.
