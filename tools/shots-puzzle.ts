// Plays every Echo Paths level headlessly through the real Puzzle scene: screenshot the board,
// play the solver's solution with the normal input path, and check the scene hands the evidence
// back to its caller (Memory / Village / Archive). Also exercises undo, reset, hint and skip.
// Usage: npm run build && npx tsx tools/shots-puzzle.ts [outDir] [id ...]
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { preview } from 'vite';
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
const gs = <T>(code: string) =>
  page.evaluate((c) => new Function('gs', `return ${c}`)((window as any).__echoes.gameState), code) as Promise<T>;

function route(l: LevelFile) {
  const ev = evidenceJson.evidence.find((e) => e.puzzle === l.id);
  if (l.id === 'pz_archive') return { q: `puzzleId=${l.id}&returnTo=Archive`, back: 'Archive', ev: undefined };
  if (!ev || ev.witness === 'tower') return { q: `puzzleId=${l.id}&evidenceId=${ev?.id}&returnTo=Village`, back: 'Village', ev: ev?.id };
  return { q: `puzzleId=${l.id}&evidenceId=${ev.id}&witness=${ev.witness}&returnTo=Memory`, back: 'Memory', ev: ev.id };
}

/** Clicks through any open popups (first-time mechanic captions); returns how many. */
async function dismissPopups(): Promise<number> {
  let n = 0;
  for (let k = 0; k < 10; k++) {
    await page.waitForTimeout(350);
    const clicked = await page.evaluate(() => {
      const p = (window as any).__puzzle;
      const layer = p?.children.list.find((o: any) => o.name === 'popup');
      const b = layer?.list.find((o: any) => o.name === 'btn:GOT IT');
      if (!b) return false;
      b.emit('click');
      return true;
    });
    if (!clicked) break;
    n++;
  }
  return n;
}

async function open(l: LevelFile) {
  const r = route(l);
  await page.goto(`http://localhost:4183/?scene=Puzzle&${r.q}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitScene('Puzzle');
  await page.waitForFunction(() => (window as any).__puzzle?.level);
  await page.waitForTimeout(500);
  return r;
}

try {
  for (const l of levels) {
    const r = await open(l);
    await page.waitForTimeout(300);
    await shot(`${l.id}-0-teach`);
    const mechanics = await page.evaluate(() => (window as any).__puzzle.mechanics().length);
    const taught = await dismissPopups();
    check(taught === mechanics, `${l.id}: ${taught}/${mechanics} mechanic captions on a fresh save`);
    await shot(`${l.id}-0-start`);
    const sol = solve(parseLevel(l))!;
    // Play all but the last move, screenshot mid-solve, then finish.
    const moves = sol.moves.join('');
    await page.evaluate((m) => (window as any).__puzzle.play(m), moves.slice(0, -1));
    await page.waitForTimeout(400);
    await shot(`${l.id}-1-before-last`);
    await page.evaluate((m) => (window as any).__puzzle.play(m), moves.slice(-1));
    await page.waitForTimeout(500);
    await shot(`${l.id}-2-solved`);
    await waitScene(r.back, 8000).catch(() => {});
    await page.waitForTimeout(1200);
    const scenes = await activeScene(page);
    check(scenes.includes(r.back), `${l.id}: solution wins and returns to ${r.back} (active: ${scenes.join(',')})`);
    if (r.ev) check(await gs<boolean>(`gs.hasEvidence('${r.ev}')`), `${l.id}: ${r.ev} recovered`);
    else check(await gs<boolean>(`gs.flag('archiveEscaped')`), `${l.id}: archive escaped`);
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
  await waitScene(r.back, 8000).catch(() => {});
  await page.waitForTimeout(1200);
  check(r.ev ? await gs<boolean>(`gs.hasEvidence('${r.ev}')`) : true, 'skip still recovers the fragment');

  // Missing level → straight back with the fragment (contract).
  await page.goto('http://localhost:4183/?scene=Puzzle&puzzleId=pz_missing&evidenceId=ev_mira_bell&witness=mira&returnTo=Memory');
  await waitScene('Memory');
  await page.waitForTimeout(1200);
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
