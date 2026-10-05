// Level analysis for V14/V15: which pieces actually matter, and how many dead ends a board has.
// Pure, shared by tools/solve-puzzles.ts and tools/gen-puzzles.ts (ported to godot/puzzle/echo_analysis.gd).
//
// A piece is UNUSED if, with it removed (crate/dial/switch/gate/water/cracked tile → plain floor,
// sentinel → gone), the level is still solvable at the same optimal length.
import { initialState, stateKey, step, xy } from './Rules';
import { solve } from './Solver';
import { DIR_ORDER, type Level, type State } from './types';

export interface Piece {
  kind: 'crate' | 'dial' | 'lever' | 'sluice' | 'node' | 'gate' | 'water' | 'collapse' | 'sentinel';
  /** Cells this piece occupies (a gate/water group or all cracked floor is one piece); sentinel: [n]. */
  cells: number[];
  label: string; // e.g. "crate (3,3)", "gates g1", "sentinel 1 at (2,1)"
}

/**
 * Every piece a designer placed. Crates, dials, switches and sentinels count one by one; terrain
 * counts per mechanic: each gate group, each water group, and all cracked floor together (a lone
 * channel tile far from the path is not a design flaw, a whole channel nobody needs is).
 */
export function pieces(level: Level): Piece[] {
  const out: Piece[] = [];
  const at = (i: number) => `(${xy(level, i).join(',')})`;
  level.crates.forEach((i) => out.push({ kind: 'crate', cells: [i], label: `crate ${at(i)}` }));
  const groups = new Map<string, Piece>();
  const collapse: number[] = [];
  level.cells.forEach((c, i) => {
    if (c.k === 'dial') out.push({ kind: 'dial', cells: [i], label: `dial ${at(i)}` });
    else if (c.k === 'switch') out.push({ kind: c.kind, cells: [i], label: `${c.kind} ${at(i)}` });
    else if (c.k === 'gate' || c.k === 'water') {
      const key = `${c.k}:${c.group}`;
      if (!groups.has(key)) groups.set(key, { kind: c.k, cells: [], label: `${c.k === 'gate' ? 'gates' : 'water'} ${level.groups[c.group]}` });
      groups.get(key)!.cells.push(i);
    } else if (c.k === 'collapse') collapse.push(i);
  });
  out.push(...groups.values());
  if (collapse.length) out.push({ kind: 'collapse', cells: collapse, label: `cracked floor (${collapse.length} tiles)` });
  level.sentinels.forEach((s, n) => out.push({ kind: 'sentinel', cells: [n], label: `sentinel ${n} at ${at(s.path[0])}` }));
  return out;
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** The level with one piece taken out (its cells become plain floor; a sentinel just goes). */
export function withoutPiece(level: Level, p: Piece): Level {
  if (p.kind === 'sentinel') {
    const sentinels = level.sentinels.filter((_, n) => n !== p.cells[0]);
    const period = sentinels.reduce((acc, s) => {
      const len = s.path.length < 2 ? 1 : s.loop ? s.path.length : 2 * (s.path.length - 1);
      return (acc / gcd(acc, len)) * len;
    }, 1);
    return { ...level, sentinels, period };
  }
  if (p.kind === 'crate') return { ...level, crates: level.crates.filter((c) => c !== p.cells[0]) };
  const cells = level.cells.slice();
  for (const i of p.cells) cells[i] = { k: 'floor' };
  return { ...level, cells };
}

export interface Analysis {
  par: number; // optimal moves (−1 if unsolvable)
  explored: number; // states the solver visited
  reachable: number; // all states reachable from the start (capped)
  deadEnds: number; // reachable states from which the goal can no longer be reached
  unused: Piece[];
}

/** Full reachable graph from the start: counts states and dead ends (states that can't reach a win). */
export function deadEnds(level: Level, limit = 300_000): { reachable: number; deadEnds: number } {
  const ids = new Map<string, number>();
  const edges: number[][] = [];
  const winning: boolean[] = [];
  const s0: State = initialState(level);
  ids.set(stateKey(level, s0), 0);
  edges.push([]);
  winning.push(false);
  const queue: State[] = [s0];
  for (let qi = 0; qi < queue.length && ids.size < limit; qi++) {
    const s = queue[qi];
    const from = ids.get(stateKey(level, s))!;
    for (const d of DIR_ORDER) {
      const r = step(level, s, d);
      if (r.event === 'blocked' || r.event === 'slip' || r.event === 'caught') continue;
      const k = stateKey(level, r.state);
      let to = ids.get(k);
      if (to === undefined) {
        to = ids.size;
        ids.set(k, to);
        edges.push([]);
        winning.push(r.event === 'win');
        if (r.event !== 'win') queue.push(r.state);
      }
      edges[from].push(to);
    }
  }
  // Reverse reachability from winning states.
  const rev: number[][] = edges.map(() => []);
  edges.forEach((tos, f) => tos.forEach((t) => rev[t].push(f)));
  const good = new Uint8Array(edges.length);
  const stack: number[] = [];
  winning.forEach((w, i) => w && (good[i] = 1, stack.push(i)));
  while (stack.length) {
    const t = stack.pop()!;
    for (const f of rev[t]) if (!good[f]) (good[f] = 1), stack.push(f);
  }
  let dead = 0;
  for (let i = 0; i < edges.length; i++) if (!good[i] && !winning[i]) dead++;
  return { reachable: edges.length, deadEnds: dead };
}

export function analyse(level: Level): Analysis {
  const base = solve(level);
  const par = base ? base.moves.length : -1;
  const unused = base
    ? pieces(level).filter((p) => {
        const alt = solve(withoutPiece(level, p), undefined, 500_000);
        return !!alt && alt.moves.length === par;
      })
    : [];
  return { par, explored: base?.explored ?? 0, ...deadEnds(level), unused };
}
