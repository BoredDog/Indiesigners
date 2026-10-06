# src/comic — comic presentation layer

Owner: Garv. Everything visual that makes the game look like a comic. Import from `src/comic` (barrel `index.ts`).

| Piece | What it does |
|---|---|
| `ComicPage` | Paper + panels cut from **one** background (`PageDef`). `focus(id, 'full' \| 'lift')`, `unfocus()`, emits `panel-click`. |
| `ComicPanel` | One panel baked into a RenderTexture (crop + cutouts). `overlay` holds SFX words/bubbles in panel-local px. `setColour(0..1)`, `setInk(0..1)`, `setHalftone(0..1)`. |
| `SfxWord` | Clickable sound-effect word hiding an evidence fragment. `pulse()` for the first clue; emits `reveal`. |
| `Bubble` | `speech`, `thought`, `shout`, `narration`, `evidence`. Positioned by centre; `tail` is relative. `appear()` = rise-in. |
| `RichText` | Blueprint R3 markup: `[[redacted]]`, `~cracked~`, `*bold*`, `\n`. |
| `ComicFxPipeline` | One shader: greyscale→colour, halftone dots, ink creep. WebGL only (no-op on Canvas). |
| `gridFrames()` | Builds panel frames from row/column ratios. |
| `pageTurn()`, `impact()` | Page-turn wipe and small screen shake. |
| `comicSettings` | `reduceMotion`, `reduceFlashing`; GameState settings should write these. |
| `loadComicFonts()` | Must run before `new Phaser.Game` (see `src/main.ts`). |

```ts
const page = new ComicPage(scene, pageDef, { paperKey: 'paper', grey: true });
scene.add.existing(page);
const word = new SfxWord(scene, 160, 150, { text: 'BELL!', evidence: 'The village bell rang at 2:17.' });
page.panel('P3').overlay.add(word);
word.on('reveal', () => { gameState.addEvidence('ev_sis_bell'); page.panel('P3').setColour(1); });
```

Demo / test bench: `npm run dev` (boots `src/dev/ComicDemoScene.ts`).
Screenshots + console-error check: `npm run build && npx tsx tools/shots-comic.ts`.
Comic-mode art lives in `public/assets/art/*.webp`, listed in `manifest.json`.
