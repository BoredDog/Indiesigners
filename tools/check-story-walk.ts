// Story mode movement check with real key presses (no teleporting through walls):
//  1. walk east along the street from the footprints, through the clock tower, past it;
//  2. walk back into the tower and climb the planks to the bell floor by jumping.
// Usage: npm run build && npx tsx tools/check-story-walk.ts [--chrome]
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const args = process.argv.slice(2);
const server = await preview({ preview: { port: 4193, strictPort: true }, logLevel: 'silent' });
const browser = await chromium.launch({ channel: args.includes('--chrome') ? 'chrome' : undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e)));
const js = <T = unknown>(code: string) => page.evaluate((c) => new Function(c)(), code) as Promise<T>;
const frames = async (n: number) => {
  const f0 = await js<number>('return window.__echoes.game.loop.frame');
  await page.waitForFunction((t) => (window as any).__echoes.game.loop.frame >= t, f0 + n, { polling: 50, timeout: 120_000 });
};
let failed = 0;
const check = (ok: unknown, msg: string) => (console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`), ok || failed++);

try {
  await page.goto('http://localhost:4193/?scene=Story&fresh=1');
  await page.waitForFunction(() => (window as any).__story, undefined, { polling: 250, timeout: 60_000 });
  await js(`window.__echoes.gameState.setSetting('reduceMotion', true)`);
  // Skip ahead to free exploration in episode 1 (press through dialogue and choices).
  for (let i = 0; i < 400; i++) {
    const exploring = await js<boolean>('const d = window.__story; return !!(d.exploring && !d.exploring.busy && !d.busyUi)');
    if (exploring) break;
    await js(`const ui = window.__echoes.game.scene.getScene('StoryUI'); const all=[]; const w=(o)=>{all.push(o);(o.list||[]).forEach(w)}; ui.children.list.forEach(w); const c = all.find((o)=>o.name && /^btn:1\\. /.test(o.name)); if (c) c.emit('pointerup');`);
    await page.keyboard.press('Enter');
    await frames(4);
  }
  const pos = () => js<{ x: number; y: number; tx: number; ty: number }>('const p = window.__story.player; return { x: p.x, y: p.y, tx: Math.floor(p.x / 16), ty: Math.floor(p.y / 16) }');
  const towerL = 80, towerR = 88;

  // 1. Walk the street east, through the tower.
  await js(`const d = window.__story; d.teleport(${(towerL - 6) * 16}, d.a.footprints.y)`);
  await frames(10);
  await page.keyboard.down('d');
  for (let i = 0; i < 120 && (await pos()).tx < towerR + 4; i++) await frames(5);
  await page.keyboard.up('d');
  check((await pos()).tx >= towerR + 4, `walked through the clock tower (reached tile ${(await pos()).tx})`);

  // 2. Back inside, stand in the middle column and jump up through the planks.
  await js(`const d = window.__story; d.teleport(${(towerL + 5) * 16}, d.a.footprints.y)`);
  await frames(10);
  const bellY = await js<number>('return window.__story.a.bell.y');
  for (let i = 0; i < 40 && (await pos()).y > bellY + 4; i++) {
    await page.keyboard.down('Space');
    await frames(6);
    await page.keyboard.up('Space');
    await frames(30);
  }
  const p = await pos();
  check(p.y <= bellY + 4, `climbed the tower to the bell floor (feet at ${p.y | 0}, bell floor ${bellY})`);
  const near = await js<boolean>('const d = window.__story; return !!d.spots.find((s) => s.id === "bell") && Math.abs(d.player.x - d.a.bell.x) < 60');
  check(near, 'the bell rope spot is reachable from there');
} catch (e) {
  console.log('FAIL', e);
  failed++;
}
check(errors.length === 0, `no page errors ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
server.httpServer.close();
process.exit(failed ? 1 : 0);
