# Echoes of Sorrow: Art Direction (art night, 5 Oct)

Inspiration only. We never copy another game's characters, designs or assets. Numbers like [3] point to the Sources list at the end.

## 1. North star

**A grimy, dark-comedy comic about a crime you already committed.** Every screen is a printed comic page left in a damp drawer. The base is muted and dirty (soot, mud, bile olive, dried blood) with thick ink outlines and flat cel shadows, in the spirit of *The Coffin of Andy and Leyley* [1]. Only two colours ever glow. **Amber** is the living present: lamplight, windows, the investigator's world. **Teal** is the Echo Lantern: anything it has touched, including the wisp the player steers. The rule that carries the twist: **only Elias ever carries both colours.** Like Obra Dinn's monochrome [2][3] and Lorelei's black-and-white with one accent [4], we earn our look by restraint. Each new colour on a memory page should feel like a clue found.

### Palette (8 core tokens)

| Token | Hex | Use |
|---|---|---|
| Ink | `#111114` | Outlines, gutters, the Figure's fill (already `COLORS.ink`) |
| Soot | `#26212b` | Night sky, scene backgrounds, UI side bars |
| Mud | `#5b4636` | Wood, grime, stains, cork after retint |
| Bile olive | `#6f6c3f` | Sickly walls, Arun's coat, the "wrong" green |
| Dried blood | `#7a2e2b` | Pins, yarn, stamps, Mira's skirt. Never gore. |
| Bone | `#e6d9bb` | Captions, cards, puzzle tiles, the Figure's pale rim |
| Amber lamplight | `#e0a33a` | Lit windows, lamps, Elias's scarf, physical-world SFX |
| Spirit teal | `#7fe0d4` | Echo Lantern, wisp, residue, spirit SFX, one primary button per screen |

The witness accents stay as they are in `theme.ts`, used at one swatch per character: dusty blue `#7d93ad` (Mira), olive (Arun), violet `#8a76a0` (Leela). The ghost wash `#dde6f2` is not teal on purpose: ghosts are not the lantern.

### Grey to colour memory reveal
- **Grey state:** sepia-grey (the shader already does this), slightly darker than now, with dense halftone. Captions are already bone.
- **On evidence found:** the colour does **not** switch on across the whole panel. It **bleeds outward from the clicked point** in an inky, noisy circle over 800 ms (`TIMING.colourFill`). Amber and teal pixels show up first (the first ~150 ms), then everything else. The halftone dots shrink as the colour arrives.
- **Fully revealed page:** saturation tops out around 85%, with a grime multiply on top. A memory never looks brand new.
- **Sound first:** each panel's SFX plays about 250 ms before its colour bleed starts. This is Obra Dinn's audio-before-image beat [5].

### Spirit-light (memory pages, PLAN A1)
- **The circle:** a teal circle about 180 px across follows the cursor. It has a soft 24 px falloff plus a thin hard ring (teal, 40% alpha) so it reads as a *panel-drawn* light, not a blur.
- **Inside the circle:** the art loses saturation and gets slightly brighter. The halftone dots turn teal. A hidden **residue layer** shows through as glowing chalk-white strokes tinted teal: the scratched initials **"E.V."** on the lantern case, handprints on the bell rope, drag marks toward the lantern chamber.
- **The Figure under the light:** only its pale rim lights up. The face never does.
- **Outside the circle:** the page is unchanged.

---

## 2. Per screen

### Title
**From:** Lorelei's title cards, based on old black-and-white film title screens [4]. Little Misfortune tells you the ending at the very start and still surprises you [6].
- **[art tonight] Bhumi (B6):** foreground of the Figure seen from behind at the foot of the clock tower, with a pale rim and teal lantern. The culprit is on the title screen in plain sight.
- **[code]** Print the title with a 3 px **misregistration**: an amber copy offset left and a teal copy offset right, under the bone fill. It reads as cheap comic printing. Put an ink drop shadow under it.
- **[code]** Every ~9 s the lantern flickers and the clock hand twitches toward 2:18, then snaps back. Pair it with a faint `TICK`.

### Opening comic
**From:** Max Payne's graphic-novel pages: typewriter captions, panels revealed one by one on a single page [7]. Comix Zone's camera slides across the gutter to the next panel [8].
- **[code]** The opening frames currently use flat purple placeholder skies that don't match the new village. **Crop frames 1, 3 and 6 from `bg_village`** and keep the Soot sky.
- **[code]** Lay out 2–3 frames per page and **pan across the gutter** between them instead of putting one panel per screen.
- **[art tonight] Bhumi:** one panel showing **the investigator's gloved hand, coat cuff and lantern staff** (frames 1–2). See section 4: the cuff and the cracked lantern glass must match the Figure.
- **[code]** Frame 5 (window reflection): use **`char_figure` itself**, flipped and at 60% alpha, so the player has seen the exact outline before the memories show it.

### Village hub
**From:** Night in the Woods' street of layered flat shapes that feels lived in, not like a backdrop [9][10].
- **[art tonight] Arya (A2):**
  - Paint over `bg_village` in the palette above: stains, peeling plaster, a mud-brown quay.
  - Light amber windows only where a witness is still unresolved. Paint the unlit versions as a separate layer.
  - Keep the clock at (910, 300) showing 2:17.
- **[code]** Ghosts currently stand on the river. **Plant the witnesses' feet on the quay line:** Mira at the schoolhouse door, Arun on the boat, Leela under the lamp by the archive.
- **[code]** When a witness is resolved, swap the lit window for the dark one with a short amber-to-soot fade.

### Conversation
**From:** Andy and Leyley's big expressive bust portraits [1]. Disco Elysium composes each screen like a painting to direct attention [11].
- **[code]** Frame the portrait as a **comic panel**: a 6 px ink border with a bone gutter, the witness cropped at the chest at about 1.6× scale, and the speaker's name on a caption tab.
- **[code]** Use the witness's single reaction expression (B3/B4) for 1.5 s when the player presents evidence that hits (the "+1" face).
- **[code]** Dim the village behind the panel to 35% and give it a soot vignette. At the moment the bubbles fight the busy background.

### Memory page (comic panels)
**From:**
- Framed's silhouettes on a panel grid, where the layout itself is the puzzle [12].
- Gorogoa's "panels inside panels" that zoom into a detail [13].
- Golden Idol's frozen tableaux, where every clue is visible in the scene [14].

**Changes:**
- **[code] Text-fit fix (needed):**
  - Captions overlap and get clipped in `memory-mira/03-all-found.png` ("…before the minu", P5's stacked boxes).
  - Bangers labels lose their last letter ("RECONSTRUC1", "RESE1", "ENTER HIS MEMORY").
  - Fix: add right padding to the italic text, and give each panel caption slots that never overlap.
- **[code] SFX words colour-coded by meaning:**
  - Amber burst: physical sounds (BELL!, TICK!, CLANK!).
  - Teal burst: lantern sounds (HUM!, WHOOM!, GLASS!).
  - Bone burst with ink lettering: records (PAPER!, SCRATCH!, INK!).
  - `SILENCE...` gets no burst, just small typewriter text.
- **[code]** Radial colour bleed and spirit-light, as described in section 1.
- **[art tonight] Arya (A3/A5):** page backgrounds with **one strong amber or teal light source per panel area**, so the colour bleed has somewhere to come from.

### Deduction
**From:** Golden Idol's Thinking page. Slots and words are colour-coded by type, and you're told when you're only a couple of words off [14][15].
- **[code]** Make each evidence card a **mini comic panel**: a crop of the panel where the evidence was found, with its SFX word in the corner. The player recognises a picture, not a sentence.
- **[code]** Draw a colour-coded edge on cards and conclusions by evidence type (amber physical, teal lantern, bone record). This reuses the SFX rule.
- **[code]** On confirm, slam a dried-blood **CONFIRMED** stamp (already used in the Casebook) with a 6 px shake and a `THUMP!`. Make the teal CONFIRM button the only teal fill on the screen.

### Casebook board
**From:** Obra Dinn's logbook (roster, sketch, map, all in one physical book) [3]. Paradise Killer's gather-everything-then-trial structure [16].
- **[code]** The cork is a loud orange. **Multiply it toward Mud `#5b4636`** and add a soot vignette at the edges.
- **[code]** Draw threads as dried-blood yarn with a 1 px ink outline and a slight sag (quadratic curve), not straight lines.
- **[code]** Pin the **panel thumbnails** (the same crops as the Deduction cards) next to the questions.
- **[code]** The Figure card is the `char_figure` silhouette with its pale rim, cropped at chest height. Keep the player's notes in **Caveat**: this is the handwriting clue (section 4).

### Echo Path puzzle board
**From:**
- Hitman GO: the board as "an object you'd put on a shelf" [17][18].
- Lara Croft GO: readable mechanics without tutorials [19].
- Felix the Reaper: the rotating sun moves the shadows you walk in [20].

**Changes:**
- **[code] Diorama slab:** draw the board as a physical tile. Add a 14 px mud-brown "thickness" strip under the bottom and right edges, a soft ink drop shadow onto the panel art, and give each tile a 3 px offset shadow.
- **[code] Tiles:** bone `#e6d9bb` with `paper001` texture multiplied in, not flat cream.
- **[code] Shadow (ink) tiles:** a brushy edge with a halftone fringe, so they read as erased memory, not plain black squares.
- **[code]** Draw faint dashed **light rays** from the light-source icon across the lit tiles, so the rotation direction reads at a glance.
- **[art tonight] Arya (if time):** a 128 px **pawn set** in the line style: wisp, echo sentinel (violet ghost pawn for Leela's levels), crate, pillar, lever, gate.

### Archive
**From:** Lorelei's black-and-white with a single accent [4]. World of Horror's two-colour dread [21].
- **[code]** The Archive is the **only screen with no amber**. Use only Ink, Bone and Teal, so the living world has gone.
- **[art tonight] Arya (A7):** shelves of ledgers drawn in pure ink and bone, with teal lantern cables along the floor.
- **[code]** Collapsing tiles tear like paper: two halves split along a jagged line, with a `RIP!` in a bone burst.

### Finale / twist reveal
**From:** Obra Dinn's rule that you can verify the truth from what you already saw [3][22]. Framed's wordless, silhouette-driven staging [12].
- **[code]** The finale sheet still shows flat placeholder figures. Use the real art: **`char_figure` dissolves edges-inward into `char_elias_young`** (same outline, so the swap works without a cut).
- **[code]** Frame 6: put the Casebook's Caveat notes **next to** the anonymous case request in the same Caveat hand, then align them with a `SCRATCH!`.
- **[art tonight] Bhumi (B5):** young Elias at the console with an amber scarf, a teal lantern and Nia asleep on the bench behind him. A single hard teal light from below.

### Ending
**From:** Unpacking tells a whole life through objects in a room [23].
- **[art tonight] Bhumi (B6):** two ending panels. (1) The quay at dawn: the witnesses fade out, the amber lamps go off one by one. (2) A close-up of the investigator's desk with the case file, the cracked lantern and Nia's silver hairclip.
- **[code]** Show the Deductions and Credits page as a **case file folder**: a bone paper sheet clipped onto mud card with a dried-blood "CLOSED" stamp. At the moment it's a flat brown page.

---

## 3. Character design notes

General rule: every character has to pass the **squint test** as a solid black fill (Framed's silhouettes [12]). Thick 6–8 px ink outline, flat 2-tone cel shading, big readable eyes.

### Translucent ghosts (Mira, Arun, Leela)
- **Opacity:** keep the outline at 100% and the fill at about 80%. The art is one image, so alpha doesn't double up where shapes overlap.
- **Wash:** a cold wash `#dde6f2` over the art.
- **Feet:** fade the bottom 15% to 0.
- **Motion:** a 2 px vertical bob every 3 s. Turn it off under Reduce Motion.
- **No teal:** ghosts never glow teal unless the lantern touched that object.

| Character | Silhouette | Palette | One expression |
|---|---|---|---|
| **Mira**, 28, schoolteacher | A tall triangle: A-line skirt, narrow shoulders, **long side braid**, clutching a slate or register | Dusty blue shawl, dried-blood skirt, chalk-white smudges on her hands | **Held breath:** brows up in the middle, eyes wide, lips pressed ("You came back.") |
| **Arun**, 24, ferryman | A box: square coat, rounded cap, a **scarf tail** blown sideways, wet trouser hems | Olive coat, rust scarf, amber glint of the **pocket watch at 2:31** | **Forced grin cracking:** smiling mouth with worried eyes, one brow twitching |
| **Leela**, 56, archivist | A narrow column: high bun **with a pencil through it**, round glasses, ledger held like a shield | Violet cardigan, near-black skirt, brass key on a chain | **Over the spectacles:** chin down, eyes up, one brow raised ("I've read about you.") |
| **Nia**, sick child | Tiny next to the Figure: big round head, oversized clinic smock, rag doll | Bone smock, mud hair, and the **silver hairclip `#c9d1d9`** as the coldest highlight on screen | **Sleepy, trusting smile,** dark circles under her eyes. She's the only character drawn soft. |
| **The Figure** | Narrow-brim hat, **high collar**, long coat flaring at the hem, lantern staff on its right | Pure Ink fill, a 3 px **bone rim** on the lit side, teal lantern as its only colour | None. No face, ever. Its hand on the staff is the only "gesture". |
| **Young Elias** | **Exactly the Figure's outline** (shared 300×640 file) | Charcoal coat, **amber scarf filling the high collar**, pale face, teal lantern | **Earnest determination:** a set jaw and a frown, not villainy. He thinks he is saving Nia. |

---

## 4. Twist-supporting visual language

Obra Dinn plants identities in clothing, positions and the crew sketch, then validates only in sets of three so you can't guess [3][22]. Golden Idol puts every needed fact on screen in the frozen scene [14]. Our rule: **every twist fact appears on screen at least three times before the finale** (opening, a memory, the Casebook).

1. **Two colours, one man.** The Figure only ever shows teal. The investigator's lantern is teal, and the wisp you steer is "Elias's spirit-light probe" (PLAN 3.1). Young Elias wears amber. Nobody else carries both.
2. **Same cuff, same staff.** The investigator's sleeve in the opening has the **same three brass cuff buttons and the same lantern staff with a crack in the glass** as the Figure in Mira P5 (`GLASS!`) and the finale.
3. **Scuffed initials.** In the opening, the investigator's lantern case has a scratched patch. Under spirit-light in Arun P5, the same patch reads **"E.V."**
4. **The reflection.** Opening frame 5 shows the Figure's exact outline in the window. Use the same sprite, so careful players recognise it later.
5. **The handwriting.** The player's Casebook notes are already in Caveat. Write the anonymous case request in the opening in the **same Caveat hand** (a short margin note on the typed file). The finale only has to put the two side by side.
6. **The hairclip.** Arun's memory shows a silver glint caught on the Figure's coat. The ending desk shows that hairclip on the investigator's desk.
7. **Framing.** In the opening, the investigator is never framed above the shoulders and always from behind or below, like the Figure (opening frame 2: "face never shown").

---

## 5. Top 10 for tonight (audio-visual cohesion first)

| # | Task | Owner | Hours |
|---|---|---|---|
| 1 | **Palette lock and text fit:** retint the cork, puzzle tiles, buttons and sequence skies to the 8 tokens. Fix the clipped Bangers labels and the overlapping memory captions. | dev | 2 |
| 2 | **Figure and young Elias final** on the shared outline: pale rim, teal lantern, cracked glass, three cuff buttons (B2) | Bhumi | 2.5 |
| 3 | **`bg_village` paint-over** in the palette, a quay line for the witnesses, lit and unlit window layers (A2) | Arya | 3 |
| 4 | **Mira, Arun, Leela:** neutral plus one expression each, with the silhouettes from section 3 (B3/B4) | Bhumi | 4 |
| 5 | **Ghost rendering:** feet fade, cold wash, bob, feet on the quay | dev | 1.5 |
| 6 | **Mira page background** with one amber or teal light source per panel area (A3) | Arya | 3 |
| 7 | **Radial colour bleed + spirit-light circle** with the residue layer (PLAN A1) | dev | 2.5 |
| 8 | **Props and residue overlays:** watch at 2:31, hairclip, lantern case with "E.V.", white-stroke residue PNG per page (A4) | Arya | 2 |
| 9 | **Opening and finale use the real art:** `bg_village` crops, the reflection as `char_figure`, Figure-to-Elias dissolve, Caveat note on the case file, colour-coded SFX | dev | 2 |
| 10 | **Investigator hand and lantern panel + finale console panel** (B5) | Bhumi | 2.5 |

If time is left: the puzzle diorama pass (slab, textured tiles, brushy ink, light rays; dev, 1.5 h) and the pawn set (Arya, 1.5 h).

---

## 6. Sources

1. Steam: *The Coffin of Andy and Leyley* (tags: Dark Comedy, Hand-drawn, Psychological Horror): https://store.steampowered.com/app/2378900/The_Coffin_of_Andy_and_Leyley/ and Wikipedia: https://en.wikipedia.org/wiki/The_Coffin_of_Andy_and_Leyley
2. PlayStation Blog, Lucas Pope on Obra Dinn's 1-bit art style ("legibility above all else"): https://blog.playstation.com/archive/2019/10/17/lucas-pope-on-return-of-the-obra-dinns-art-style
3. Wikipedia, *Return of the Obra Dinn* (memento mortem, logbook, fates validated in threes): https://en.wikipedia.org/wiki/Return_of_the_Obra_Dinn
4. Simogo, Åsa Wallander on the 2D art in *Lorelei and the Laser Eyes*: https://simogo.com/work/loreleiandthelasereyes/asa-lorelei-and-the-laser-eyes/
5. PC Gamer, Pope on the 1-bit aesthetic: https://www.pcgamer.com/uk/lucas-pope-on-the-challenge-of-creating-obra-dinns-1-bit-aesthetic/
6. Wikipedia, *Little Misfortune*: https://en.wikipedia.org/wiki/Little_Misfortune
7. Game Informer, "Making Max Payne": https://gameinformer.com/b/features/archive/2016/03/27/making-max-payne-how-hong-kong-kung-fu-and-family-photo-shoots-built-a-noir-thriller
8. Retroware, *Comix Zone* retrospective: https://articles.retroware.com/2020/11/18/comix-zone-a-farewell-to-the-genesis/
9. Wikipedia, *Night in the Woods*: https://en.wikipedia.org/wiki/Night_in_the_Woods
10. RPGFan review, *Night in the Woods*: https://www.rpgfan.com/review/night-in-the-woods/
11. MCV/Develop, *Disco Elysium* art: https://www.mcvuk.com/business-news/we-knew-immediately-that-we-needed-to-make-a-game-with-a-striking-and-unique-look-to-accompany-the-writing-a-look-that-would-balance-the-mundane-with-the-unfamiliar-and-strange-the-art and Wikipedia: https://en.wikipedia.org/wiki/Disco_Elysium
12. Steam, *FRAMED Collection*: https://store.steampowered.com/app/322450/FRAMED_Collection/ and Macworld: https://www.macworld.com/article/224947/you-should-play-rearrange-comic-panels-to-help-frameds-noir-tale-unfold.html
13. Game Developer, Road to the IGF: Jason Roberts' *Gorogoa*: https://www.gamedeveloper.com/design/road-to-the-igf-jason-roberts-i-gorogoa-i- and Hyperallergic: https://hyperallergic.com/gorogoa-jason-roberts/
14. Adventure Game Hotspot, *The Case of the Golden Idol* review: https://adventuregamehotspot.com/2022/11/21/the-case-of-the-golden-idol
15. Wikipedia, *The Case of the Golden Idol*: https://en.wikipedia.org/wiki/The_Case_of_the_Golden_Idol
16. Wikipedia, *Paradise Killer*: https://en.wikipedia.org/wiki/Paradise_Killer
17. TouchArcade, *Hitman GO* inspiration: https://toucharcade.com/2014/04/29/hitman-go-inspiration/
18. Pocket Gamer, Square Enix Montréal's real-life *Hitman GO* diorama: https://www.pocketgamer.co.uk/hitman-go/square-enix-montreal-built-a-level-of-hitman-go-in-real-life-and-its-simply-amaz/
19. GamesBeat, *Lara Croft GO* developer interview: https://gamesbeat.com/lara-croft-go-developer-on-turning-an-action-blockbuster-into-a-turn-based-mobile-game/
20. Epic Games Store, *Felix the Reaper*: https://store.epicgames.com/p/felix-the-reaper-3f7e62
21. Culture.pl, Paweł Koźmiński's *World of Horror*: https://culture.pl/en/work/pawel-kozminskis-world-of-horror
22. Game Informer, Obra Dinn tips (clothing, positions, elimination): https://www.gameinformer.com/index.php/2018/10/18/10-spoiler-free-tips-for-solving-puzzles-in-return-of-the-obra-dinn
23. Press Start, *Unpacking* review: https://press-start.com.au/reviews/2021/11/02/unpacking-review-a-pixel-tells-a-thousand-words/
24. Strange Horticulture dev interview (tactile book and desk UI), Game Developer: https://www.gamedeveloper.com/design/strange-horticulture---bad-viking

Skipped as poor fits: Sally Face and Fran Bow. Their hand-drawn horror is close in mood, but I found no citable art-direction source, and Andy and Leyley already covers that tone. Strange Horticulture [24] only adds a minor point: making the Casebook feel like a physical object you handle.
