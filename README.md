# Echoes of Sorrow

*A ghost hunter comes home to a village where every clock stopped at 2:17, and slowly finds out he is the case.*

A supernatural investigation thriller in seven episodes, played as a side-view pixel-art adventure. Made by **Team Indiesigners** for TGC GameJam 2026 (themes **Comic · Twist · Light**).

- ▶️ **Play in the browser:** https://gravity006.github.io/Indiesigners/ (latest `main` build)
- 🎮 **itch.io:** https://gravity006.itch.io/echoes-of-sorrow

## The game
Elias Vane receives a letter with no stamp and no return address: two words in a child's hand, COME HOME. In Veyra, a village that vanished ten years ago, he tunes his lantern to see what places remember. He steps into the memories of three ghosts (Ivy, Luke and Hanna), pins every clue to an evidence board, and works out what really happened at 2:17. There are two endings.

- **The lantern:** tune it, then hold it up to reveal footprints, symbols and traces.
- **Puzzles:** tuning the lantern, the classroom candles, turning the river back, following Hanna, the well descent and the echo bridge. You can leave any puzzle with BACK; the story waits until it's solved.
- **Evidence board:** three questions gate the story (Episodes 1, 3 and 6). You can't move on until you answer them.
- **Choices and quick-time events** change what the ghosts say later. After three misses, a QTE lets you carry on with the "missed" version.
- **Scene select** on the title screen replays any episode you've reached.

## Controls
| Input | Action |
|---|---|
| A / D or ← / → | Walk (hold **Shift** to run) |
| W, ↑ or Space | Jump |
| S or ↓ | Drop through a plank |
| E or click the prompt | Interact with anything marked ! |
| Hold **F** or the right mouse button | Raise the lantern (once it's tuned) |
| Hold **X**, or hold or tap the left mouse button | Dig through the rubble in the well |
| Space, Enter or click | Advance dialogue and the closing comic |
| Click, or 1–4 | Choose an answer |
| C | Evidence board |
| Backspace or BACK | Leave a puzzle (come back later) |
| Esc | Pause and settings (music, sound, text size, reduce motion and flashing) |

Progress autosaves; **Continue** resumes it.
**Content warning:** death, disappearance, grief, family illness, guilt, memory manipulation, supernatural horror. No graphic gore.

## Run it locally
Needs Node 20+.
```bash
npm install
npm run dev            # http://localhost:5173  (jump to an episode: /?scene=Story&episode=3&fresh=1)
npm run build          # type-check, puzzle checks, production build in dist/
npx playwright install chromium   # once, for the headless tests
npm run test:story     # walk + dig check, both endings played to the summary, screenshots
npm run test:audio     # music and sound reach their buses; MUSIC/SOUND OFF is silent
npx tsx tools/autoplay-story.ts --gpu [--ending=forget]   # one full playthrough (use --gpu on battery)
```

## Repository layout
| Path | What's in it |
|---|---|
| `src/scenes/StoryScene.ts`, `src/world/` | Story mode: the world (`worldgen.ts`, `tiles.ts`), the episode script (`script.ts`), the director that runs it (`Director.ts`), the evidence board (`board.ts`), tutorials (`guide.ts`) |
| `src/story/` | Story-mode systems: puzzles (`tuner`, `candles`, `river`, `follow`, `descent`, `bridge`), QTEs, music and sound, the closing comic, scene select |
| `src/scenes/TitleScene.ts`, `PauseScene.ts` | Title screen, settings, credits |
| `src/comic`, `src/core`, `src/puzzle`, the other `src/scenes` | The legacy comic mode and Echo Paths puzzles (still built and tested, not reachable from the title screen) |
| `public/assets/` | Art, audio and fonts shipped with the game (licenses next to the files) |
| `content/` | Story data and puzzle levels used by the legacy mode and the build's puzzle checks |
| `design/` | Story mode design notes (`story_mode.md`), the final script, art direction, the original proposal and blueprint |
| `tools/` | Headless test and screenshot tools (Playwright) |
| `.github/workflows/ci.yml` | Build on every PR; deploy to GitHub Pages and upload to itch.io on merges to `main` |

**Releases:** every merge to `main` deploys to GitHub Pages. itch.io uploads run on the same merge unless the repository variable `ITCH_DEPLOY` is `off` (`gh variable set ITCH_DEPLOY --body on|off`). The itch upload needs the `BUTLER_API_KEY` secret.

## Team
Garv Singh · Nav Singhal · Vansh Jaiswal · Bhumi Chaudhari · Arya Pandey. Roles, asset credits, licenses and the AI-generated assets are listed in [CREDITS.md](CREDITS.md).

## License
Code: MIT. Original assets (art, story, writing, music): CC BY 4.0. **If you use any part of this game, you must credit Team Indiesigners**; the wording is in [LICENSE](LICENSE). Third-party assets keep their own licenses, and some art is AI-generated; both are listed in [CREDITS.md](CREDITS.md).
