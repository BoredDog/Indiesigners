// Pixel-art layers → game files, lossless.  Usage: npm run pixel
//
//   art-src/pixel/<scene>/<name>.png   design-chat drafts (the fallback, so every scene has art)
//   art/incoming/<anyone>/<name>.png   finals by Vansh / Bhumi: same name replaces the draft
//        → public/assets/pixel/<name>.png + public/assets/pixel/manifest.json
//
// Unlike `npm run art` nothing is trimmed, resized or re-encoded: every layer keeps its 1× canvas
// (480×270 scenes, 192×108 close-ups, sprite sheets) so layers line up and pixels stay crisp.
// The game scales them by whole numbers with nearest-neighbour filtering (src/pixel/pixel.ts).
// `npm run art` skips any file whose name is a pixel layer, so finals never become lossy WebP.
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';
import sharp from 'sharp';

const DRAFTS = 'art-src/pixel';
const IN = 'art/incoming';
const OUT = 'public/assets/pixel';

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Names of every pixel layer (the drafts define the set). */
export function pixelNames(): Set<string> {
  return new Set(walk(DRAFTS).filter((f) => extname(f).toLowerCase() === '.png').map((f) => basename(f, '.png')));
}

const isMain = process.argv[1] && basename(process.argv[1]).startsWith('pixel-art');
if (isMain) {
  mkdirSync(OUT, { recursive: true });
  const source = new Map<string, string>();
  for (const f of walk(DRAFTS)) if (extname(f).toLowerCase() === '.png') source.set(basename(f, '.png'), f);
  const finals: string[] = [];
  for (const f of walk(IN)) {
    const name = basename(f, extname(f));
    if (extname(f).toLowerCase() !== '.png' || !source.has(name)) continue;
    // A final must be drawn on the draft's canvas (1×). Anything else is older full-size art that
    // happens to share the name (e.g. the comic-style bg_village): leave the draft in place.
    const [a, b] = await Promise.all([sharp(source.get(name)!).metadata(), sharp(f).metadata()]).catch((e) => {
      console.warn(`! cannot read ${relative('.', f)} or its draft: ${e.message}`);
      return [{ width: -1 }, { width: -2 }] as { width?: number; height?: number }[];
    });
    if (a.width !== b.width || a.height !== b.height) {
      console.warn(`! ${relative('.', f)} is ${b.width}×${b.height}, the pixel draft is ${a.width}×${a.height}: not used as its final`);
      continue;
    }
    source.set(name, f);
    finals.push(name);
  }
  const manifest: Record<string, { file: string; w: number; h: number; final: boolean }> = {};
  const rows: string[] = [];
  for (const [name, file] of [...source].sort()) {
    const dest = join(OUT, `${name}.png`);
    if (!existsSync(dest) || statSync(file).mtimeMs > statSync(dest).mtimeMs || statSync(file).size !== statSync(dest).size) {
      copyFileSync(file, dest);
      rows.push(`${finals.includes(name) ? 'final' : 'draft'}  ${relative('.', file)} → ${dest}`);
    }
    const meta = await sharp(file).metadata();
    manifest[name] = { file: `assets/pixel/${name}.png`, w: meta.width ?? 0, h: meta.height ?? 0, final: finals.includes(name) };
  }
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(rows.length ? rows.join('\n') : 'Pixel layers up to date.');
  console.log(`manifest.json: ${Object.keys(manifest).length} layers (${finals.length} final, ${Object.keys(manifest).length - finals.length} draft)`);
}
