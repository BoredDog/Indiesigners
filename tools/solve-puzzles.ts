// Proves every Echo Paths level in content/puzzles/ is solvable within par + 4 (PLAN.md §3.4)
// and prints its shortest solution (the hint path). Exits 1 on a broken or unsolvable level, so
// `npm run build` (and CI) fails before a bad level can ship.
// V15: also reports, per level, dead ends (states that can no longer reach the goal) and UNUSED
// pieces (removing it still solves at the same optimal length). With --strict an unused piece fails.
// Usage: npx tsx tools/solve-puzzles.ts [--show] [--strict] [id ...]
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { initialState, inkTiles, parseLevel, sentinelAt } from '../src/puzzle/Rules';
import { solve } from '../src/puzzle/Solver';
import { analyse } from '../src/puzzle/Analysis';
import type { Level, LevelFile, State } from '../src/puzzle/types';
import evidenceJson from '../content/evidence.json';

export const dir = join(import.meta.dirname, '..', 'content', 'puzzles');
const args = process.argv.slice(2);
const show = args.includes('--show');
const strict = args.includes('--strict');
const only = args.filter((a) => !a.startsWith('--'));

/** ASCII board: ink tiles as '▓', sentinels as '!', wisp as '@'. */
export function draw(level: Level, s: State): string {
  const ink = inkTiles(level, s);
  const sent = new Set(level.sentinels.map((_, n) => sentinelAt(level, n, s.t).pos));
  const rows: string[] = [];
  for (let y = 0; y < level.h; y++) {
    let row = '';
    for (let x = 0; x < level.w; x++) {
      const i = y * level.w + x;
      const c = level.cells[i];
      let ch =
        c.k === 'pillar' ? '#' : c.k === 'void' ? ' ' : c.k === 'goal' ? 'G' : c.k === 'dial' ? 'D' : c.k === 'collapse' ? 'x' : '.';
      if (c.k === 'gate') ch = (c.open !== !!(s.toggles & (1 << c.group))) ? '/' : '|';
      if (c.k === 'water') ch = (c.dry !== !!(s.toggles & (1 << c.group))) ? ',' : '~';
      if (c.k === 'switch') ch = c.kind === 'lever' ? 'L' : c.kind === 'sluice' ? 'W' : 'O';
      if (s.collapsed.includes(i)) ch = ' ';
      if (ink.has(i)) ch = '▓';
      if (s.crates.includes(i)) ch = 'C';
      if (sent.has(i)) ch = '!';
      if (s.pos === i) ch = '@';
      row += ch;
    }
    rows.push(row);
  }
  return rows.join('\n');
}

const evidenceIds = new Set(evidenceJson.evidence.map((e) => e.id));
const puzzleOf = new Map(evidenceJson.evidence.filter((e) => e.puzzle).map((e) => [e.puzzle!, e.id]));

let failed = 0;
const files = readdirSync(dir).filter((f) => f.endsWith('.json') && (!only.length || only.includes(f.replace('.json', ''))));
for (const file of files.sort()) {
  const raw = JSON.parse(readFileSync(join(dir, file), 'utf8')) as LevelFile;
  const tag = file.replace('.json', '');
  try {
    if (raw.id !== tag) throw new Error(`id "${raw.id}" does not match file name`);
    if (raw.reward && !evidenceIds.has(raw.reward)) throw new Error(`reward ${raw.reward} is not in evidence.json`);
    if (puzzleOf.has(raw.id) && raw.reward !== puzzleOf.get(raw.id)) {
      throw new Error(`reward ${raw.reward} but evidence.json maps ${raw.id} → ${puzzleOf.get(raw.id)}`);
    }
    const level = parseLevel(raw);
    const t0 = Date.now();
    const sol = solve(level);
    if (!sol) throw new Error('UNSOLVABLE');
    const n = sol.moves.length;
    const verdict = n > level.par + 4 ? 'FAIL (over par+4)' : n < level.par ? 'FAIL (beats par: lower par)' : 'ok';
    if (verdict !== 'ok') failed++;
    console.log(
      `${verdict.padEnd(4)} ${tag.padEnd(11)} ${level.w}x${level.h}  par ${String(level.par).padStart(2)}  best ${String(n).padStart(2)}  ` +
        `states ${String(sol.explored).padStart(7)}  ${Date.now() - t0}ms  ${sol.moves.join('')}`,
    );
    const a = analyse(level);
    console.log(`     ${''.padEnd(11)} reachable ${a.reachable}  dead ends ${a.deadEnds}  unused pieces ${a.unused.length}`);
    if (a.unused.length) {
      console.log(`${strict ? 'FAIL' : 'warn'}   unused: ${a.unused.map((p) => p.label).join(', ')}`);
      if (strict) failed++;
    }
    if (show) console.log(draw(level, initialState(level)).replace(/^/gm, '    ') + '\n');
  } catch (e) {
    failed++;
    console.log(`FAIL ${tag}: ${(e as Error).message}`);
  }
}
if (!files.length) console.log('no levels in content/puzzles yet');
if (failed) {
  console.error(`${failed} level(s) failed`);
  process.exit(1);
}
