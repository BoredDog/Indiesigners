# Credits

## Team Indiesigners

| Name | GitHub | Role |
|---|---|---|
| Garv Singh | Gravity006 | Game code, project lead, music and sound, build and release |
| Nav Singhal | BoredDog | Game code, story mode world and gameplay, story scripting |
| Vansh Jaiswal | VaNsH-IIIT | Game code, lantern puzzles and challenges, puzzle art |
| Bhumi Chaudhari | Bhumi-Chaudhari | Art and story: characters and portraits, story, dialogue and content |
| Arya Pandey | arya2707 | Art and story: environments and backgrounds, story, content and QA |

Made for TGC GameJam 2026 (themes: Comic, Twist, Light).

## Original assets

| Asset | By | Where |
|---|---|---|
| Echoes pixel pack: Elias, Ivy, Luke and Hanna portraits and sprites; lantern, pocket watch, bell rope; the five painted backgrounds of the closing "Case File 217" comic | Team Indiesigners | `public/assets/pixel/`, `public/assets/story/comic/` |
| Echo Paths and story-mode puzzle art | Team Indiesigners | `public/assets/pixel/puzzle/` |
| Music and synthesized sound (score, rain, water, footsteps, ghost voices, stings) | Team Indiesigners, generated in code with WebAudio | `src/story/music.ts`, `src/story/audio.ts` |
| Story, script and characters | Team Indiesigners | `design/` |

## Third-party assets

**Add a row before you commit any new asset.** Every license below is included next to the files.

| Asset | Creator | Source | License | Used for | Modified? |
|---|---|---|---|---|---|
| Gothicvania Town, Cemetery and Church packs (tiles, houses, props, parallax, townsfolk and ghost sprites) | ansimuz (Luis Zuno) | https://opengameart.org/content/gothicvania-town · /gothicvania-cemetery-pack · /gothicvania-church-pack | CC0 1.0 (`public/assets/gv/LICENSE.txt`) | The story-mode world, characters and backdrops; title screen backdrop | Sprite frames packed into strips; tinted in code |
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

## Software

| Tool | License |
|---|---|
| Phaser 3.90 | MIT |
| Vite, TypeScript | MIT, Apache 2.0 |
| Playwright, tsx, sharp (dev only, not shipped) | Apache 2.0, MIT, Apache 2.0 |

## AI assistance

Parts of this game's code, art, music and writing were developed with AI assistance. The story, characters and design direction are the team's own.
