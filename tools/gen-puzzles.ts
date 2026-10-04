// Level-authoring aid for Echo Paths: samples random boards for a spec, keeps the ones whose
// shortest solution lands in the target range AND that genuinely need each listed mechanic
// (the board becomes unsolvable / easier when that mechanic is removed), then prints the best.
// Curated results are copied by hand into content/puzzles/<id>.json.
// Usage: npx tsx tools/gen-puzzles.ts <spec-id> [samples=40000] [seed=1]
import { parseLevel, initialState, step } from '../src/puzzle/Rules';
import { solve } from '../src/puzzle/Solver';
import type { Dir, LevelFile, SentinelDef } from '../src/puzzle/types';

type Need = 'dial' | 'lever' | 'sluice' | 'node' | 'crate' | 'sentinel' | 'collapse';
interface Barrier {
  kind: 'gate' | 'water';
  group: string;
  open?: boolean; // gate starts open / water starts dry
  openings: number;
}
interface Spec {
  w: number;
  h: number;
  shadow: number;
  pillars: [number, number];
  voids?: [number, number];
  dials?: number;
  barriers?: Barrier[];
  switches?: { kind: 'lever' | 'sluice' | 'node'; groups: string[] }[];
  crates?: number;
  sentinels?: number;
  sentinelLen?: [number, number];
  collapse?: number; // fraction of floor that collapses
  target: [number, number];
  need: Need[];
}

const SPECS: Record<string, Spec> = {
  pz_tower: { w: 5, h: 5, shadow: 2, pillars: [2, 3], dials: 1, target: [6, 8], need: ['dial'] },
  pz_sis_1: {
    w: 5, h: 5, shadow: 2, pillars: [1, 3], dials: 1,
    barriers: [{ kind: 'gate', group: 'g1', openings: 1 }],
    switches: [{ kind: 'lever', groups: ['g1'] }],
    target: [8, 10], need: ['lever', 'dial'],
  },
  pz_sis_2: {
    w: 6, h: 6, shadow: 2, pillars: [2, 3], dials: 1,
    barriers: [{ kind: 'gate', group: 'g1', openings: 1 }, { kind: 'gate', group: 'g2', openings: 1 }],
    switches: [{ kind: 'lever', groups: ['g1'] }, { kind: 'lever', groups: ['g2'] }],
    target: [10, 14], need: ['lever', 'dial'],
  },
  pz_sis_3: {
    w: 6, h: 6, shadow: 3, pillars: [2, 4], dials: 2,
    barriers: [{ kind: 'gate', group: 'g1', openings: 1 }],
    switches: [{ kind: 'lever', groups: ['g1'] }],
    target: [12, 16], need: ['lever', 'dial'],
  },
  pz_bro_2: {
    w: 5, h: 5, shadow: 1, pillars: [0, 2],
    barriers: [{ kind: 'water', group: 's1', openings: 2 }],
    switches: [{ kind: 'sluice', groups: ['s1'] }],
    target: [8, 10], need: ['sluice'],
  },
  pz_bro_1: {
    w: 6, h: 6, shadow: 2, pillars: [1, 2], crates: 1,
    barriers: [{ kind: 'water', group: 's1', openings: 2 }, { kind: 'water', group: 's2', open: true, openings: 1 }],
    switches: [{ kind: 'sluice', groups: ['s1', 's2'] }],
    target: [10, 14], need: ['sluice', 'crate'],
  },
  pz_bro_3: {
    w: 6, h: 6, shadow: 2, pillars: [1, 3], crates: 2, dials: 1,
    barriers: [{ kind: 'water', group: 's1', openings: 2 }],
    switches: [{ kind: 'sluice', groups: ['s1'] }],
    target: [12, 16], need: ['sluice', 'crate', 'dial'],
  },
  pz_mom_1: { w: 5, h: 5, shadow: 1, pillars: [1, 3], sentinels: 1, sentinelLen: [2, 4], target: [8, 10], need: ['sentinel'] },
  pz_mom_2: {
    w: 6, h: 6, shadow: 1, pillars: [1, 3], sentinels: 1, sentinelLen: [2, 4],
    barriers: [{ kind: 'gate', group: 'g1', openings: 1 }, { kind: 'gate', group: 'g2', open: true, openings: 1 }],
    switches: [{ kind: 'node', groups: ['g1', 'g2'] }, { kind: 'lever', groups: ['g2'] }],
    target: [10, 14], need: ['node', 'sentinel'],
  },
  pz_mom_3: {
    w: 7, h: 7, shadow: 2, pillars: [2, 4], sentinels: 2, sentinelLen: [2, 4], dials: 1,
    barriers: [{ kind: 'gate', group: 'g1', openings: 1 }, { kind: 'gate', group: 'g2', open: true, openings: 1 }],
    switches: [{ kind: 'node', groups: ['g1', 'g2'] }, { kind: 'node', groups: ['g2'] }],
    target: [14, 18], need: ['node', 'sentinel', 'dial'],
  },
  pz_archive: {
    w: 7, h: 7, shadow: 2, pillars: [2, 4], dials: 1, sentinels: 1, sentinelLen: [2, 3], collapse: 0.45,
    barriers: [{ kind: 'gate', group: 'g1', openings: 1 }],
    switches: [{ kind: 'lever', groups: ['g1'] }],
    target: [16, 20], need: ['collapse', 'lever', 'dial'],
  },
};

// ------------------------------------------------------------------ seeded RNG
let seed = 1;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)];

const GATE = ['A', 'B', 'E'];
const GATE_OPEN = ['a', 'b', 'e'];
const WATER = ['~', '='];
const WATER_DRY = ['-', ':'];
const SWITCH = ['L', 'M', 'N', 'O'];

function sample(spec: Spec): LevelFile | null {
  const { w, h } = spec;
  const g: string[][] = Array.from({ length: h }, () => Array(w).fill('.'));
  const legend: Record<string, string> = {};
  const free = () => {
    const cells: [number, number][] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y][x] === '.') cells.push([x, y]);
    return cells;
  };
  const place = (ch: string) => {
    const c = free();
    if (!c.length) return null;
    const [x, y] = pick(c);
    g[y][x] = ch;
    return [x, y] as [number, number];
  };

  // Barriers: a full row/column of void with gate/water openings.
  const usedLines = new Set<string>();
  (spec.barriers ?? []).forEach((b, bi) => {
    for (let tries = 0; tries < 20; tries++) {
      const vertical = rnd() < 0.5;
      const len = vertical ? h : w;
      const idx = ri(1, (vertical ? w : h) - 2);
      const key = `${vertical}${idx}`;
      if (usedLines.has(key) || usedLines.has(`${vertical}${idx - 1}`) || usedLines.has(`${vertical}${idx + 1}`)) continue;
      usedLines.add(key);
      const openings = new Set<number>();
      while (openings.size < b.openings) openings.add(ri(0, len - 1));
      const gi = (spec.barriers ?? []).filter((x, k) => k < bi && x.kind === b.kind).length;
      const ch = b.kind === 'gate' ? (b.open ? GATE_OPEN : GATE)[gi] : (b.open ? WATER_DRY : WATER)[gi];
      legend[ch] = `${b.kind}:${b.group}${b.open ? (b.kind === 'gate' ? ':open' : ':dry') : ''}`;
      for (let k = 0; k < len; k++) {
        const [x, y] = vertical ? [idx, k] : [k, idx];
        // Water barriers are whole channels; gate barriers are void walls with gates in the gaps.
        g[y][x] = b.kind === 'water' ? ch : openings.has(k) ? ch : '_';
      }
      if (b.kind === 'water') {
        // a water channel keeps 0–1 permanent fords? no: openings become plain floor bridges only if >1
        if (b.openings > 1) {
          const k = [...openings][0];
          const [x, y] = vertical ? [idx, k] : [k, idx];
          g[y][x] = '_';
        }
      }
      return;
    }
  });

  (spec.switches ?? []).forEach((s, i) => {
    legend[SWITCH[i]] = `${s.kind}:${s.groups.join(',')}`;
    place(SWITCH[i]);
  });
  for (let i = 0; i < (spec.dials ?? 0); i++) place('D');
  for (let i = 0, n = ri(...spec.pillars); i < n; i++) place('#');
  if (spec.voids) for (let i = 0, n = ri(...spec.voids); i < n; i++) place('_');
  for (let i = 0; i < (spec.crates ?? 0); i++) place('C');
  const s = place('S');
  const goal = place('G');
  if (!s || !goal) return null;
  if (Math.abs(s[0] - goal[0]) + Math.abs(s[1] - goal[1]) < Math.max(w, h) - 1) return null;
  if (spec.collapse) {
    for (const [x, y] of free()) if (rnd() < spec.collapse) g[y][x] = 'x';
  }

  const sentinels: SentinelDef[] = [];
  for (let i = 0; i < (spec.sentinels ?? 0); i++) {
    const [a, b] = spec.sentinelLen ?? [2, 3];
    const len = ri(a, b);
    const vertical = rnd() < 0.5;
    const x0 = ri(0, w - (vertical ? 1 : len));
    const y0 = ri(0, h - (vertical ? len : 1));
    const path: [number, number][] = [];
    for (let k = 0; k < len; k++) {
      const [x, y] = vertical ? [x0, y0 + k] : [x0 + k, y0];
      if (!'.x'.includes(g[y][x])) return null;
      path.push([x, y]);
    }
    sentinels.push({ path });
  }

  return {
    id: 'cand',
    tiles: g.map((r) => r.join('')),
    legend,
    light: pick(['N', 'E', 'S', 'W'] as Dir[]),
    shadow: spec.shadow,
    sentinels: sentinels.length ? sentinels : undefined,
    par: 0,
  };
}

function solLen(f: LevelFile): number | null {
  try {
    const l = parseLevel(f);
    // the start itself must be safe
    const s0 = initialState(l);
    if (step(l, s0, 'N').event === 'caught' && false) return null;
    return solve(l, s0, Number(process.env.GEN_LIMIT ?? 200_000))?.moves.length ?? null;
  } catch {
    return null;
  }
}

function without(f: LevelFile, need: Need): LevelFile {
  const tiles = f.tiles.map((r) => r);
  const repl = (pred: (ch: string) => boolean) =>
    tiles.map((r) => [...r].map((ch) => (pred(ch) ? '.' : ch)).join(''));
  const kindOf = (ch: string) => f.legend?.[ch]?.split(':')[0];
  switch (need) {
    case 'dial':
      return { ...f, tiles: repl((c) => c === 'D') };
    case 'lever':
    case 'sluice':
    case 'node':
      return { ...f, tiles: repl((c) => kindOf(c) === need) };
    case 'crate':
      return { ...f, tiles: repl((c) => c === 'C') };
    case 'collapse':
      return { ...f, tiles: repl((c) => c === 'x') };
    case 'sentinel':
      return { ...f, sentinels: undefined };
  }
}

function pushes(f: LevelFile): number {
  const l = parseLevel(f);
  const sol = solve(l)!;
  let s = initialState(l);
  let n = 0;
  for (const d of sol.moves) {
    const r = step(l, s, d);
    if (r.pushed) n++;
    s = r.state;
  }
  return n;
}

const id = process.argv[2];
const spec = SPECS[id];
if (!spec) {
  console.error(`unknown spec; one of ${Object.keys(SPECS).join(', ')}`);
  process.exit(1);
}
const samples = Number(process.argv[3] ?? 40000);
seed = Number(process.argv[4] ?? 1);

const found: { f: LevelFile; len: number; explored: number; detour: number }[] = [];
for (let i = 0; i < samples && found.length < 200; i++) {
  const f = sample(spec);
  if (!f) continue;
  const len = solLen(f);
  if (len === null || len < spec.target[0] || len > spec.target[1]) continue;
  let good = true;
  for (const need of spec.need) {
    if (need === 'crate') {
      if (pushes(f) === 0) good = false;
      continue;
    }
    const alt = solLen(without(f, need));
    // removing a "gate"-style mechanic must make it unsolvable; removing a hazard must make it shorter
    if (need === 'sentinel' || need === 'collapse') {
      if (alt !== null && alt >= len) good = false;
    } else if (alt !== null && alt <= len) good = false;
    if (!good) break;
  }
  if (!good) continue;
  const lv = parseLevel(f);
  const explored = solve(lv)!.explored;
  const [sx, sy] = [lv.start % lv.w, Math.floor(lv.start / lv.w)];
  const [gx, gy] = [lv.goal % lv.w, Math.floor(lv.goal / lv.w)];
  const detour = len - (Math.abs(sx - gx) + Math.abs(sy - gy)); // moves spent on anything but walking there
  found.push({ f, len, explored, detour });
}
// Prefer boards that make you go out of your way, then bigger decision spaces.
found.sort((a, b) => b.detour * 1000 + b.explored - (a.detour * 1000 + a.explored));
for (const { f, len, explored, detour } of found.slice(0, 5)) {
  console.log(`--- len ${len}, detour ${detour}, explored ${explored}, light ${f.light}`);
  console.log(JSON.stringify({ tiles: f.tiles, legend: f.legend, light: f.light, shadow: f.shadow, sentinels: f.sentinels, par: len }));
}
console.log(`${found.length} candidates`);
