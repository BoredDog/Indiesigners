// Turns raw art uploads into game-ready files.  Usage: npm run art
//
//   art/incoming/<anyone>/<file>.(png|jpg|jpeg|webp)  →  public/assets/art/<snake_name>.webp
//   art/incoming/<anyone>/<file>.(kra|psd|xcf)        →  art-src/<file>   (sources, proof of authorship)
//
// Rules (tasks.md §5):
//   bg_*   backgrounds: kept whole, longest side capped at 2560 px, no trim
//   char_* characters that replace a placeholder: kept whole (same canvas as the stand-in, so
//          cutout scales and feet positions still line up; see src/dev/placeholders.ts)
//   other  cutouts/props: transparent border trimmed, fitted inside 1920×1080
// Also writes public/assets/art/manifest.json ({ key: "art/<file>.webp" }) so the game can load
// every processed image without editing code. Skips files that are already up to date.
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';
import sharp from 'sharp';
import { pixelNames } from './pixel-art';

const IN = 'art/incoming';
const OUT = 'public/assets/art';
const SRC = 'art-src';
const IMAGE = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const SOURCE = new Set(['.kra', '.psd', '.xcf']);

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const snake = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const newer = (a: string, b: string) => !existsSync(b) || statSync(a).mtimeMs > statSync(b).mtimeMs;

mkdirSync(OUT, { recursive: true });
mkdirSync(SRC, { recursive: true });

const rows: string[] = [];
const seen = new Map<string, string>();
// Drafts in art/incoming/claude/ go last: a teammate's file with the same name replaces the draft.
// Pixel layers (art-src/pixel names) are copied losslessly by `npm run pixel`, never converted here.
const PIXEL = pixelNames();
const isDraft = (f: string) => relative(IN, f).split(/[\\/]/)[0] === 'claude';
for (const file of walk(IN).sort((a, b) => Number(isDraft(a)) - Number(isDraft(b)))) {
  const ext = extname(file).toLowerCase();
  const key = snake(basename(file, extname(file)));
  if (PIXEL.has(basename(file, extname(file)))) continue;

  if (SOURCE.has(ext)) {
    const dest = join(SRC, basename(file));
    if (newer(file, dest)) {
      copyFileSync(file, dest);
      rows.push(`source   ${relative(IN, file)} → ${dest}`);
    }
    continue;
  }
  if (!IMAGE.has(ext)) continue;

  if (seen.has(key)) {
    if (isDraft(file)) continue; // replaced by a teammate's upload
    console.warn(`! name clash: ${relative(IN, file)} and ${seen.get(key)} both become ${key}.webp, skipping the second`);
    continue;
  }
  seen.set(key, relative(IN, file));

  const dest = join(OUT, `${key}.webp`);
  if (!newer(file, dest)) continue;

  let img = sharp(file).rotate(); // honour EXIF orientation from phone photos of sketches
  if (key.startsWith('bg_')) {
    img = img.resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true });
  } else if (key.startsWith('char_')) {
    // keep the canvas as drawn
  } else {
    img = img.trim().resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true });
  }
  const info = await img.webp({ quality: 86, alphaQuality: 100 }).toFile(dest);
  rows.push(`image    ${relative(IN, file)} → ${dest} (${info.width}×${info.height}, ${Math.round(info.size / 1024)} KB)`);
}

const manifest: Record<string, string> = {};
for (const f of readdirSync(OUT).filter((f) => f.endsWith('.webp')).sort()) {
  manifest[basename(f, '.webp')] = `assets/art/${f}`;
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log(rows.length ? rows.join('\n') : 'Nothing new in art/incoming.');
console.log(`manifest.json: ${Object.keys(manifest).length} images`);
