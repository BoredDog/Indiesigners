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

Even split agreed in Team HQ (issue #3, comment 6002314625). Each person owns whole scenes. All wiring is Vansh's and is not counted in the hours.

| # | Scene (script_final) | Mockup + drafts | Owner (final art) |
|---|---|---|---|
| 1 | Opening: entering Veyra | **done** · `art-src/pixel/scene1/` | Vansh |
| 2 | Opening: clock tower 2:17, DONG DONG | **done** · `art-src/pixel/scene2/` | Vansh |
| 3 | Opening: toy rolls · figure in the window | todo | Vansh |
| 4 | Ten years ago: 5 comic panels | next | Bhumi |
| 5 | Present-day village hub + 7 clues | todo | Vansh |
| 6 | Unknown woman: room, rocking chair, woman, burned photo ×2 | todo | Vansh |
| 7 | Ivy memory: schoolhouse at night | todo | Bhumi |
| 8 | Luke memory: river, boats, watch 2:31 | todo | Bhumi |
| 9 | Hanna memory: archive, hidden entrance | todo | Bhumi |
| 10 | Well, tunnels, lantern archive | todo | Vansh |
| 11 | Deepest chamber + finale (young Elias, sister) | todo | Bhumi |
| 12 | Title, Casebook, end screens (UI) | todo | Vansh |

Characters: **Vansh** owns the Elias walk/idle sheet, with young Elias on the same outline. **Bhumi** owns the Ivy, Luke, Hanna and sister sprites and portraits.

Totals: Vansh ≈ 19 h (1, 2, 3, 5, 6, 10, 12 + Elias sheet). Bhumi ≈ 18.5 h (4, 7, 8, 9, 11 + witness/sister sprites and portraits).

Order:
- **Bhumi:** portraits (Hanna first) → 4 → 7 → 8 → 9 → 11.
- **Vansh:** art starts after V20–V24.
- **Design mockups:** Bhumi's scenes first, so she can start now.

Files: drafts go in `art-src/pixel/scene<N>/`. Finals go in `art/incoming/<name>/` under the same file names as the drafts.

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

## Scene 2 files (`art-src/pixel/scene2/`)

| File | Size | Content |
|---|---|---|
| `bg_tower_sky.png` | 480×270 | Full backdrop (sky + tower), opaque |
| `bg_tower.png` | 480×270 | Tower, belfry, clock face with hour and minute hands at 2:17, corner roofs (transparent sky) |
| `prop_bell.png` | 48×40 | Bell, pivot at (24, 4). The game rotates it |
| `bg_clockface_close.png` | 192×108 | Close-up face for shot 2B, no second hand |

In code: the dried-blood second hand (twitches to the next tick every 1.3 s, snaps back), bell swing (two DONGs at 1.2 s and 3.4 s, damped), amber sound rings, dust off the ledges, crows scattering on the first DONG, and a 0.35 s shake. Live mockup: `scene2_clock_tower.html`.

## Scene 1 notes

Fog, wind, leaves and the lantern glow are done in code. Scene 1 beats: 0–1 s empty street; 1–8 s Elias walks in (≈29 px/s at 1×); ≈7 s the door symbol glows as the lantern passes; 8–10 s cut to the lantern close-up; 10 s cut to the tower (first DONG on the cut).

## Village hub hotspots (keep these when drawing Scene 5)

The coding session's `feat/village-clues` puts the clue hotspots at these 1920×1080 positions. Divide by 4 for the pixel canvas. The pixel hub keeps the clock tower at (910, 300) → (227.5, 75).

footprints 1040,875 · key 1172,885 · bell 910,228 · tower clock 910,385 · records 1345,770 · symbols 220,770 (+ tower door 868,700, well 1236,700) · recorder 1722,790 · well 1180,760 · burned photo 1040,1000 · witnesses 470,760 / 760,1010 / 1500,790.
