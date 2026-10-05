// Unit checks for the Echo Paths rules engine (src/puzzle). One tiny board per mechanic.
// Usage: npx tsx tools/check-puzzle.ts   (exits 1 on failure)
import { initialState, inkTiles, parseLevel, sentinelAt, step } from '../src/puzzle/Rules';
import { solve } from '../src/puzzle/Solver';
import { analyse, deadEnds } from '../src/puzzle/Analysis';
import type { Dir, LevelFile, State } from '../src/puzzle/types';

let failed = 0;
const ok = (cond: unknown, msg: string) => {
  if (!cond) {
    failed++;
    console.error(`FAIL ${msg}`);
  }
};
const lvl = (tiles: string[], extra: Partial<LevelFile> = {}) =>
  parseLevel({ id: 't', tiles, light: 'N', par: 1, ...extra });
/** Plays moves; returns the last event and state. */
function play(level: ReturnType<typeof lvl>, moves: string, from?: State) {
  let s = from ?? initialState(level);
  let event = 'start';
  for (const d of moves) {
    const r = step(level, s, d as Dir);
    event = r.event;
    if (r.event === 'blocked' || r.event === 'slip' || r.event === 'caught') return { event, state: s, r };
    s = r.state;
    if (r.event === 'win') break;
  }
  return { event, state: s };
}

// Movement, walls, edges, win
{
  const l = lvl(['S.#', '..G'], { light: 'S' });
  ok(play(l, 'N').event === 'blocked', 'edge blocks');
  ok(play(l, 'EE').event === 'blocked', 'pillar blocks');
  ok(play(l, 'SEE').event === 'win', 'reaching the goal wins');
  ok(solve(l)?.moves.length === 3, 'solver finds the 3-move path');
}

// Light and ink: light from N, pillar shadow falls south for `shadow` tiles
{
  const l = lvl(['.#.', 'S..', '...', '..G'], { shadow: 2 });
  const ink = inkTiles(l, initialState(l));
  ok(ink.has(4) && ink.has(7) && ink.size === 2, 'pillar casts 2 ink tiles south');
  ok(play(l, 'E').event === 'blocked', 'wisp cannot enter ink');
  ok(play(l, 'SSEE').event === 'win', 'path around the ink');
  const west = lvl(['....', '.#..', 'S..G'], { light: 'W', shadow: 1 });
  ok(inkTiles(west, initialState(west)).has(6), 'light from W casts east');
}

// Dial rotates the light clockwise; slip when your own tile turns to ink
{
  // light N → after dial E: pillar at (1,0) shadows west → (0,0)
  const l = lvl(['.#D', 'S..', '..G'], { shadow: 1 });
  const s0 = initialState(l);
  const r = play(l, 'E'); // to (1,1) — that's in shadow of pillar (light N) → blocked
  ok(r.event === 'blocked', 'shadowed tile under pillar is blocked');
  const l2 = lvl(['D..', 'S#.', '..G'], { shadow: 1 });
  const res = play(l2, 'N'); // onto the dial: light N → E, pillar now shadows west onto the start
  ok(res.event === 'moved' && res.state.light === 1, 'dial rotates N→E');
  ok(inkTiles(l2, res.state).has(3), 'after rotation shadow falls west onto (0,1)');
  ok(s0.light === 0, 'initial state untouched (immutability)');
  // Slip: stand where the new shadow will fall when the dial turns. Dial under the wisp's next step.
  const l3 = lvl(['#D.', '...', 'S.G'], { light: 'E', shadow: 1 });
  // light E → shadows west; pillar (0,0) casts nothing on board. Dial: E→S, light from S casts north: nothing.
  ok(play(l3, 'NEN').event === 'moved', 'dial turn that leaves wisp lit is fine');
  const l4 = lvl(['.#.', '.D.', 'S.G'], { light: 'W', shadow: 1 });
  // light W → shadow east of pillar: (2,0). Wisp enters dial (1,1): light W→N → pillar shadows south → (1,1) = wisp → slip
  ok(play(l4, 'NE').event === 'slip', 'dial turning ink onto the wisp = slip');
}

// Lever toggles gates; nodes toggle several groups
{
  const l = lvl(['SAL', '...', 'G..'], { legend: { A: 'gate:g1', L: 'lever:g1' } });
  ok(play(l, 'E').event === 'blocked', 'closed gate blocks');
  const r = play(l, 'SEENW'); // to lever (2,0), then west into the now-open gate
  ok(r.event === 'moved' && r.state.pos === 1, 'lever opens gate');
  const r2 = play(l, 'SEENS' + 'N'); // re-enter the lever: closes again
  ok(r2.state.toggles === 0, 're-entering the lever closes the gate');
  const n = lvl(['SAB', 'N..', 'G..'], { legend: { A: 'gate:g1', B: 'gate:g2:open', N: 'node:g1,g2' } });
  const rn = play(n, 'S');
  ok(rn.state.toggles === 3, 'node toggles both groups');
  ok(play(n, 'SNE').state.pos === 1, 'node opened g1');
  ok(play(n, 'SNEE').event === 'blocked', 'node closed g2');
}

// Sluice drains / floods water
{
  const l = lvl(['SW~G', '....'], { legend: { W: 'sluice:s1', '~': 'water:s1' } });
  ok(play(l, 'SEE' + 'N').event === 'blocked', 'flooded water blocks');
  const r = play(l, 'E' + 'E' + 'E');
  ok(r.event === 'win', 'sluice drains the channel, walk across');
  const dry = lvl(['S~G', 'W..'], { legend: { W: 'sluice:s1', '~': 'water:s1:dry' } });
  ok(play(dry, 'S' + 'N' + 'E').event === 'blocked', 'sluice floods a dry channel');
}

// Crates: push, blocked pushes, crates cast shadow
{
  const l = lvl(['SC..', '....', '...G'], { shadow: 1 });
  const r = play(l, 'E');
  ok(r.state.crates[0] === 2 && r.state.pos === 1, 'crate pushed one tile');
  ok(inkTiles(l, r.state).has(6), 'crate casts shadow');
  const l2 = lvl(['SC#', '..G']);
  ok(play(l2, 'E').event === 'blocked', 'crate cannot be pushed into a pillar');
  const l3 = lvl(['SCC.', '...G']);
  ok(play(l3, 'E').event === 'blocked', 'crate cannot push another crate');
  const l4 = lvl(['SC~.', '...G'], { legend: { '~': 'water:s1' } });
  ok(play(l4, 'E').event === 'blocked', 'crate cannot enter flooded water');
}

// Sentinels: patrol, facing, caught
{
  const l = lvl(['S....', '.....', '....G'], { sentinels: [{ path: [[2, 1], [3, 1]] }] });
  ok(sentinelAt(l, 0, 0).pos === 7 && sentinelAt(l, 0, 0).facing === 8, 'sentinel faces its next step');
  ok(sentinelAt(l, 0, 1).pos === 8 && sentinelAt(l, 0, 2).pos === 7, 'ping-pong patrol');
  ok(play(l, 'EES').event === 'caught', 'walking into a sentinel = caught');
  const st = lvl(['S..', '...', '..G'], { sentinels: [{ path: [[2, 1]], face: 'W' }] });
  ok(play(st, 'SE').event === 'caught', 'stepping in front of a sentinel = caught');
  const sol = solve(l);
  ok(!!sol && sol.moves.length >= 6, 'solver avoids the sentinel');
  const loop = lvl(['S...', '....', '...G'], { sentinels: [{ path: [[1, 1], [2, 1], [2, 2], [1, 2]], loop: true }] });
  ok(loop.period === 4 && sentinelAt(loop, 0, 4).pos === sentinelAt(loop, 0, 0).pos, 'loop patrol period');
}

// Collapsing floor
{
  const l = lvl(['Sxx', '.x.', '..G']);
  const r = play(l, 'EEW');
  ok(r.event === 'blocked' && r.r?.reason === 'void', 'collapsed tile is a pit');
  ok(play(l, 'EES').event === 'moved', 'can cross collapse tiles once');
  ok(play(l, 'EESS').event === 'win', 'collapse path to goal');
}

// V15 analysis: unused pieces and dead ends
{
  // A crate nowhere near the path is unused.
  const spare = lvl(['S...G', '.....', 'C....'], { light: 'S' });
  ok(analyse(spare).unused.map((p) => p.kind).join() === 'crate', 'idle crate reported as unused');
  // A lever whose gate blocks the only way is needed (and so is the gate).
  const gated = lvl(['S_G', '.A.', 'L__'], { legend: { A: 'gate:g1', L: 'lever:g1' }, light: 'S' });
  ok(analyse(gated).unused.length === 0, 'lever + gate on the only route are both used');
  // An echo that forces a detour counts as used even though the solution never touches it.
  const echo = lvl(['S...', '....', '...G'], { sentinels: [{ path: [[1, 1], [2, 1], [3, 1]] }], light: 'S' });
  const a = analyse(echo);
  const without = solve(lvl(['S...', '....', '...G'], { light: 'S' }))!.moves.length;
  ok(a.par > without ? a.unused.length === 0 : a.unused.some((p) => p.kind === 'sentinel'), 'sentinel judged by whether it changes the optimum');
  // Dead ends: in a corridor, pushing the crate up against the goal strands the wisp.
  const trap = lvl(['SC.G'], { light: 'S' });
  ok(deadEnds(trap).deadEnds >= 1, 'crate pushed against the goal is a dead end');
  ok(deadEnds(lvl(['S..G'], { light: 'S' })).deadEnds === 0, 'an open corridor has no dead ends');
  const corner = lvl(['S.C', '..G', '...'], { light: 'S' });
  ok(deadEnds(corner).reachable > 0, 'dead-end search explores the board');
}

// Authoring errors are caught
{
  const bad = (tiles: string[], extra: Partial<LevelFile> = {}) => {
    try {
      lvl(tiles, extra);
      return false;
    } catch {
      return true;
    }
  };
  ok(bad(['S..', '..']), 'ragged rows rejected');
  ok(bad(['...', '..G']), 'missing start rejected');
  ok(bad(['S.Q', '..G']), 'unknown tile rejected');
  ok(bad(['S..', '..G'], { sentinels: [{ path: [[0, 0], [2, 0]] }] }), 'non-adjacent patrol rejected');
}

if (failed) {
  console.error(`${failed} puzzle check(s) failed`);
  process.exit(1);
}
console.log('puzzle engine: all checks passed');
