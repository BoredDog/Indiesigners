// V14 level search: sample a deliberately cluttered board for a level's mechanics, PRUNE every piece
// the V15 analysis calls unused (so whatever is left is needed), then keep boards whose optimum is in
// the target range, that still use all required mechanics, and that have real dead ends. Ranked by an
// "aha" score (dead-end share, a mechanic used twice, solution far from the straight walk).
// Usage: npx tsx tools/gen-v14.ts <id> [samples=4000] [seed=1]  →  prints the best few as JSON
import { initialState, parseLevel, step } from '../src/puzzle/Rules';
import { solve } from '../src/puzzle/Solver';
import { analyse, pieces, type Piece } from '../src/puzzle/Analysis';
import type { Dir, LevelFile, SentinelDef } from '../src/puzzle/types';

type Mech = 'dial' | 'lever' | 'sluice' | 'node' | 'crate' | 'sentinel' | 'collapse';
interface Barrier {
  kind: 'gate' | 'water';
  group: string;
  open?: boolean;
  openings: number;
}
interface Spec {
  w: number;
  h: number;
  shadow: [number, number];
  pillars: [number, number];
  dials?: number;
  barriers?: Barrier[];
  switches?: { kind: 'lever' | 'sluice' | 'node'; groups: string[] }[];
  crates?: number;
  sentinels?: number;
  sentinelLen?: [number, number];
  collapse?: number;
  target: [number, number];
  need: Mech[]; // must still be present (and so needed) after pruning
  twice?: Mech[]; // bonus if the solution uses one of these at least twice (the "aha")
}

const SPECS: Record<string, Spec> = {
  // Teaching levels: small, one idea, just no unused pieces.
  pz_sis_1: {
    w: 5, h: 5, shadow: [2, 2], pillars: [1, 3], dials: 1,
    barriers: [{ kind: 'gate', group: 'g1', openings: 1 }],
    switches: [{ kind: 'lever', groups: ['g1'] }],
    target: [8, 12], need: ['lever', 'dial'],
  },
  pz_bro_1: {
    w: 6, h: 6, shadow: [1, 2], pillars: [1, 3], crates: 1,
    barriers: [{ kind: 'water', group: 's1', openings: 1 }],
    switches: [{ kind: 'sluice', groups: ['s1'] }],
    target: [10, 14], need: ['sluice', 'crate'],
  },
  // Medium levels: 2+ mechanics that interact, par 16–30.
  pz_sis_2: {
    w: 6, h: 6, shadow: [2, 3], pillars: [2, 4], dials: 1,
    barriers: [{ kind: 'gate', group: 'g1', openings: 1 }, { kind: 'gate', group: 'g2', open: true, openings: 1 }],
    switches: [{ kind: 'lever', groups: ['g1', 'g2'] }, { kind: 'lever', groups: ['g2'] }],
    target: [16, 26], need: ['lever', 'dial'], twice: ['lever', 'dial'],
  },
  pz_sis_3: {
    w: 6, h: 6, shadow: [2, 3], pillars: [2, 4], dials: 2,
    barriers: [{ kind: 'gate', group: 'g1', openings: 1 }],
    switches: [{ kind: 'lever', groups: ['g1'] }],
    target: [18, 30], need: ['lever', 'dial'], twice: ['dial'],
  },
  pz_bro_2: {
    w: 6, h: 6, shadow: [1, 2], pillars: [1, 3], crates: 1,
    barriers: [{ kind: 'water', group: 's1', openings: 1 }, { kind: 'water', group: 's2', open: true, openings: 1 }],
    switches: [{ kind: 'sluice', groups: ['s1', 's2'] }],
    target: [16, 26], need: ['sluice', 'crate'], twice: ['sluice'],
  },
  pz_bro_3: {
    w: 6, h: 6, shadow: [2, 2], pillars: [1, 3], crates: 2, dials: 1,
    barriers: [{ kind: 'water', group: 's1', openings: 1 }, { kind: 'water', group: 's2', open: true, openings: 1 }],
    switches: [{ kind: 'sluice', groups: ['s1', 's2'] }],
    target: [18, 30], need: ['sluice', 'crate', 'dial'], twice: ['sluice', 'dial'],
  },
  pz_mom_2: {
    // Echoes + network nodes, with a dial so the light can close routes too (dead ends).
    w: 6, h: 6, shadow: [2, 2], pillars: [2, 3], sentinels: 2, sentinelLen: [2, 4], dials: 1,
    barriers: [{ kind: 'gate', group: 'g1', openings: 1 }, { kind: 'gate', group: 'g2', open: true, openings: 1 }],
    switches: [{ kind: 'node', groups: ['g1', 'g2'] }, { kind: 'node', groups: ['g2'] }],
    target: [16, 26], need: ['node', 'sentinel'], twice: ['node'],
  },
  pz_mom_3: {
    w: 7, h: 7, shadow: [2, 2], pillars: [2, 4], sentinels: 2, sentinelLen: [2, 4], dials: 1,
    barriers: [{ kind: 'gate', group: 'g1', openings: 1 }, { kind: 'gate', group: 'g2', open: true, openings: 1 }],
    switches: [{ kind: 'node', groups: ['g1', 'g2'] }, { kind: 'node', groups: ['g2'] }],
    target: [18, 30], need: ['node', 'sentinel', 'dial'], twice: ['node', 'dial'],
  },
  pz_archive: {
    w: 7, h: 7, shadow: [2, 2], pillars: [2, 4], dials: 1, sentinels: 1, sentinelLen: [2, 3], collapse: 0.5,
    barriers: [{ kind: 'gate', group: 'g1', openings: 1 }],
    switches: [{ kind: 'lever', groups: ['g1'] }],
    target: [18, 30], need: ['collapse', 'lever', 'dial'], twice: ['dial', 'lever'],
  },
};

let seed = 1;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0), seed / 2 ** 32);
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
    const c: [number, number][] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y][x] === '.') c.push([x, y]);
    return c;
  };
  const place = (ch: string) => {
    const c = free();
    if (!c.length) return null;
    const [x, y] = pick(c);
    g[y][x] = ch;
    return [x, y] as [number, number];
  };
  const used = new Set<string>();
  const kinds = new Map<string, number>();
  for (const b of spec.barriers ?? []) {
    let placed = false;
    for (let tries = 0; tries < 30 && !placed; tries++) {
      const vertical = rnd() < 0.5;
      const len = vertical ? h : w;
      const idx = ri(1, (vertical ? w : h) - 2);
      if ([idx - 1, idx, idx + 1].some((k) => used.has(`${vertical}${k}`))) continue;
      used.add(`${vertical}${idx}`);
      const gi = kinds.get(b.kind) ?? 0;
      kinds.set(b.kind, gi + 1);
      const ch = b.kind === 'gate' ? (b.open ? GATE_OPEN : GATE)[gi] : (b.open ? WATER_DRY : WATER)[gi];
      legend[ch] = `${b.kind}:${b.group}${b.open ? (b.kind === 'gate' ? ':open' : ':dry') : ''}`;
      // A barrier may stop short of one edge, leaving a long way round.
      const from = rnd() < 0.3 ? 1 : 0;
      const to = rnd() < 0.3 ? len - 2 : len - 1;
      const openings = new Set<number>();
      while (openings.size < b.openings) openings.add(ri(from, to));
      for (let k = from; k <= to; k++) {
        const [x, y] = vertical ? [idx, k] : [k, idx];
        g[y][x] = b.kind === 'water' ? ch : openings.has(k) ? ch : '_';
      }
      placed = true;
    }
  }
  (spec.switches ?? []).forEach((s, i) => {
    legend[SWITCH[i]] = `${s.kind}:${s.groups.join(',')}`;
    place(SWITCH[i]);
  });
  for (let i = 0; i < (spec.dials ?? 0); i++) place('D');
  for (let i = 0, n = ri(...spec.pillars); i < n; i++) place('#');
  for (let i = 0; i < (spec.crates ?? 0); i++) place('C');
  const s = place('S');
  const goal = place('G');
  if (!s || !goal || Math.abs(s[0] - goal[0]) + Math.abs(s[1] - goal[1]) < Math.max(w, h) - 1) return null;
  if (spec.collapse) for (const [x, y] of free()) if (rnd() < spec.collapse) g[y][x] = 'x';
  const sentinels: SentinelDef[] = [];
  // Echo patrols grow from a random open tile along open floor (retry until one fits).
  const taken = new Set<string>();
  for (let i = 0; i < (spec.sentinels ?? 0); i++) {
    const want = ri(...(spec.sentinelLen ?? [2, 3]));
    let best: [number, number][] = [];
    for (let tries = 0; tries < 25 && best.length < want; tries++) {
      const open = free().filter(([x, y]) => !taken.has(`${x},${y}`));
      if (!open.length) break;
      let [x, y] = pick(open);
      const [dx, dy] = pick([[1, 0], [0, 1], [-1, 0], [0, -1]] as [number, number][]);
      const path: [number, number][] = [[x, y]];
      while (path.length < want) {
        x += dx;
        y += dy;
        if (x < 0 || y < 0 || x >= w || y >= h || !'.x'.includes(g[y][x]) || taken.has(`${x},${y}`)) break;
        path.push([x, y]);
      }
      if (path.length > best.length) best = path;
    }
    if (best.length < 2) return null;
    best.forEach(([x, y]) => taken.add(`${x},${y}`));
    sentinels.push({ path: best });
  }
  return {
    id: 'cand',
    tiles: g.map((r) => r.join('')),
    legend,
    light: pick(['N', 'E', 'S', 'W'] as Dir[]),
    shadow: ri(...spec.shadow),
    sentinels: sentinels.length ? sentinels : undefined,
    par: 0,
  };
}

/** Removes a piece from the level FILE (cells → '.', sentinel deleted). */
function removeFromFile(f: LevelFile, p: Piece, w: number): LevelFile {
  if (p.kind === 'sentinel') return { ...f, sentinels: (f.sentinels ?? []).filter((_, n) => n !== p.cells[0]) };
  const tiles = f.tiles.map((r) => [...r]);
  for (const i of p.cells) tiles[Math.floor(i / w)][i % w] = '.';
  return { ...f, tiles: tiles.map((r) => r.join('')) };
}

const mechOf = (p: Piece): Mech | 'gate' | 'water' => (p.kind === 'gate' || p.kind === 'water' ? p.kind : (p.kind as Mech));

function uses(f: LevelFile, moves: Dir[]): Map<string, number> {
  const l = parseLevel(f);
  let s = initialState(l);
  const n = new Map<string, number>();
  for (const d of moves) {
    const r = step(l, s, d);
    const c = l.cells[r.state.pos];
    const k = r.pushed ? 'crate' : c.k === 'dial' ? 'dial' : c.k === 'switch' ? c.kind : '';
    if (k) n.set(k, (n.get(k) ?? 0) + 1);
    s = r.state;
  }
  return n;
}

const id = process.argv[2];
const spec = SPECS[id];
if (!spec) {
  console.error(`unknown id; one of ${Object.keys(SPECS).join(', ')}`);
  process.exit(1);
}
const samples = Number(process.argv[3] ?? 4000);
seed = Number(process.argv[4] ?? 1);
const found: { f: LevelFile; par: number; score: number; info: string }[] = [];
const why = new Map<string, number>();
const rej = (k: string) => why.set(k, (why.get(k) ?? 0) + 1);
for (let i = 0; i < samples; i++) {
  let f = sample(spec);
  if (!f) {
    rej('sample');
    continue;
  }
  try {
    // Prune until every piece is needed (max 12 rounds).
    let a = analyse(parseLevel(f));
    for (let k = 0; k < 12 && a.par > 0 && a.unused.length; k++) {
      f = removeFromFile(f, a.unused[0], spec.w);
      a = analyse(parseLevel(f));
    }
    if (a.par < 0) {
      rej('unsolvable');
      continue;
    }
    if (a.unused.length) {
      rej('prune');
      continue;
    }
    if (a.par < spec.target[0] || a.par > spec.target[1]) {
      rej(`par ${a.par < spec.target[0] ? 'low' : 'high'}`);
      continue;
    }
    const l = parseLevel(f);
    const present = new Set(pieces(l).map(mechOf));
    if (!spec.need.every((m) => present.has(m))) {
      rej('lost mechanic');
      continue;
    }
    if (a.deadEnds === 0) {
      rej('no dead ends');
      continue;
    }
    const sol = solve(l)!;
    const u = uses(f, sol.moves);
    const twice = (spec.twice ?? []).filter((m) => (u.get(m) ?? 0) >= 2);
    const [sx, sy] = [l.start % l.w, Math.floor(l.start / l.w)];
    const [gx, gy] = [l.goal % l.w, Math.floor(l.goal / l.w)];
    const detour = a.par - (Math.abs(sx - gx) + Math.abs(sy - gy));
    const deadShare = a.deadEnds / a.reachable;
    // Pacing back and forth (E then W…) is busywork, not an aha: penalise every immediate reversal.
    const opposite: Record<string, string> = { N: 'S', S: 'N', E: 'W', W: 'E' };
    const reversals = sol.moves.filter((m, k) => k > 0 && opposite[m] === sol.moves[k - 1]).length;
    if (deadShare < 0.05) {
      rej('few dead ends');
      continue;
    }
    const score = deadShare * 40 + twice.length * 15 + detour + Math.min(a.reachable, 3000) / 300 - reversals * 4;
    found.push({
      f: { ...f, par: a.par },
      par: a.par,
      score,
      info: `rev ${reversals} par ${a.par} reachable ${a.reachable} dead ${a.deadEnds} (${Math.round(deadShare * 100)}%) detour ${detour} twice [${twice}] uses ${JSON.stringify(Object.fromEntries(u))}`,
    });
  } catch (e) {
    rej('error ' + String(e).slice(0, 60));
  }
}
found.sort((x, y) => y.score - x.score);
for (const c of found.slice(0, 4)) {
  console.log(`--- score ${c.score.toFixed(1)}  ${c.info}`);
  console.log(JSON.stringify({ tiles: c.f.tiles, legend: c.f.legend, light: c.f.light, shadow: c.f.shadow, sentinels: c.f.sentinels, par: c.par }));
}
console.log(`${found.length} candidates for ${id}; rejected: ${JSON.stringify(Object.fromEntries(why))}`);
