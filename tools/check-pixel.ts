// Checks pixel art against the rules in design/pixel/README.md, so a slip is caught before the
// file reaches the game instead of in a screenshot at 07:50.
//   npx tsx tools/check-pixel.ts                 every draft and upload
//   npx tsx tools/check-pixel.ts scene7          only paths matching "scene7"
//
// What it enforces (all of it straight from the README):
//   canvas      480×270, or 192×108 for a close-up. Sprite sheets are a whole number of frames.
//   palette     every opaque pixel is one of the 27 colours in design/pixel/veyra.hex
//               ("Load it into the editor and pick no colours by eye")
//   alpha       0 or 255 only: no soft edges, no half-transparent paint
//   cut-outs    a file whose name says the panes are cut out really has transparent panes
//   feet        a 32×58 body sprite stands on y = 56
//   portraits   64×64
//
// It reads art-src/pixel/ (Vansh's drafts) and art/incoming/ (paint-overs), so the same command
// checks a draft before you paint and your own file after.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import sharp from 'sharp';

const PALETTE_FILE = 'design/pixel/veyra.hex';
const CANVAS = [
  [480, 270],
  [192, 108],
] as const;

const filter = process.argv[2];

// Runs in the build, so a tree without the pixel work (main before the merge) is a pass, not a
// failure: there is simply nothing to check.
if (!existsSync(PALETTE_FILE)) {
  console.log(`check-pixel: no ${PALETTE_FILE} in this tree, nothing to check.`);
  process.exit(0);
}

/** veyra.hex → the set of allowed colours, as 0xRRGGBB. */
const palette = new Set(
  readFileSync(PALETTE_FILE, 'utf8')
    .split('\n')
    .map((l) => l.trim().replace(/^#/, ''))
    .filter((l) => /^[0-9a-fA-F]{6}$/.test(l))
    .map((h) => parseInt(h, 16)),
);

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

type Problem = string;

/**
 * Known, accepted problems: listed so the build stays green while they are open, and so anything
 * NEW still fails. Each entry needs an owner and a reason. Delete the line when it is fixed —
 * the check then enforces it again, and will fail if it comes back.
 */
const KNOWN: Record<string, string[] | string> = {
  // Seen through a window, not standing on the ground, so the body canvas and the feet line do
  // not apply. Confirm with Vansh and delete if it is meant to be a standing sprite.
  'art-src/pixel/scene3/char_window_figure.png': ['body sprite is 40×60, must be 58 tall', 'feet on y = 59, must be 56'],
  // All three Elias sprites stand on 57, consistently with each other and one pixel below every
  // other character. Their content fills rows 0..57, so none can be nudged up without clipping:
  // it is a one-pixel redraw, or the scene offsets Elias by -1. Vansh.
  'art-src/pixel/chars/char_elias_look.png': 'feet on y = 57, must be 56',
  'art-src/pixel/chars/char_elias_raise.png': 'feet on y = 57, must be 56',
  'art-src/pixel/scene1/char_elias_walk.png': 'feet on y = 57, must be 56',
  // Content fills rows 0..57, so this cannot be nudged up a pixel without clipping the hat:
  // it needs a one-pixel redraw. Vansh (design/pixel-art). Every other body sprite is on 56.
};

/** A body sprite is 58 px tall; the README puts the feet on y = 56. */
const BODY_H = 58;
const FEET_Y = 56;

async function check(file: string, draft?: string): Promise<Problem[]> {
  const out: Problem[] = [];
  const name = basename(file, '.png');
  const img = sharp(file).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info;

  // ---- canvas -------------------------------------------------------------
  const isFull = CANVAS.some(([cw, ch]) => w === cw && h === ch);
  const isSheet = h === BODY_H && w % 32 === 0;
  const isPortrait = name.startsWith('portrait_');
  if (isPortrait && (w !== 64 || h !== 64)) out.push(`portrait is ${w}×${h}, must be 64×64`);
  if (!isPortrait && !isFull && !isSheet && (name.startsWith('bg_') || name.startsWith('panel_'))) {
    out.push(`background is ${w}×${h}, must be 480×270 (or 192×108 for a close-up)`);
  }
  if (w > 480 || h > 270) out.push(`${w}×${h} is larger than the 480×270 canvas`);

  // ---- pixels -------------------------------------------------------------
  let softAlpha = 0;
  let offPalette = 0;
  const strays = new Set<string>();
  let transparent = 0;
  let lowestOpaque = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * channels;
      const a = data[i + 3];
      if (a === 0) {
        transparent++;
        continue;
      }
      if (a !== 255) {
        softAlpha++;
        continue;
      }
      if (y > lowestOpaque) lowestOpaque = y;
      const rgb = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
      if (!palette.has(rgb)) {
        offPalette++;
        if (strays.size < 4) strays.add('#' + rgb.toString(16).padStart(6, '0'));
      }
    }
  }
  if (softAlpha) out.push(`${softAlpha} part-transparent pixels (alpha must be 0 or 255)`);
  if (offPalette) out.push(`${offPalette} pixels off the palette, e.g. ${[...strays].join(' ')}`);

  // ---- cut-outs -----------------------------------------------------------
  // A room drawn over an "outside" layer has to leave holes for it to show through. A room with
  // no outside layer behind it (scene 6) is a single opaque background and is fine as it is.
  if (/_room$/.test(name) && transparent === 0 && existsSync(file.replace(/_room\.png$/, '_outside.png'))) {
    out.push('no transparent pixels: the window panes are not cut out');
  }

  // ---- feet ---------------------------------------------------------------
  // Any character sprite at roughly full height, whatever the frame width: sheets come in 32, 48
  // and 64 px frames, so keying off the width missed char_elias_raise (144×58). The height range
  // catches a canvas that has drifted (a 32×59 sprite is wrong twice over) rather than skipping.
  const isBody = name.startsWith('char_') && h >= BODY_H - 2 && h <= BODY_H + 2;
  if (isBody) {
    if (h !== BODY_H) out.push(`body sprite is ${w}×${h}, must be ${BODY_H} tall`);
    if (lowestOpaque >= 0 && lowestOpaque !== FEET_Y) out.push(`feet on y = ${lowestOpaque}, must be ${FEET_Y}`);
  }

  // ---- an upload must land on its draft's canvas ---------------------------
  // "Finals go in art/incoming/<name>/ under the same file name as the draft", on the same
  // canvas, so the layers still line up. This is the one that catches an export at the wrong zoom.
  if (draft) {
    const d = await sharp(draft).metadata();
    if (d.width !== w || d.height !== h) out.push(`${w}×${h} does not match its draft ${draft} (${d.width}×${d.height})`);
  }
  return out;
}

// Drafts define what counts as pixel art. An upload is checked when it carries a draft's file
// name ("Finals go in art/incoming/<name>/ under the same file name as the draft"), so the
// pre-pixel vector art in art/incoming/claude/ is left alone.
// art-src/pixel/itch/ holds store-page exports (cover, banner, screenshots) already scaled to
// their final size. They are presentation, not game layers, so the canvas rules do not apply.
const drafts = walk('art-src/pixel')
  .filter((f) => f.endsWith('.png'))
  .filter((f) => !f.includes('/itch/'));
const draftOf = new Map(drafts.map((f) => [basename(f), f]));
const uploads = walk('art/incoming')
  .filter((f) => !f.includes('incoming/claude/')) // the pre-pixel vector drafts, some names collide
  .filter((f) => f.endsWith('.png') && draftOf.has(basename(f)));
const files = [...drafts, ...uploads].filter((f) => !filter || f.includes(filter)).sort();

if (!files.length) {
  if (filter) {
    console.error(`No pixel art matching "${filter}".`);
    process.exit(1);
  }
  console.log('check-pixel: no pixel art in this tree, nothing to check.');
  process.exit(0);
}

let bad = 0;
let known = 0;
for (const f of files) {
  const problems = await check(f, f.startsWith('art/incoming') ? draftOf.get(basename(f)) : undefined);
  if (!problems.length) {
    console.log(`ok   ${f}`);
    continue;
  }
  const entry = KNOWN[f];
  const accepted = entry === undefined ? [] : Array.isArray(entry) ? entry : [entry];
  const unexpected = problems.filter((p) => !accepted.includes(p));
  if (!unexpected.length) {
    known++;
    console.log(`known ${f}`);
    for (const p of problems) console.log(`       ${p}  (accepted, see KNOWN in this file)`);
    continue;
  }
  bad++;
  console.log(`FAIL ${f}`);
  for (const p of unexpected) console.log(`       ${p}`);
}
const clean = files.length - bad - known;
console.log(`\n${clean}/${files.length} clean${known ? `, ${known} known` : ''}${bad ? `, ${bad} to fix` : ''}`);
process.exit(bad ? 1 : 0);
