// Plays every Echo Paths level headlessly through the real Puzzle scene: screenshot the board,
// play the solver's solution with the normal input path, and check the scene hands the evidence
// back to its caller (Memory / Village / Archive). Also exercises undo, reset, hint and skip.
// Every level is played twice: in the 2D view and in the V19 3D (isometric) view.
// Usage: npm run build && npx tsx tools/shots-puzzle.ts [outDir] [id ...]
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { preview } from 'vite';
import sharp from 'sharp';
import { parseLevel } from '../src/puzzle/Rules';
import { solve } from '../src/puzzle/Solver';
import type { LevelFile } from '../src/puzzle/types';
import evidenceJson from '../content/evidence.json';

const outDir = process.argv[2] ?? 'test-results/puzzle';
const only = process.argv.slice(3);
const dir = join(import.meta.dirname, '..', 'content', 'puzzles');
const levels = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as LevelFile)
  .filter((l) => !only.length || only.includes(l.id));

const server = await preview({ preview: { port: 4183, strictPort: true }, logLevel: 'silent' });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors: string[] = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
let failed = 0;
const check = (cond: unknown, msg: string) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!cond) failed++;
};
const shot = (name: string) => page.screenshot({ path: `${outDir}/${name}.png`, timeout: 120_000 });

async function activeScene(p: Page): Promise<string[]> {
  return p.evaluate(() => (window as any).__echoes.game.scene.getScenes(true).map((s: any) => s.scene.key));
}
async function waitScene(key: string, timeout = 10_000) {
  await page.waitForFunction(
    (k) => (window as any).__echoes?.game.scene.getScenes(true).some((s: any) => s.scene.key === k),
    key,
    { timeout },
  );
}
/** Headless WebGL runs at a few fps: wait for the scene to finish animating before the next input. */
const idle = () => page.waitForFunction(() => !(window as any).__puzzle?.busy, undefined, { timeout: 10_000 });
/** Waits (up to 15 s) until a GameState expression is true: the page rebuild + 350 ms reveal can be slow under swiftshader. */
const until = (code: string) =>
  page
    .waitForFunction((c) => new Function('gs', `return ${c}`)((window as any).__echoes.gameState), code, { timeout: 15_000 })
    .catch(() => {});
const gs = <T>(code: string) =>
  page.evaluate((c) => new Function('gs', `return ${c}`)((window as any).__echoes.gameState), code) as Promise<T>;

function route(l: LevelFile) {
  const ev = evidenceJson.evidence.find((e) => e.puzzle === l.id);
  if (l.id === 'pz_archive') return { q: `puzzleId=${l.id}&returnTo=Archive`, back: 'Archive', ev: undefined };
  if (!ev || ev.witness === 'tower') return { q: `puzzleId=${l.id}&evidenceId=${ev?.id}&returnTo=Village`, back: 'Village', ev: ev?.id };
  return { q: `puzzleId=${l.id}&evidenceId=${ev.id}&witness=${ev.witness}&returnTo=Memory`, back: 'Memory', ev: ev.id };
}

/** Clicks through the first-time mechanic captions until the scene says teaching is done; returns how many. */
async function dismissPopups(): Promise<number> {
  let n = 0;
  for (let k = 0; k < 40; k++) {
    const st = await page.evaluate(() => {
      const p = (window as any).__puzzle;
      const layer = p?.children.list.find((o: any) => o.name === 'popup');
      const b = layer?.list.find((o: any) => o.name === 'btn:GOT IT');
      if (b) {
        b.emit('click');
        return 'clicked';
      }
      return p?.teachDone ? 'done' : 'waiting';
    });
    if (st === 'done') break;
    if (st === 'clicked') n++;
    await page.waitForTimeout(250);
  }
  return n;
}

/** Fresh save; `view` is written to the saved settings before the board loads (PUZZLE VIEW, V19). */
async function open(l: LevelFile, view: '2d' | '3d' = '2d') {
  const r = route(l);
  await page.goto(`http://localhost:4183/?scene=Puzzle&${r.q}`);
  await page.evaluate((v) => {
    localStorage.clear();
    if (v === '3d') (window as any).__echoes.gameState.setSetting('puzzleView', '3d');
  }, view);
  await page.reload();
  await waitScene('Puzzle');
  await page.waitForFunction(() => (window as any).__puzzle?.level);
  await page.waitForTimeout(500);
  return r;
}

try {
  for (const view of ['2d', '3d'] as const) {
    for (const l of levels) {
      const r = await open(l, view);
      const tag = view === '3d' ? `${l.id}-3d` : l.id;
      const what = view === '3d' ? `${l.id} (3D)` : l.id;
      const iso = await page.evaluate(() => !!(window as any).__puzzle.iso);
      check(iso === (view === '3d'), `${what}: board drawn in the ${view.toUpperCase()} view`);
      await page.waitForTimeout(300);
      await shot(`${tag}-0-teach`);
      const mechanics = await page.evaluate(() => (window as any).__puzzle.mechanics().length);
      const taught = await dismissPopups();
      check(taught === mechanics, `${what}: ${taught}/${mechanics} mechanic captions on a fresh save`);
      await shot(`${tag}-0-start`);
      // V10: the board must read without colour; keep a greyscale copy for review.
      await sharp(`${outDir}/${tag}-0-start.png`).greyscale().toFile(`${outDir}/${tag}-0-start-grey.png`);
      const sol = solve(parseLevel(l))!;
      // Play all but the last move, screenshot mid-solve, then finish.
      const moves = sol.moves.join('');
      await page.evaluate((m) => (window as any).__puzzle.play(m), moves.slice(0, -1));
      await page.waitForTimeout(400);
      await shot(`${tag}-1-before-last`);
      await page.evaluate((m) => (window as any).__puzzle.play(m), moves.slice(-1));
      await page.waitForTimeout(500);
      await shot(`${tag}-2-solved`);
      await waitScene(r.back, 15_000).catch(() => {});
      await until(r.ev ? `gs.hasEvidence('${r.ev}')` : `gs.flag('archiveEscaped')`);
      const scenes = await activeScene(page);
      check(scenes.includes(r.back), `${what}: solution wins and returns to ${r.back} (active: ${scenes.join(',')})`);
      if (r.ev) check(await gs<boolean>(`gs.hasEvidence('${r.ev}')`), `${what}: ${r.ev} recovered`);
      else check(await gs<boolean>(`gs.flag('archiveEscaped')`), `${what}: archive escaped`);
    }
  }

  // 3D input: click-to-move on the projected tiles, the keyboard, and switching the view mid-board.
  {
    const l = levels.find((x) => x.id === 'pz_sis_1') ?? levels[0];
    await open(l, '3d');
    await dismissPopups();
    const P = <T>(code: string) => page.evaluate((c) => new Function('p', `return ${c}`)((window as any).__puzzle), code) as Promise<T>;
    const [m1, m2] = solve(parseLevel(l))!.moves;
    // Page position of the tile the first move goes to (through the canvas box).
    const target = await page.evaluate((d) => {
      const p = (window as any).__puzzle;
      const step: Record<string, number> = { N: -p.level.w, S: p.level.w, E: 1, W: -1 };
      const i = p.state.pos + step[d];
      const r = p.game.canvas.getBoundingClientRect();
      return { x: r.left + (p.cx(i) * r.width) / 1920, y: r.top + (p.cy(i) * r.height) / 1080 };
    }, m1);
    await page.mouse.click(target.x, target.y);
    await idle();
    check((await P<number>('p.history.length')) === 1, '3D: clicking the projected neighbour tile moves the wisp');
    const key: Record<string, string> = { N: 'ArrowUp', S: 'ArrowDown', E: 'ArrowRight', W: 'ArrowLeft' };
    await page.keyboard.press(key[m2]);
    await idle();
    check((await P<number>('p.history.length')) === 2, '3D: arrow keys move along the grid');
    check(await P<boolean>("p.children.list.some((o) => o.name === 'compass')"), '3D: key compass shown');
    await shot('3d-input');
    // Esc → Pause → PUZZLE VIEW → RESUME: the board redraws flat and keeps its moves.
    await page.keyboard.press('Escape');
    await waitScene('Pause');
    const pauseClick = (prefix: string) =>
      page.evaluate((n) => {
        const s = (window as any).__echoes.game.scene.getScene('Pause');
        s.children.list.find((o: any) => typeof o.name === 'string' && o.name.startsWith(n))?.emit('click');
      }, prefix);
    await pauseClick('btn:PUZZLE VIEW');
    await page.waitForTimeout(200);
    check((await gs<string>('gs.settings.puzzleView')) === '2d', 'PUZZLE VIEW toggles 3D → 2D (saved in settings)');
    await pauseClick('btn:RESUME');
    await page
      .waitForFunction(() => (window as any).__puzzle?.level && !(window as any).__puzzle.iso, undefined, { timeout: 10_000 })
      .catch(() => {});
    check(!(await P<boolean>('!!p.iso')), 'resuming redraws the board in 2D');
    check((await P<number>('p.history.length')) === 2, 'switching the view keeps the moves made');
    await shot('3d-switched-to-2d');
  }

  // Controls: undo, reset → HINT after 3, SKIP after 6, skip awards the evidence.
  const l = levels.find((x) => x.id === 'pz_sis_1') ?? levels[0];
  const r = await open(l);
  await dismissPopups();
  // Captions are shown once: restarting the board in the same session shows none.
  await page.evaluate(() => {
    const p = (window as any).__puzzle;
    p.scene.restart(p.data0);
  });
  await page.waitForTimeout(800);
  await page.waitForFunction(() => (window as any).__puzzle?.level);
  check((await dismissPopups()) === 0, 'mechanic captions only shown once per save');
  const P = <T>(code: string) => page.evaluate((c) => new Function('p', `return ${c}`)((window as any).__puzzle), code) as Promise<T>;
  const first = solve(parseLevel(l))!.moves[0];
  await page.evaluate((m) => (window as any).__puzzle.play(m), first);
  await idle();
  check((await P<number>('p.history.length')) === 1, 'move recorded');
  await page.keyboard.press('z');
  await idle();
  check((await P<number>('p.history.length')) === 0, 'Z undoes');
  for (let k = 0; k < 3; k++) {
    await page.evaluate((m) => (window as any).__puzzle.play(m), first);
    await idle();
    await page.keyboard.press('r');
    await idle();
  }
  check(await P<boolean>('p.hintBtn.visible'), 'HINT shown after 3 resets');
  check(!(await P<boolean>('p.skipBtn.visible')), 'SKIP hidden before 6');
  await page.keyboard.press('h');
  await page.waitForTimeout(300);
  check((await P<number>('p.hintLabels.length')) > 0, 'hint marks the next moves');
  await shot('controls-hint');
  for (let k = 0; k < 3; k++) {
    await page.evaluate((m) => (window as any).__puzzle.play(m), first);
    await idle();
    await page.keyboard.press('r');
    await idle();
  }
  check(await P<boolean>('p.skipBtn.visible'), 'SKIP shown after 6 resets');
  await page.evaluate(() => (window as any).__puzzle.skipBtn.emit('click'));
  await page.waitForTimeout(400);
  await shot('controls-skip-confirm');
  await page.evaluate(() => {
    const p = (window as any).__puzzle;
    const b = p.children.list.find((o: any) => o.name === 'popup').list.find((o: any) => o.name === 'btn:SKIP');
    b.emit('click');
  });
  await waitScene(r.back, 15_000).catch(() => {});
  if (r.ev) await until(`gs.hasEvidence('${r.ev}')`);
  check(r.ev ? await gs<boolean>(`gs.hasEvidence('${r.ev}')`) : true, 'skip still recovers the fragment');

  // Archive flow: intro beat → ESCAPE → pz_archive → escaped beat → CONTINUE → Accusation (→ Finale).
  await page.goto('http://localhost:4183/?scene=Archive');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitScene('Archive');
  await page.waitForTimeout(2600);
  await shot('archive-1-intro');
  const clickBtn = (scene: string, name: string) =>
    page.evaluate(
      ([sc, n]) => {
        const s = (window as any).__echoes.game.scene.getScene(sc);
        s.children.list.find((o: any) => o.name === n)?.emit('click');
      },
      [scene, name],
    );
  await clickBtn('Archive', 'btn:ESCAPE WITH THE RECORD');
  await waitScene('Puzzle');
  await page.waitForFunction(() => (window as any).__puzzle?.level?.id === 'pz_archive');
  await dismissPopups();
  await page.evaluate(() => (window as any).__puzzle.solve());
  await waitScene('Archive');
  await until(`gs.flag('archiveEscaped')`);
  await page.waitForFunction(
    () => (window as any).__echoes.game.scene.getScene('Archive').children.list.some((o: any) => o.name === 'btn:CONTINUE'),
    undefined,
    { timeout: 15_000 },
  );
  await shot('archive-2-escaped');
  check(await gs<boolean>(`gs.flag('archiveEscaped')`), 'archive escape recorded');
  await clickBtn('Archive', 'btn:CONTINUE');
  await waitScene('Accusation', 8000).catch(() => {});
  check((await activeScene(page)).includes('Accusation'), 'archive hands off to the Accusation (A2), then the Finale');

  // Missing level → straight back with the fragment (contract).
  await page.goto('http://localhost:4183/?scene=Puzzle&puzzleId=pz_missing&evidenceId=ev_mira_bell&witness=mira&returnTo=Memory');
  await waitScene('Memory');
  await until(`gs.hasEvidence('ev_mira_bell')`);
  check(await gs<boolean>(`gs.hasEvidence('ev_mira_bell')`), 'missing level hands the fragment straight back');
} catch (e) {
  failed++;
  console.error(e);
  await shot('error').catch(() => {});
}

console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'No console errors.');
await browser.close();
server.httpServer.close();
if (errors.length || failed) process.exit(1);
