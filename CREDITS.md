# Credits

Every third-party asset in the game, with source and license. **Add a row before you commit any new asset** (Arya checks each license on its source page, task A1).

## Team Indiesigners
| Name | GitHub | Role |
|---|---|---|
| Garv Singh | Gravity006 | Lead, comic UI, build & release |
| Nav Singhal | BoredDog | Gameplay systems |
| Vansh Jaiswal | VaNsH-IIIT | Echo Paths puzzles |
| Bhumi Chaudhari | Bhumi-Chaudhari | Character & key art |
| Arya Pandey | arya2707 | Environment art, assets, QA |

## Third-party assets
| Asset | Creator | Source | License | Used for | Modified? | License checked |
|---|---|---|---|---|---|---|
| Bangers (font) | Vernon Adams | https://fonts.google.com/specimen/Bangers | SIL OFL 1.1 (`public/assets/fonts/Bangers-OFL.txt`) | SFX words, titles, buttons | No | ☐ |
| Comic Neue (font) | Craig Rozynski, Hrant Papazian | https://fonts.google.com/specimen/Comic+Neue | SIL OFL 1.1 (`public/assets/fonts/ComicNeue-OFL.txt`) | Speech bubbles | No | ☐ |
| Special Elite (font) | Astigmatic | https://fonts.google.com/specimen/Special+Elite | Apache 2.0 (`public/assets/fonts/SpecialElite-LICENSE.txt`) | Narration, documents | No | ☐ |
| Caveat (font) | Impallari Type | https://fonts.google.com/specimen/Caveat | SIL OFL 1.1 (`public/assets/fonts/Caveat-OFL.txt`) | Elias's handwriting | No | ☐ |
| Paper002 texture | ambientCG | https://ambientcg.com/view?id=Paper002 | CC0 1.0 | Comic page paper, documents | Tinted in code | ☐ |
| Cork001 texture | ambientCG | https://ambientcg.com/view?id=Cork001 | CC0 1.0 | Casebook board | Tinted in code | ☐ |
| PaintedPlaster017 texture | ambientCG | https://ambientcg.com/view?id=PaintedPlaster017 | CC0 1.0 | Grime on the village walls (draft art) | Greyscale, multiplied into `bg_village` by `tools/draft-art.ts` | ☐ |
| Leaking006 texture (opacity map) | ambientCG | https://ambientcg.com/view?id=Leaking006 | CC0 1.0 | Water stains under sills and eaves (draft art) | Used as a stain mask by `tools/draft-art.ts` | ☐ |
| Paper001, Paper003, Wood049, Concrete034 textures | ambientCG | https://ambientcg.com | CC0 1.0 | Downloaded; **remove before release if unused** | — | ☐ |

## Software
| Tool | License |
|---|---|
| Phaser 3.90 | MIT |
| Vite, TypeScript | MIT, Apache 2.0 |
| Playwright, tsx, sharp (dev only, not shipped) | Apache 2.0, MIT, Apache 2.0 |

## AI disclosure
- **Claude Code (Anthropic)** was used to write and test game code (`src/`, `tools/`), structure content files from our own design doc, and help plan the project. All story, characters and design come from the team's proposal and blueprint.
- **Draft art by Claude Code:** the village background and the six character drafts in `art/incoming/claude/` were drawn by Claude Code as vector (SVG) code in `tools/draft-art.ts`, a first pass for Bhumi and Arya to paint over or replace. Sources: `art-src/claude/*.svg`. Any draft still in the game at release is listed here as AI-assisted art (allowed: Garv's decision, 5 Oct, PLAN.md open question 3).
- No AI image-generation models, music or voice generators were used.
