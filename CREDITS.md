# Credits

Every third-party asset in the game, with source and license. **Add a row before you commit any new asset** (Arya checks each license on its source page, task A1).

## Team Indiesigners
| Name | GitHub | Role |
|---|---|---|
| Garv Singh | Gravity006 | Lead, comic UI, build & release |
| Nav Singhal | BoredDog | Gameplay systems, story mode |
| Vansh Jaiswal | VaNsH-IIIT | Echo Paths puzzles |
| Bhumi Chaudhari | Bhumi-Chaudhari | Character & key art |
| Arya Pandey | arya2707 | Environment art, assets, QA |

## Third-party assets in the game
What players see and hear in story mode, the game the title screen starts.

| Asset | Creator | Source | License | Used for | Modified? | License checked |
|---|---|---|---|---|---|---|
| Gothicvania Town, Cemetery and Church packs (tiles, houses, props, parallax, townsfolk + ghost sprites) | ansimuz (Luis Zuno) | https://opengameart.org/content/gothicvania-town · /gothicvania-cemetery-pack · /gothicvania-church-pack | CC0 1.0 (`public/assets/gv/LICENSE.txt`) | Story mode world, characters and backdrops; title screen backdrop | Sprite frames packed into strips; tinted in code | ☐ |
| Echoes pixel pack (Elias ×4, Ivy, Luke, Hanna portraits and small sprites; lantern, pocket watch, bell rope; 5 painted backgrounds: village hub, Ivy's schoolhouse, Luke's river dock, Hanna's archive, clock tower) | **Confirm creator** | `echoes_pixel_assets.zip`, added by Nav (5–6 Oct) | **Confirm license / AI disclosure** | Dialogue portraits, evidence-board icons, props (`public/assets/pixel/`); panel backgrounds of the closing "Case File 217" comic (`public/assets/story/comic/`) | Cropped / scaled in code; comic shader (ink, halftone) applied | ☐ |
| Particle Pack (smoke_04, smoke_07, smoke_10) | Kenney | https://kenney.nl/assets/particle-pack | CC0 1.0 (`public/assets/story/particles/Kenney-Particle-Pack-License.txt`) | Story mode fog and smoke | Resized to 256 px, tinted in code | ☐ |
| RPG Audio (creak1–3, bookFlip1, metalClick, doorClose_4) | Kenney | https://kenney.nl/assets/rpg-audio | CC0 1.0 (`public/assets/story/audio/Kenney-RPG-Audio-License.txt`) | Story mode: creaks, dig, page turns, stings | Pitched down in code | ☐ |
| Impact Sounds (footstep_grass_000–004, impactBell_heavy_000) | Kenney | https://kenney.nl/assets/impact-sounds | CC0 1.0 (`public/assets/story/audio/Kenney-Impact-Sounds-License.txt`) | Story mode: footsteps, bell | Pitched down in code | ☐ |
| VT323 (font) | Peter Hull | https://fonts.google.com/specimen/VT323 | SIL OFL 1.1 (`public/assets/fonts/VT323-OFL.txt`) | Story mode UI: dialogue, choices, objectives, evidence board | No | ☐ |
| Bangers (font) | Vernon Adams | https://fonts.google.com/specimen/Bangers | SIL OFL 1.1 (`public/assets/fonts/Bangers-OFL.txt`) | Title, quick-time events, case-file comic headings | No | ☐ |
| Special Elite (font) | Astigmatic | https://fonts.google.com/specimen/Special+Elite | Apache 2.0 (`public/assets/fonts/SpecialElite-LICENSE.txt`) | Typewritten captions in the case-file comic | No | ☐ |
| Caveat (font) | Impallari Type | https://fonts.google.com/specimen/Caveat | SIL OFL 1.1 (`public/assets/fonts/Caveat-OFL.txt`) | The handwritten letter (COME HOME, ELI) in the case-file comic | No | ☐ |

## Also in the build, not used by story mode
These ship with the original comic mode (Village, Memory, Casebook and Finale scenes). That mode is still in the code but the title screen no longer opens it.

| Asset | Creator | Source | License | Used for | Modified? | License checked |
|---|---|---|---|---|---|---|
| Comic Neue (font) | Craig Rozynski, Hrant Papazian | https://fonts.google.com/specimen/Comic+Neue | SIL OFL 1.1 (`public/assets/fonts/ComicNeue-OFL.txt`) | Comic mode speech bubbles | No | ☐ |
| Paper002 texture | ambientCG | https://ambientcg.com/view?id=Paper002 | CC0 1.0 | Comic mode page paper, documents (loaded at boot) | Tinted in code | ☐ |
| Cork001 texture | ambientCG | https://ambientcg.com/view?id=Cork001 | CC0 1.0 | Comic mode casebook board | Tinted in code | ☐ |
| PaintedPlaster017 texture | ambientCG | https://ambientcg.com/view?id=PaintedPlaster017 | CC0 1.0 | Grime on the comic mode village walls (draft art) | Greyscale, multiplied into `bg_village` by `tools/draft-art.ts` | ☐ |
| Leaking006 texture (opacity map) | ambientCG | https://ambientcg.com/view?id=Leaking006 | CC0 1.0 | Water stains under sills and eaves (draft art) | Used as a stain mask by `tools/draft-art.ts` | ☐ |
| Paper001, Paper003, Wood049, Concrete034 textures | ambientCG | https://ambientcg.com | CC0 1.0 | Not used anywhere; **remove before release** | — | ☐ |

## Software
| Tool | License |
|---|---|
| Phaser 3.90 | MIT |
| Vite, TypeScript | MIT, Apache 2.0 |
| Playwright, tsx, sharp (dev only, not shipped) | Apache 2.0, MIT, Apache 2.0 |

## AI disclosure
- **Claude Code (Anthropic)** was used to write and test game code (`src/`, `tools/`), including story mode, to structure content files from our own design doc, and to help plan the project. All story, characters and design come from the team's proposal and blueprint.
- **Draft art by Claude Code:** the village background and the six character drafts in `art/incoming/claude/` were drawn by Claude Code as vector (SVG) code in `tools/draft-art.ts`, a first pass for Bhumi and Arya to paint over or replace. Sources: `art-src/claude/*.svg`. They are used only by comic mode and do not appear in story mode (allowed: Garv's decision, 5 Oct, PLAN.md open question 3).
- **Music and synthesized sound:** the score (a pad, a music-box theme for Nia, bass and an echo) and the rain, water, stone and wood footsteps, and ghost shimmer are generated in code with WebAudio (`src/story/music.ts`, `src/story/audio.ts`). That code was written with Claude Code. There are no music files and no audio-generation models.
- **itch.io page:** the cover and screenshots are captures of the game itself, taken and cropped with Claude Code.
- No AI image-generation models, music or voice generators were used by the team. The origin of the Echoes pixel pack is still being confirmed (see its row above).
