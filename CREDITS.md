# Credits

## Team Indiesigners

| Name | GitHub | Role |
|---|---|---|
| Garv Singh | Gravity006 | Game code, project lead, music and sound, build and release |
| Nav Singhal | BoredDog | Game code, story mode world and gameplay, story scripting |
| Vansh Jaiswal | VaNsH-IIIT | Game code, lantern puzzles and challenges, puzzle art |
| Bhumi Chaudhari | Bhumi-Chaudhari | Art and story: characters and portraits, story, dialogue and content |
| Arya Pandey | arya2707 | Art and story: environments and backgrounds, story, content and QA |

Made for TGC GameJam 2026 (themes: Comic, Twist, Light). The game is licensed under the MIT License (code) and CC BY 4.0 (original assets), and **you must credit us if you use any part of it**; see [LICENSE](LICENSE).

## Original assets (Team Indiesigners)

Licensed CC BY 4.0 as part of the game (see [LICENSE](LICENSE)).

| Asset | Where | How it was made |
|---|---|---|
| Story, script, dialogue and characters | `src/world/script.ts`, `src/world/board.ts`, `design/` | Written by the team |
| Puzzle and challenge visuals: lantern tuner, classroom candles, river channels, the well descent, the echo bridge, tutorial cards, board and UI | `src/story/`, `src/world/` | Drawn in code by the team |
| Music and synthesized sound: score, rain, water, stone and wood footsteps, ghost voices, ending stings, thunder | `src/story/music.ts`, `src/story/audio.ts` | Generated procedurally in code (WebAudio). No recorded music |
| Small ghost sprites `ivy_small.png`, `luke_small.png`, `hanna_small.png` | `public/assets/pixel/sprites/` | Scaled down from the AI-generated portraits below |

## AI-generated assets

These files were generated with AI tools under the team's direction, then cropped, scaled and shaded in code. The pixel-art files keep their embedded content-credential (C2PA) metadata, which records the AI generation. They ship under the same terms as the team's original assets.

| Asset | Files | Used for |
|---|---|---|
| Character portraits: Elias (3 poses), Ivy, Luke, Hanna | `public/assets/pixel/sprites/elias_pose1–3.png`, `ivy.png`, `luke.png`, `hanna.png` | Dialogue portraits, evidence-board cards, ghosts in the world |
| Props: lantern, pocket watch, bell rope | `public/assets/pixel/props/lantern_EV.png`, `pocket_watch.png`, `bell_rope.png` | Evidence-board cards, the closing comic |
| Five painted backgrounds: village hub, Ivy's schoolhouse, Luke's river dock, Hanna's archive, clock tower | `public/assets/story/comic/*.png` | Panels of the closing "Case File 217" comic |
| Legacy comic-mode drafts: village background and six characters (drawn as vector code) | `public/assets/art/*.webp` | The legacy comic mode only; not shown in story mode |

## Third-party assets

**Add a row before you commit any new asset.** Each license file sits next to its assets.

| Asset | Creator | Source | License | Used for | Modified? |
|---|---|---|---|---|---|
| Gothicvania Town, Cemetery and Church packs (tiles, houses, props, parallax, townsfolk and ghost sprites) | ansimuz (Luis Zuno) | https://opengameart.org/content/gothicvania-town · /gothicvania-cemetery-pack · /gothicvania-church-pack | CC0 1.0 (`public/assets/gv/LICENSE.txt`) | The story-mode world, characters and backdrops; the title screen. Elias's in-world sprite (`pixel/sprites/elias_hatman.png`) is a frame of `hat-man-idle.png` | Sprite frames packed into strips; tinted in code |
| Particle Pack (smoke_04, smoke_07, smoke_10) | Kenney | https://kenney.nl/assets/particle-pack | CC0 1.0 (`public/assets/story/particles/Kenney-Particle-Pack-License.txt`) | Fog and smoke | Resized to 256 px, tinted in code |
| RPG Audio (creak1–3, bookFlip1, metalClick, doorClose_4) | Kenney | https://kenney.nl/assets/rpg-audio | CC0 1.0 (`public/assets/story/audio/Kenney-RPG-Audio-License.txt`) | Creaks, digging, page turns, typewriter ticks, stings | Pitched in code |
| Impact Sounds (footstep_grass_000–004, impactBell_heavy_000) | Kenney | https://kenney.nl/assets/impact-sounds | CC0 1.0 (`public/assets/story/audio/Kenney-Impact-Sounds-License.txt`) | Footsteps on grass, the bell | Pitched in code |
| VT323 (font) | Peter Hull | https://fonts.google.com/specimen/VT323 | SIL OFL 1.1 (`public/assets/fonts/VT323-OFL.txt`) | Story-mode UI: dialogue, choices, objectives, evidence board | No |
| Bangers (font) | Vernon Adams | https://fonts.google.com/specimen/Bangers | SIL OFL 1.1 (`public/assets/fonts/Bangers-OFL.txt`) | Title, quick-time events, comic headings | No |
| Special Elite (font) | Astigmatic | https://fonts.google.com/specimen/Special+Elite | Apache 2.0 (`public/assets/fonts/SpecialElite-LICENSE.txt`) | Typewritten captions in the closing comic | No |
| Caveat (font) | Impallari Type | https://fonts.google.com/specimen/Caveat | SIL OFL 1.1 (`public/assets/fonts/Caveat-OFL.txt`) | The handwritten letter in the closing comic | No |
| Comic Neue (font) | Craig Rozynski, Hrant Papazian | https://fonts.google.com/specimen/Comic+Neue | SIL OFL 1.1 (`public/assets/fonts/ComicNeue-OFL.txt`) | Speech bubbles in the legacy comic mode | No |
| Paper002 texture | ambientCG | https://ambientcg.com/view?id=Paper002 | CC0 1.0 | Paper in the legacy comic mode | Tinted in code |
| Cork001 texture | ambientCG | https://ambientcg.com/view?id=Cork001 | CC0 1.0 | Casebook board in the legacy comic mode | Tinted in code |

The legacy comic mode (Village, Memory, Casebook and Finale scenes) is still in the code, but the title screen no longer opens it.

### The licenses
| License | What it allows | Full text |
|---|---|---|
| CC0 1.0 | Public domain: use for anything, no credit required (we credit anyway) | https://creativecommons.org/publicdomain/zero/1.0/ |
| SIL Open Font License 1.1 | Use and embed the font; keep its license file with it; don't sell the font on its own | https://openfontlicense.org |
| Apache 2.0 | Use and modify; keep the license and notices | https://www.apache.org/licenses/LICENSE-2.0 |
| MIT | Use and modify; keep the copyright notice | https://opensource.org/license/mit |
| CC BY 4.0 (our original assets) | Use and adapt, even commercially, with credit to Team Indiesigners | https://creativecommons.org/licenses/by/4.0/ |

## Software

| Tool | License |
|---|---|
| Phaser 3.90 | MIT |
| Vite, TypeScript | MIT, Apache 2.0 |
| Playwright, tsx, sharp (dev only, not shipped) | Apache 2.0, MIT, Apache 2.0 |

## AI assistance

Parts of this game's code and writing were developed with AI assistance, and the assets listed under "AI-generated assets" were AI-generated. The story, characters and design direction are the team's own.
