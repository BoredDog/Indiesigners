# Pixel art: Echoes of Sorrow, scene by scene

Design lead for the pixel look: Vansh's design session. Every scene gets a code-drawn mockup and layer drafts first. Owners then refine, paint over, or ship the drafts as they are.

Preview of Scene 1: open `scene1_entering_veyra.html` in a browser. It is live and has layer toggles.

## Rules (every scene)

- **Canvas 480×270**, drawn at exactly **4×** to fill 1920×1080. Close-ups use 192×108 at 10×.
- **Palette:** `veyra.hex` (23 colours, built from the 8 tokens in `design/art_direction.md`). Load it into the editor and pick no colours by eye.
- **Two colours glow.** Amber is the living present and appears only on Elias's scarf in the present day. Teal is the Echo Lantern. Elias is the only thing that carries both.
- **No face** for Elias until the final memory: back or three-quarter view, a wide hat brim, a high collar.
- **No gradients.** Use hard colour steps. Dither (4×4 Bayer) only for sky, fog and light falloff.
- **Light is code.** Paint everything unlit. The game brightens pixels near the lantern by one palette step (`LIT1`/`LIT2` tables in the mockup). Hidden symbols live on a `*_residue` layer that shows only inside the light.
- **Export:** PNG at 1×. Use one transparent layer per file, all on the same 480×270 canvas so they line up. Skip trimming and lossy WebP for these files.
- **In Phaser:** `pixelArt: true`, `roundPixels: true`, integer scale 4.

## Scenes and owners

| # | Scene (script_final) | Mockup + drafts | Final art | Wiring |
|---|---|---|---|---|
| 1 | Opening: entering Veyra | **done** (`art-src/pixel/scene1/`) | Vansh: backgrounds · Bhumi: Elias sheet | Vansh |
| 2 | Opening: clock tower 2:17, DONG DONG | next | Vansh | Vansh |
| 3 | Opening: toy rolls · figure in the window | todo | Vansh: street · Bhumi: toy, figure | Vansh |
| 4 | Ten years ago: 5 comic panels | todo | Bhumi | Vansh |
| 5 | Present-day village hub + 7 clues | todo | Vansh: hub + props | Vansh |
| 6 | Unknown woman: abandoned room, rocking chair | todo | Bhumi: woman · Vansh: room | Vansh |
| 7 | Ivy memory: schoolhouse at night | todo | Bhumi | Vansh |
| 8 | Luke memory: river, boats, watch 2:31 | todo | Bhumi | Vansh |
| 9 | Hanna memory: archive, hidden entrance | todo | Bhumi | Vansh |
| 10 | Well, tunnels, lantern archive | todo | Vansh | Vansh |
| 11 | Deepest chamber + finale (young Elias, sister) | todo | Bhumi: characters · Vansh: chamber | Vansh |
| 12 | Title, Casebook, end screens (UI) | todo | Vansh | Vansh |

Split: **Vansh** gets environments, props, UI and all wiring (backgrounds, clue props, tunnels, chamber, menus). **Bhumi** gets characters and story panels (Elias walk/idle sheet + young Elias on the same outline, Ivy/Luke/Hanna/sister/unknown woman sprites and portraits, the 5 history panels, the three memory pages, finale panels).

## Scene 1 files (`art-src/pixel/scene1/`)

| File | Size | Content |
|---|---|---|
| `bg_veyra_sky.png` | 480×270 | Sky, moon, stars, clouds (opaque) |
| `bg_veyra_far.png` | 480×270 | Distant roofs, clock tower at 2:17 |
| `bg_veyra_mid.png` | 480×270 | Houses, gate, VEYRA sign, wall, tree |
| `bg_veyra_street.png` | 480×270 | Cobbles, puddles |
| `bg_veyra_fg.png` | 480×270 | Fence and grass in front of Elias |
| `bg_veyra_residue.png` | 480×270 | Teal symbols, shown only inside the lantern light |
| `char_elias_walk.png` | 6 × 32×58 | Walk ×4, idle ×2; feet at y=56, body centre x=13 |
| `prop_lantern.png` | 3 × 8×12 | Flame flicker; hangs from the staff hook |

Fog, wind, leaves and the lantern glow are done in code. Scene 1 beats: 0–1 s empty street; 1–8 s Elias walks in (≈29 px/s at 1×); ≈7 s the door symbol glows as the lantern passes; 8–10 s cut to the lantern close-up; 10 s cut to the tower (first DONG on the cut).

## Village hub hotspots (keep these when drawing Scene 5)

The coding session's `feat/village-clues` puts the clue hotspots at these 1920×1080 positions. Divide by 4 for the pixel canvas. The pixel hub keeps the clock tower at (910, 300) → (227.5, 75).

footprints 1040,875 · key 1172,885 · bell 910,228 · tower clock 910,385 · records 1345,770 · symbols 220,770 (+ tower door 868,700, well 1236,700) · recorder 1722,790 · well 1180,760 · burned photo 1040,1000 · witnesses 470,760 / 760,1010 / 1500,790.
