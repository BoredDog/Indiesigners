// Echo Paths rules engine (PLAN.md §3.1–3.2). Pure functions over immutable State, shared by the
// Puzzle scene, the in-game hint and tools/solve-puzzles.ts.
//
// One turn: the wisp moves 1 tile (pushing a crate if there is one) → the tile it entered acts
// (dial rotates the light, lever/sluice/node toggles its groups) → the tile it left collapses if
// it was collapsing floor → sentinels step → shadows are recast. Then: wisp on ink = slip,
// wisp on/in front of a sentinel = caught, wisp on the goal = win.
import { DIR_ORDER, DIRS, type Cell, type Dir, type Level, type LevelFile, type State, type StepResult } from './types';

const BUILTIN: Record<string, string> = {
  '.': 'floor',
  '#': 'pillar',
  _: 'void',
  ' ': 'void',
  S: 'start',
  G: 'goal',
  D: 'dial',
  C: 'crate',
  x: 'collapse',
};

/** Parses and validates a level file. Throws with a readable message on authoring errors. */
export function parseLevel(file: LevelFile): Level {
  const h = file.tiles.length;
  const w = file.tiles[0]?.length ?? 0;
  const fail = (msg: string): never => {
    throw new Error(`${file.id}: ${msg}`);
  };
  if (!h || !w) fail('empty tiles');
  const groups: string[] = [];
  const group = (name: string) => {
    let i = groups.indexOf(name);
    if (i < 0) {
      i = groups.push(name) - 1;
      if (i > 30) fail('too many groups');
    }
    return i;
  };

  const cells: Cell[] = [];
  const crates: number[] = [];
  let start = -1;
  let goal = -1;
  file.tiles.forEach((row, y) => {
    if (row.length !== w) fail(`row ${y} has length ${row.length}, expected ${w}`);
    [...row].forEach((ch, x) => {
      const i = y * w + x;
      const spec = file.legend?.[ch] ?? BUILTIN[ch] ?? fail(`unknown tile '${ch}' at ${x},${y}`);
      const [kind, arg = '', flag] = spec.split(':');
      switch (kind) {
        case 'floor':
        case 'pillar':
        case 'void':
        case 'dial':
        case 'collapse':
          cells.push({ k: kind });
          break;
        case 'start':
          if (start >= 0) fail('two starts');
          start = i;
          cells.push({ k: 'floor' });
          break;
        case 'goal':
          if (goal >= 0) fail('two goals');
          goal = i;
          cells.push({ k: 'goal' });
          break;
        case 'crate':
          crates.push(i);
          cells.push({ k: 'floor' });
          break;
        case 'gate':
          cells.push({ k: 'gate', group: group(arg), open: flag === 'open' });
          break;
        case 'water':
          cells.push({ k: 'water', group: group(arg), dry: flag === 'dry' });
          break;
        case 'lever':
        case 'sluice':
        case 'node': {
          const gs = arg.split(',').filter(Boolean).map(group);
          if (!gs.length) fail(`${kind} at ${x},${y} has no group`);
          cells.push({ k: 'switch', kind, groups: gs, mask: gs.reduce((m, g) => m | (1 << g), 0) });
          break;
        }
        default:
          fail(`unknown tile kind '${spec}'`);
      }
    });
  });
  if (start < 0) fail('no start (S)');
  if (goal < 0) fail('no goal (G)');
  const light = DIR_ORDER.indexOf(file.light);
  if (light < 0) fail(`bad light '${file.light}'`);

  const sentinels = (file.sentinels ?? []).map((s, n) => {
    if (!s.path.length) fail(`sentinel ${n} has an empty path`);
    const path = s.path.map(([x, y]) => {
      if (x < 0 || y < 0 || x >= w || y >= h) fail(`sentinel ${n} leaves the board at ${x},${y}`);
      return y * w + x;
    });
    for (let k = 1; k < path.length + (s.loop ? 1 : 0); k++) {
      const a = path[k - 1];
      const b = path[k % path.length];
      if (Math.abs((a % w) - (b % w)) + Math.abs(Math.floor(a / w) - Math.floor(b / w)) !== 1) {
        fail(`sentinel ${n} path is not a chain of adjacent tiles (step ${k})`);
      }
    }
    return { path, loop: !!s.loop && path.length > 2, face: s.face ?? 'S' };
  });

  return {
    id: file.id,
    title: file.title ?? file.id,
    tip: file.tip,
    w,
    h,
    cells,
    groups,
    start,
    goal,
    light,
    shadow: file.shadow ?? 2,
    crates: crates.sort((a, b) => a - b),
    sentinels,
    period: sentinels.reduce((p, s) => lcm(p, s.path.length < 2 ? 1 : s.loop ? s.path.length : 2 * (s.path.length - 1)), 1),
    par: file.par,
    reward: file.reward,
  };
}

export function initialState(level: Level): State {
  return { pos: level.start, light: level.light, toggles: 0, crates: level.crates, t: 0, collapsed: [] };
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

/** Stable key for search / dedup (turn count only matters modulo the sentinel period). */
export function stateKey(level: Level, s: State): string {
  return `${s.pos}|${s.light}|${s.toggles}|${s.crates.join(',')}|${s.t % level.period}|${s.collapsed.join(',')}`;
}

// ------------------------------------------------------------------ queries

export const xy = (level: Level, i: number): [number, number] => [i % level.w, Math.floor(i / level.w)];

export function neighbour(level: Level, i: number, d: Dir): number {
  const [x, y] = xy(level, i);
  const nx = x + DIRS[d][0];
  const ny = y + DIRS[d][1];
  return nx < 0 || ny < 0 || nx >= level.w || ny >= level.h ? -1 : ny * level.w + nx;
}

export function gateOpen(cell: Cell & { k: 'gate' }, s: State): boolean {
  return cell.open !== !!(s.toggles & (1 << cell.group));
}

export function waterDry(cell: Cell & { k: 'water' }, s: State): boolean {
  return cell.dry !== !!(s.toggles & (1 << cell.group));
}

/** Tall things cast shadow: pillars and crates. */
function isTall(level: Level, s: State, i: number): boolean {
  return level.cells[i].k === 'pillar' || s.crates.includes(i);
}

/** Every ink (shadowed) tile for this state. */
export function inkTiles(level: Level, s: State): Set<number> {
  const ink = new Set<number>();
  const away = DIR_ORDER[(s.light + 2) % 4]; // shadows fall away from the light
  const cast = (from: number) => {
    let i = from;
    for (let k = 0; k < level.shadow; k++) {
      i = neighbour(level, i, away);
      if (i < 0 || isTall(level, s, i)) return;
      ink.add(i);
    }
  };
  level.cells.forEach((c, i) => c.k === 'pillar' && cast(i));
  s.crates.forEach(cast);
  return ink;
}

/** Sentinel position and the tile it is facing (its next step) at turn t. */
export function sentinelAt(level: Level, n: number, t: number): { pos: number; facing: number; dir: Dir } {
  const s = level.sentinels[n];
  const len = s.path.length;
  if (len === 1) return { pos: s.path[0], facing: neighbour(level, s.path[0], s.face), dir: s.face };
  const idx = (k: number) => {
    if (s.loop) return k % len;
    const period = 2 * (len - 1);
    const m = k % period;
    return m < len ? m : period - m;
  };
  const pos = s.path[idx(t)];
  const next = s.path[idx(t + 1)];
  const [px, py] = xy(level, pos);
  const [nx, ny] = xy(level, next);
  const dir: Dir = nx > px ? 'E' : nx < px ? 'W' : ny > py ? 'S' : 'N';
  return { pos, facing: next, dir };
}

/** True if a sentinel stands on or faces `pos` at turn t. */
export function threatened(level: Level, pos: number, t: number): boolean {
  for (let n = 0; n < level.sentinels.length; n++) {
    const a = sentinelAt(level, n, t);
    if (a.pos === pos || a.facing === pos) return true;
  }
  return false;
}

type Block = StepResult['reason'];

/** Why the wisp can't stand on tile i (ignoring ink, crates and sentinels), or undefined. */
function terrainBlock(level: Level, s: State, i: number): Block {
  const c = level.cells[i];
  if (c.k === 'pillar') return 'wall';
  if (c.k === 'void' || s.collapsed.includes(i)) return 'void';
  if (c.k === 'gate' && !gateOpen(c, s)) return 'gate';
  if (c.k === 'water' && !waterDry(c, s)) return 'water';
  return undefined;
}

// ------------------------------------------------------------------ the turn

export function step(level: Level, s: State, d: Dir): StepResult {
  const blocked = (reason: Block): StepResult => ({ event: 'blocked', state: s, reason });
  const n = neighbour(level, s.pos, d);
  if (n < 0) return blocked('edge');
  const tb = terrainBlock(level, s, n);
  if (tb) return blocked(tb);
  if (inkTiles(level, s).has(n)) return blocked('ink');

  let crates = s.crates;
  let pushed: StepResult['pushed'];
  if (crates.includes(n)) {
    const m = neighbour(level, n, d);
    const sentinelThere = m >= 0 && level.sentinels.some((_, k) => sentinelAt(level, k, s.t).pos === m);
    if (m < 0 || terrainBlock(level, s, m) || crates.includes(m) || level.cells[m].k === 'goal' || sentinelThere) {
      return blocked('crate');
    }
    crates = crates.map((c) => (c === n ? m : c)).sort((a, b) => a - b);
    pushed = { from: n, to: m };
  }

  const cell = level.cells[n];
  let light = s.light;
  let toggles = s.toggles;
  let rotated: boolean | undefined;
  let toggled: number[] | undefined;
  if (cell.k === 'dial') {
    light = (light + 1) % 4;
    rotated = true;
  } else if (cell.k === 'switch') {
    toggles ^= cell.mask;
    toggled = cell.groups;
  }

  let collapsed = s.collapsed;
  let fell: number | undefined;
  if (level.cells[s.pos].k === 'collapse') {
    fell = s.pos;
    collapsed = [...collapsed, s.pos].sort((a, b) => a - b);
  }

  // Walking into a sentinel's current tile is as bad as being caught after it moves.
  const walkedIntoSentinel = level.sentinels.some((_, k) => sentinelAt(level, k, s.t).pos === n);

  const next: State = { pos: n, light, toggles, crates, t: s.t + 1, collapsed };
  const base = { state: next, pushed, rotated, toggled, collapsed: fell };
  if (inkTiles(level, next).has(n)) return { ...base, event: 'slip' };
  if (walkedIntoSentinel || threatened(level, n, next.t)) return { ...base, event: 'caught' };
  if (cell.k === 'goal') return { ...base, event: 'win' };
  return { ...base, event: 'moved' };
}
