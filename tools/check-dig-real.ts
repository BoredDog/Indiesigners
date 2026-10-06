// Plays episode 4 (Hanna) for real up to "Climb down the well", then digs the rubble with a held
// left mouse button, exactly as a player would, and checks Elias reaches the shaft.
// Usage: npm run build && npx tsx tools/check-dig-real.ts [--chrome]
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const args = process.argv.slice(2);
const server = await preview({ preview: { port: 4194, strictPort: true }, logLevel: 'silent' });
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

// One step of a simple player: answer the board, pick choice 1, go to the next spot.
const STEP = `
  const d = window.__story, ui = window.__echoes.game.scene.getScene('StoryUI');
  if (!d) return 'boot';
  const all = []; const walk = (o) => { all.push(o); (o.list || []).forEach(walk); };
  ui.children.list.forEach(walk);
  const obj = all.find((o) => o.text && o.text.startsWith('▶'));
  if (obj && /Climb down the well/.test(obj.text)) return 'dig';
  if (d.boardOpen && d.closeBoard) { for (const k of ['qKey', 'qTime']) d.save.flags[k] = true; d.closeBoard(); return 'board'; }
  const c = all.find((o) => o.name && /^btn:1\\. /.test(o.name) && o.active);
  if (c) { c.emit('pointerup'); return 'choice'; }
  if (all.some((o) => o.depth === 70)) return 'qte';
  const ex = d.exploring;
  if (ex && !ex.busy && !d.busyUi) { const s = d.spots.find((s) => !s.when || s.when()); if (s) { d.teleport(s.x, s.y); d.tryInteract(); return 'spot'; } }
  return 'advance';
`;

try {
  await page.goto('http://localhost:4194/?scene=Story&fresh=1&episode=3');
  await page.waitForFunction(() => (window as any).__story, undefined, { polling: 250, timeout: 60_000 });
  await js(`window.__echoes.gameState.setSetting('reduceMotion', true)`);
  let r = '';
  for (let i = 0; i < 3000 && r !== 'dig'; i++) {
    r = await js<string>(STEP);
    if (r === 'advance' || r === 'qte' || r === 'boot') await page.keyboard.press('Space');
    await page.waitForTimeout(r === 'qte' ? 40 : 100);
  }
  check(r === 'dig', 'reached "Climb down the well" in episode 4');
  // Walk onto the open well with the keyboard, like a player.
  const wellX = await js<number>('return window.__story.a.well.x');
  const px = () => js<number>('return window.__story.player.x');
  const dir = (await px()) < wellX ? 'd' : 'a';
  await page.keyboard.down(dir);
  for (let i = 0; i < 200 && Math.abs((await px()) - wellX) > 6; i++) await frames(2);
  await page.keyboard.up(dir);
  await frames(40);
  const box = (await (await page.$('canvas'))!.boundingBox())!;
  const S = 60, WX = 40;
  for (let i = 0; i < 16; i++) {
    const below = await js<{ x: number; y: number } | null>(`const w = window.__echoes.game.scene.getScene('Story'), cam = w.cameras.main, v = cam.worldView, p = w.player; const tx = Math.floor(p.x / 16); let ty = Math.floor(p.y / 16); while (ty < ${S + 8} && w.world.fg[ty][tx] === 0) ty++; if (ty >= ${S + 8}) return null; return { x: (tx * 16 + 8 - v.x) * cam.zoom, y: (ty * 16 + 8 - v.y) * cam.zoom };`);
    if (!below) break;
    await page.mouse.move(box.x + (below.x / 1920) * box.width, box.y + (below.y / 1080) * box.height);
    await page.mouse.down();
    await frames(45);
    await page.mouse.up();
    await frames(20);
  }
  await frames(60);
  const info = await js<{ y: number; x: number }>('const p = window.__story.player; return { x: p.x, y: p.y }');
  check(info.y > (S + 8) * 16, `dug through the rubble in the real episode (feet at tile ${Math.floor(info.y / 16)}, x tile ${Math.floor(info.x / 16)}, well at ${WX})`);
  await page.screenshot({ path: 'test-results/dig-real.png' });
} catch (e) {
  console.log('FAIL', e);
  failed++;
}
check(!errors.length, errors.length ? `page errors: ${errors.slice(0, 3).join(' | ')}` : 'no page errors');
await browser.close();
await server.close();
process.exit(failed ? 1 : 0);
