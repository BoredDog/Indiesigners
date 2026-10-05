// The Road to Veyra: drives the Trail scene through outfitting, travel, an event, a landmark,
// the ledger, hallucination and the ending, screenshotting each and failing on console errors.
// Usage: npm run build && npx tsx tools/shots-trail.ts [outDir] [--chrome]   (--chrome = system Chrome)
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const outDir = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'test-results/trail';
const server = await preview({ preview: { port: 4186, strictPort: true }, logLevel: 'silent' });
const browser = await chromium.launch({
  channel: process.argv.includes('--chrome') ? 'chrome' : undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors: string[] = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const shot = (n: string) => page.screenshot({ path: `${outDir}/${n}.png`, timeout: 120_000 });
const wait = (ms: number) => page.waitForTimeout(ms);
/** Software rendering can run at a few fps, so wait for game frames, not wall-clock time. */
async function frames(n: number) {
  const f0 = await page.evaluate(() => (window as any).__echoes.game.loop.frame);
  await page.waitForFunction((t) => (window as any).__echoes.game.loop.frame >= t, f0 + n, { polling: 100, timeout: 120_000 });
}
let failed = 0;
const check = (cond: unknown, msg: string) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!cond) failed++;
};

/** Click the first visible comic button with this label (buttons are named `btn:<LABEL>`). */
async function click(labelText: string) {
  const pos = (await page.evaluate(
    (c) => new Function(c)(),
    `const s = window.__echoes.game.scene.getScene('Trail');
     const all = [];
     const walk = (o) => { all.push(o); (o.list || []).forEach(walk); };
     s.children.list.forEach(walk);
     const b = all.find((o) => o.name === ${JSON.stringify('btn:' + labelText)} && o.visible !== false);
     if (!b) return null;
     const r = b.getBounds();
     return { x: r.centerX, y: r.centerY };`,
  )) as { x: number; y: number } | null;
  if (!pos) throw new Error(`no button ${labelText}`);
  await page.mouse.click(pos.x, pos.y);
  await frames(6);
}
const run = (fn: string) => page.evaluate((c) => new Function(c)(), `const t = window.__trail, s = window.__echoes.game.scene.getScene('Trail'); ${fn}`);

try {
  await page.goto('http://localhost:4186/?scene=Trail');
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:4186/?scene=Trail');
  await page.waitForFunction(() => (window as any).__echoes?.game.scene.isActive('Trail'), undefined, { polling: 250 });
  await wait(1500);
  await shot('01-outfitter');

  for (let i = 0; i < 4; i++) await click('+5'); // first +5 is lamp oil
  await click('SET OUT ▸');
  check(await run(`return s.mode === 'travel'`), 'SET OUT starts travelling');
  await run(`t.s.rations = 18; t.s.tonic = 1; for (let i = 0; i < 4; i++) s.tick(); s.refreshHud();`);
  await frames(20);
  await shot('02-travel');
  check(await run(`return t.s.mile > 0`), 'the cart moves along the road');

  await run(`const ev = { id: 'lantern_figure', title: 'A LANTERN AHEAD', text: 'Someone stands in the road with a lantern on a long staff. Same coat as yours. Same hat.', art: 'figure', choices: [{ label: 'Call out', result: 'It raises the lantern when you do.', effects: { composure: -8 } }, { label: 'Walk through', result: 'Cold.', effects: { composure: -12 } }] }; s.showEvent(ev);`);
  await frames(10);
  await shot('03-event');
  await click('Call out');
  await click('CONTINUE');

  await run(`t.s.mile = 61.5; t.s.nextLandmark = 2; s.tick();`);
  await frames(10);
  check(await run(`return s.mode === 'card'`), 'arriving at the asylum opens its card');
  await shot('04-landmark-asylum');
  await click('SEARCH');
  await shot('05-search');
  await click('CONTINUE');
  await click('MOVE ON');

  await run(`t.s.ledger.push({ text: 'Night 3. 70 miles from the ferry. Nia and I shared supper — two portions.', questionable: 'rations' }); s.openLedger();`);
  await frames(8);
  await shot('06-ledger');
  await click('QUESTION IT');
  await shot('07-questioned');
  await click('CONTINUE');
  await click('CLOSE');

  await run(`t.s.composure = 15; s.refreshHud();`);
  await frames(20);
  await shot('08-hallucinating');

  // Reduce Motion collapses the ending's timed reveals so the test doesn't wait minutes.
  await page.evaluate(() => (window as any).__echoes.gameState.setSetting('reduceMotion', true));
  await run(`t.s.composure = 70; t.s.doubts = ['file','ferry','shadow']; t.s.mile = 139; t.s.nextLandmark = 5; t.s.oil = 10; s.tick();`);
  await frames(30);
  check(await run(`return s.mode === 'ending'`), 'reaching Veyra plays the ending');
  await shot('09-ending-truth');
  await click('ENTER VEYRA ▸');
  await frames(40);
  check(await page.evaluate(() => (window as any).__echoes.game.scene.isActive('Opening')), 'ENTER VEYRA starts the main game');
} catch (e) {
  console.log('FAIL', e);
  failed++;
  await shot('zz-failure').catch(() => undefined);
}
check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.slice(0, 5).join(' | ') : ''}`);
await browser.close();
server.httpServer.close();
process.exit(failed ? 1 : 0);
