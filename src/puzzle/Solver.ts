// Breadth-first solver: proves levels solvable (tools/solve-puzzles.ts) and gives the in-game hint.
import { initialState, stateKey, step } from './Rules';
import { DIR_ORDER, type Dir, type Level, type State } from './types';

export interface Solution {
  moves: Dir[]; // shortest winning sequence
  explored: number; // states visited
}

/** Shortest winning move list from `from` (default: the start), or null if none within `limit` states. */
export function solve(level: Level, from: State = initialState(level), limit = 2_000_000): Solution | null {
  const seen = new Map<string, { prev: string | null; dir: Dir | null }>();
  const startKey = stateKey(level, from);
  seen.set(startKey, { prev: null, dir: null });
  let frontier: State[] = [from];
  while (frontier.length) {
    const next: State[] = [];
    for (const s of frontier) {
      const k = stateKey(level, s);
      for (const d of DIR_ORDER) {
        const r = step(level, s, d);
        if (r.event === 'blocked' || r.event === 'slip' || r.event === 'caught') continue;
        const nk = stateKey(level, r.state);
        if (seen.has(nk)) continue;
        seen.set(nk, { prev: k, dir: d });
        if (r.event === 'win') {
          const moves: Dir[] = [];
          for (let cur: string | null = nk; cur && cur !== startKey; ) {
            const e: { prev: string | null; dir: Dir | null } = seen.get(cur)!;
            moves.push(e.dir!);
            cur = e.prev;
          }
          return { moves: moves.reverse(), explored: seen.size };
        }
        next.push(r.state);
      }
      if (seen.size > limit) return null;
    }
    frontier = next;
  }
  return null;
}
