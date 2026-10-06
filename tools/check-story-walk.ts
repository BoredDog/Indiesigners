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

  // 3. Dig the well rubble with a real held left mouse button, after opening and closing the
  //    board with its own button (that used to leave digging switched off).
  const box = (await page.$('canvas'))!.boundingBox ? await (await page.$('canvas'))!.boundingBox() : null;
  const toScreen = (gx: number, gy: number) => ({ x: box!.x + (gx / 1920) * box!.width, y: box!.y + (gy / 1080) * box!.height });
  const btn = toScreen(1920 - 190, 50);
  await page.mouse.click(btn.x, btn.y);
  await frames(20);
  await page.keyboard.press('c');
  await frames(20);
  const S = 60, WX = 40;
  await js(`const d = window.__story, w = window.__echoes.game.scene.getScene('Story'); for (let y = ${S}; y <= ${S} + 2; y++) for (let x = ${WX - 1}; x <= ${WX + 1}; x++) w.clearTile(x, y); d.teleport(${WX * 16 + 8}, ${(S + 3) * 16});`);
  await frames(30);
  const target = await js<{ x: number; y: number }>(`const cam = window.__echoes.game.scene.getScene('Story').cameras.main; const v = cam.worldView; return { x: (${WX * 16 + 8} - v.x) * cam.zoom, y: (${(S + 3) * 16 + 8} - v.y) * cam.zoom };`);
  const m = toScreen(target.x, target.y);
  await page.mouse.move(m.x, m.y);
  await page.mouse.down();
  await frames(60);
  await page.mouse.up();
  const dug = await js<number>(`return window.__echoes.game.scene.getScene('Story').world.fg[${S + 3}][${WX}]`);
  check(dug === 0, `held the left mouse button and dug a block of well rubble (tile now ${dug})`);
  // Keep digging down the column, the way a player would, and make sure Elias drops through.
  for (let i = 0; i < 12; i++) {
    const below = await js<{ x: number; y: number; ty: number } | null>(`const w = window.__echoes.game.scene.getScene('Story'), cam = w.cameras.main, v = cam.worldView, p = w.player; let ty = Math.floor(p.y / 16); while (ty < ${S + 8} && w.world.fg[ty][${WX}] === 0) ty++; if (ty >= ${S + 8}) return null; return { x: (${WX * 16 + 8} - v.x) * cam.zoom, y: (ty * 16 + 8 - v.y) * cam.zoom, ty };`);
    if (!below) break;
    const pt = toScreen(below.x, below.y);
    await page.mouse.move(pt.x, pt.y);
    await page.mouse.down();
    await frames(45);
    await page.mouse.up();
    await frames(20);
  }
  await frames(40);
  const feet = await js<number>('return window.__story.player.y');
  check(feet > (S + 8) * 16, `dug through all the rubble and dropped into the shaft (feet at tile ${Math.floor(feet / 16)}, rubble ends at ${S + 6})`);
} catch (e) {
  console.log('FAIL', e);
  failed++;
}
check(errors.length === 0, `no page errors ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
server.httpServer.close();
process.exit(failed ? 1 : 0);
