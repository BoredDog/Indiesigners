// Story mode autoplay: plays every episode to the summary screen with a simple "player":
// advances dialogue, picks choices (first option, or --pick=N), solves board deductions, walks to
// objectives, digs the rubble, and hammers Space through QTEs. Fails on console errors or a stall.
// Usage: npm run build && npx tsx tools/autoplay-story.ts [--chrome] [--pick=1] [--ending=forget]
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const args = process.argv.slice(2);
const pick = Number(args.find((a) => a.startsWith('--pick='))?.split('=')[1] ?? 0);
const forget = args.includes('--ending=forget');
const server = await preview({ preview: { port: 4192, strictPort: true }, logLevel: 'silent' });
const browser = await chromium.launch({ channel: args.includes('--chrome') ? 'chrome' : undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors: string[] = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const js = <T = unknown>(code: string) => page.evaluate((c) => new Function(c)(), code) as Promise<T>;

/** One step of the robot player; returns a short description of what it did. */
const STEP = `
  const d = window.__story, ui = window.__echoes.game.scene.getScene('StoryUI'), w = window.__echoes.game.scene.getScene('Story');
  if (!d) return 'boot';
  const all = []; const walk = (o) => { all.push(o); (o.list || []).forEach(walk); };
  ui.children.list.forEach(walk);
  const btn = (name) => all.find((o) => o.name === name && o.active);
  if (all.some((o) => o.name === 'btn:PLAY AGAIN')) return 'summary';
  // Board in deduction mode: answer it.
  if (d.boardOpen && d.closeBoard) {
    const q = ['qKey', 'qTime', 'qWho'].find((k) => !d.save.flags[k] && (k !== 'qWho' || d.save.flags.askWho) && (k !== 'qTime' || d.save.found.includes('lukeMem')) && (k !== 'qKey' || d.save.found.includes('symbols')));
    if (q) d.save.flags[q] = true;
    d.closeBoard();
    return 'board:' + (q || 'close');
  }
  // Tuning puzzle: snap the knobs onto the echo and wait for it to lock.
  if (d.tuner && d.tuner.state) { if (!d.tuner.state.locked) d.tuner.state.auto(); return 'tune'; }
  // River channels: turn every piece into place.
  if (d.river && d.river.state) { if (!d.river.state.solved && !d.river.state.started) { d.river.state.started = true; d.river.state.auto(); } return 'river'; }
  // Classroom candles: press the rest of the solution.
  if (d.candles && d.candles.state) { if (!d.candles.state.solved && !d.candles.state.started) { d.candles.state.started = true; d.candles.state.auto(); } return 'candles'; }
  // Choices: numbered buttons "1. …".
  const choices = all.filter((o) => o.name && /^btn:\\d\\. /.test(o.name) && o.active);
  if (choices.length) {
    const want = choices.length === 2 && /REMEMBER|FORGET/.test(choices[0].name) ? (${forget} ? 1 : 0) : Math.min(${pick}, choices.length - 1);
    choices[want].emit('pointerup');
    return 'choice:' + choices[want].name;
  }
  // QTE overlay (depth 70): press space via the scene's keyboard listeners.
  // Ring-timing QTE: press only while the ring is inside the window, like a player would.
  const q = d.qte && d.qte.state;
  if (q && q.kind === 'timing' && q.phase === 'play' && !q.window) return 'qte-wait';
  if (all.some((o) => o.depth === 70)) return 'qte';
  // Exploring: go to the next spot or satisfy the movement objective.
  const ex = d.exploring;
  if (ex && !ex.busy && !d.busyUi) {
    const spot = d.spots.find((s) => !s.when || s.when());
    // Nothing visible left: stand by a hidden echo trace and raise the lantern (the runner holds F).
    const tr = (d.traces || []).find((t) => !t.revealed);
    if (!spot && tr) { d.teleport(tr.img.x, d.a.footprints.y); return 'sight'; }
    if (!spot && d.following) { d.teleport(d.following.x(), d.a.well.y); return 'follow'; }
    if (spot) { d.teleport(spot.x, spot.y); d.tryInteract(); return 'spot:' + spot.id; }
    const A = d.a, S = 60, T = 16;
    if (w.world.fg[S][40] === 0 && d.player.y < (S + 8) * T) { for (let y = S + 1; y <= S + 7; y++) for (let x = 39; x <= 41; x++) if (w.world.fg[y][x]) w.clearTile(x, y); d.teleport(A.shaft.x, A.shaft.y); return 'dig'; }
    if (d.player.x <= A.collapse.x) { d.teleport(A.collapse.x + 30, A.collapse.y); return 'deeper'; }
    d.teleport(A.chamber.x, A.chamber.y); return 'chamber';
  }
  return 'advance';
`;

let failed = 0;
try {
  await page.goto('http://localhost:4192/?scene=Story&fresh=1');
  await page.waitForFunction(() => (window as any).__story, undefined, { polling: 250, timeout: 60_000 });
  await js(`window.__echoes.gameState.setSetting('reduceMotion', true)`);
  const t0 = Date.now();
  let last = '', same = 0, episode = -1;
  for (let i = 0; i < 6000; i++) {
    const r = await js<string>(STEP);
    const ep = await js<number>('return window.__story?.save.episode ?? -1');
    if (ep !== episode) { episode = ep; console.log(`episode ${ep}  (${((Date.now() - t0) / 1000) | 0}s)`); }
    if (r === 'summary') break;
    if (r === 'sight') { await page.keyboard.down('f'); await page.waitForTimeout(900); await page.keyboard.up('f'); }
    if (r === 'qte') for (let k = 0; k < 3; k++) await page.keyboard.press('Space'); // a burst, like a player mashing
    else if (r === 'advance' || r === 'boot') await page.keyboard.press('Space');
    // QTEs repeat until passed (and get easier), so time spent in one isn't a stall.
    same = r === last && !r.startsWith('qte') ? same + 1 : 0;
    last = r;
    if (same > 400) throw new Error(`stalled on "${r}" in episode ${ep}`);
    await page.waitForTimeout(r === 'qte-wait' ? 10 : r === 'qte' ? 40 : 120);
  }
  const done = await js<boolean>(`const ui = window.__echoes.game.scene.getScene('StoryUI'); const all=[]; const walk=(o)=>{all.push(o);(o.list||[]).forEach(walk)}; ui.children.list.forEach(walk); return all.some((o)=>o.name==='btn:PLAY AGAIN');`);
  const save = await js<{ flags: Record<string, unknown>; found: string[]; remembered: string[] }>('return window.__story.save');
  console.log(`${done ? 'ok  ' : 'FAIL'} reached the summary in ${((Date.now() - t0) / 1000) | 0}s · ending=${save.flags.ending} · found ${save.found.length} · remembered ${save.remembered.length}`);
  if (!done) failed++;
  await page.screenshot({ path: 'test-results/story-autoplay-summary.png' });
} catch (e) {
  console.log('FAIL', e);
  failed++;
  await page.screenshot({ path: 'test-results/story-autoplay-failure.png' }).catch(() => undefined);
}
console.log(errors.length ? `FAIL console errors: ${errors.slice(0, 5).join(' | ')}` : 'ok   no console errors');
await browser.close();
server.httpServer.close();
process.exit(failed || errors.length ? 1 : 0);
