// V14 "fresh tester" estimate: simulated novice players (a model, not a human!) play each level.
// A novice sees what the game shows (never walks into ink or an echo's square), prefers positions
// it hasn't been in this attempt, leans toward the goal, explores randomly, and resets when stuck
// or after 4× par moves. Like the real game, from the 4th attempt on it takes a HINT (the next 3
// optimal moves) once per attempt. Reports how many runs needed 0 / ≤1 HINT, and median attempts.
// Usage: npx tsx tools/playtest-sim.ts [runs=300] [id ...]
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { initialState, parseLevel, stateKey, step, xy } from '../src/puzzle/Rules';
import { solve } from '../src/puzzle/Solver';
import { DIR_ORDER, type Dir, type Level, type State } from '../src/puzzle/types';

const args = process.argv.slice(2);
const runs = Number(args.find((a) => /^\d+$/.test(a)) ?? 300);
const only = args.filter((a) => !/^\d+$/.test(a));
const HINT_AFTER = 3;
const MAX_ATTEMPTS = 12;

let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0), seed / 2 ** 32);

function dist(level: Level, a: number, b: number) {
  const [ax, ay] = xy(level, a);
  const [bx, by] = xy(level, b);
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

const LOOK = Number(process.env.SIM_LOOKAHEAD ?? 6); // moves a novice can "see" ahead

/** Breadth-first up to LOOK moves: a winning line if one is that close, plus the first move toward
 *  each newly reachable interesting thing (switch, dial, crate push) the player hasn't tried yet. */
function look(level: Level, s0: State, seen: Set<string>, tried: Set<number>): { win?: Dir[]; curious: Dir[] } {
  const q: { s: State; path: Dir[] }[] = [{ s: s0, path: [] }];
  const local = new Set<string>([stateKey(level, s0)]);
  const curious = new Set<Dir>();
  for (let qi = 0; qi < q.length; qi++) {
    const { s, path } = q[qi];
    if (path.length >= LOOK) continue;
    for (const d of DIR_ORDER) {
      const r = step(level, s, d);
      if (r.event === 'blocked' || r.event === 'slip' || r.event === 'caught') continue;
      const p = [...path, d];
      if (r.event === 'win') return { win: p, curious: [] };
      const k = stateKey(level, r.state);
      if (local.has(k)) continue;
      local.add(k);
      const c = level.cells[r.state.pos];
      const interesting = (c.k === 'switch' || c.k === 'dial' || !!r.pushed) && !tried.has(r.state.pos) && !seen.has(k);
      if (interesting) curious.add(p[0]);
      q.push({ s: r.state, path: p });
    }
  }
  return { curious: [...curious] };
}

/** One attempt. Returns true on a win. `hint` = optimal moves to play first (from the start). */
function attempt(level: Level, hint: Dir[], cap: number, tried: Set<number>): boolean {
  let s: State = initialState(level);
  const seen = new Set<string>([stateKey(level, s)]);
  for (const d of hint) {
    const r = step(level, s, d);
    if (r.event === 'win') return true;
    if (r.event !== 'moved') break;
    s = r.state;
    seen.add(stateKey(level, s));
  }
  for (let n = 0; n < cap; n++) {
    const view = look(level, s, seen, tried);
    if (view.win) return true; // it can see the way: it walks it
    const options: { d: Dir; s: State; fresh: boolean }[] = [];
    for (const d of DIR_ORDER) {
      const r = step(level, s, d);
      if (r.event === 'blocked' || r.event === 'slip' || r.event === 'caught') continue;
      options.push({ d, s: r.state, fresh: !seen.has(stateKey(level, r.state)) });
    }
    const fresh = options.filter((o) => o.fresh);
    if (!fresh.length) return false; // stuck: everything here is familiar → reset
    const toward = fresh.filter((o) => view.curious.includes(o.d));
    let pool = toward.length && rnd() < 0.8 ? toward : fresh;
    if (pool === fresh && rnd() < 0.5) {
      const best = Math.min(...fresh.map((o) => dist(level, o.s.pos, level.goal)));
      pool = fresh.filter((o) => dist(level, o.s.pos, level.goal) === best);
    }
    const pick = pool[Math.floor(rnd() * pool.length)];
    s = pick.s;
    seen.add(stateKey(level, s));
    const c = level.cells[s.pos];
    if (c.k === 'switch' || c.k === 'dial') tried.add(s.pos);
  }
  return false;
}

export function play(level: Level, optimal: Dir[]): { attempts: number; hints: number; solved: boolean } {
  let hints = 0;
  const tried = new Set<number>();
  for (let a = 1; a <= MAX_ATTEMPTS; a++) {
    const useHint = a > HINT_AFTER;
    if (useHint) hints++;
    // Each hint the player has seen so far reveals 3 more optimal moves from the start.
    const shown = optimal.slice(0, useHint ? 3 * hints : 0);
    // Memory across attempts: what it already tried still feels less interesting (cleared per run).
    if (attempt(level, shown, level.par * 4, tried)) return { attempts: a, hints, solved: true };
  }
  return { attempts: MAX_ATTEMPTS, hints, solved: false };
}

/** Share of simulated novices (0..1) who finish with ≤1 HINT. */
export function fairness(level: Level, n = 150): number {
  const optimal = solve(level)!.moves;
  let ok = 0;
  for (let k = 0; k < n; k++) {
    const r = play(level, optimal);
    if (r.solved && r.hints <= 1) ok++;
  }
  return ok / n;
}

if (process.argv[1]?.includes('playtest-sim')) {
  const dir = join(import.meta.dirname, '..', 'content', 'puzzles');
  console.log('SIMULATED novices (a model, not real testers): share of runs needing 0 / ≤1 HINT');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const id = f.replace('.json', '');
    if (only.length && !only.includes(id)) continue;
    const level = parseLevel(JSON.parse(readFileSync(join(dir, f), 'utf8')));
    const optimal = solve(level)!.moves;
    const res = Array.from({ length: runs }, () => play(level, optimal));
    const pct = (k: (r: (typeof res)[number]) => boolean) => Math.round((res.filter(k).length / runs) * 100);
    const att = res.map((r) => r.attempts).sort((a, b) => a - b);
    console.log(
      `${id.padEnd(11)} par ${String(level.par).padStart(2)}  no hint ${String(pct((r) => r.solved && r.hints === 0)).padStart(3)}%  ` +
        `≤1 hint ${String(pct((r) => r.solved && r.hints <= 1)).padStart(3)}%  median attempts ${att[Math.floor(runs / 2)]}  ` +
        `unsolved ${pct((r) => !r.solved)}%`,
    );
  }
}
