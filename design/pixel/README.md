# Pixel art: Echoes of Sorrow, scene by scene

Design lead for the pixel look: Vansh's design session. Every scene gets a code-drawn mockup and layer drafts first. Owners then refine, paint over, or ship the drafts as they are.

Preview of Scene 1: open `scene1_entering_veyra.html` in a browser. It is live and has layer toggles.

## Rules (every scene)

- **Canvas 480×270**, drawn at exactly **4×** to fill 1920×1080. Close-ups use 192×108 at 10×.
- **Palette:** `veyra.hex` (27 colours: 23 base + dusty blue/violet witness accents with shades, built from the 8 tokens in `design/art_direction.md`). Load it into the editor and pick no colours by eye.
- **Two colours glow.** Amber is the living present and appears only on Elias's scarf in the present day. Teal is the Echo Lantern. Elias is the only thing that carries both.
- **No face** for Elias until the final memory: back or three-quarter view, a wide hat brim, a high collar.
- **No gradients.** Use hard colour steps. Dither (4×4 Bayer) only for sky, fog and light falloff.
- **Light is code.** Paint everything unlit. The game brightens pixels near the lantern by one palette step (`LIT1`/`LIT2` tables in the mockup). Hidden symbols live on a `*_residue` layer that shows only inside the light.
- **Export:** PNG at 1×. Use one transparent layer per file, all on the same 480×270 canvas so they line up. Skip trimming and lossy WebP for these files.
- **In Phaser:** `pixelArt: true`, `roundPixels: true`, integer scale 4.

## Plan: 6 hours, ~01:50 → ~07:50 (Team HQ #3, comment 6002330795)

Vansh's coding chat does V20–V24 and all wiring. The design chat drafts every scene in the order below, and the humans paint over the drafts. Anything not painted by 07:50 ships as its draft.

| Hour | Vansh | Bhumi |
|---|---|---|
| 1 | Scene 1 entering Veyra + Elias walk/idle sheet | Portraits 64×64: **Hanna first**, Ivy, Luke |
| 2 | Scene 5 village hub background | Sister + unknown woman sprites (woman = pale Hanna) |
| 3 | Scene 5: 7 clue props + well | Scene 7 Ivy memory: schoolhouse at night |
| 4 | Scene 2 clock tower + scene 6 room / rocking chair / photo ×2 | Scene 8 Luke memory: river, boats, watch 2:31 |
| 5 | Scene 10 well + tunnels: one tileset (reused for archive + chamber) | Scene 9 Hanna memory: archive, hidden entrance |
| 6 | Young Elias (same outline) + review fixes | Scene 11 finale panels: young Elias + sister |

Cut or simplified (ship as drafts): **scene 3** reuses the scene 1 street plus a figure silhouette. **Scene 4** is five silhouette panels. **Scene 12 UI** is recoloured in code, so it needs no art.

Draft order (design chat):
1. portraits Hanna/Ivy/Luke (**done** · `art-src/pixel/chars/`, preview `chars_cast.html`)
2. sister + unknown woman (**done**; also `char_hanna_body.png`, the same outline in colour)
3. scene 7 (**done** · `art-src/pixel/scene7/` + `chars/char_ivy_body.png`, preview `scene7_ivy_memory.html`)
4. scene 5 hub + props
5. scene 8
6. scene 2 (**done**) + scene 6
7. scene 9
8. scene 10 tileset
9. scene 11
10. young Elias

Scene 1 is **done**. Scenes 3 and 4 follow.

Checkpoints: +2 h (~03:50), +4 h (~05:50), +6 h (~07:50). Post screenshots in Team HQ.

Files: drafts go in `art-src/pixel/scene<N>/` (characters in `art-src/pixel/chars/`). Finals go in `art/incoming/<name>/` under the **same file name** as the draft.

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
