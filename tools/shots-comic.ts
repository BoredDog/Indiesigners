// Screenshots the comic demo at key states and reports console errors.
// Usage: npm run build && npx tsx tools/shots-comic.ts [outDir]
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const outDir = process.argv[2] ?? 'test-results/comic';
const server = await preview({ preview: { port: 4179, strictPort: true }, logLevel: 'silent' });
const url = 'http://localhost:4179/';

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors: string[] = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(url);
await page.waitForFunction(() => (window as any).__comicDemo?.page);
await page.waitForTimeout(1500);
const shot = (name: string) => page.screenshot({ path: `${outDir}/${name}.png` });
await shot('01-page-grey');

// Click BELL! in P3 (find its world position from the scene).
const click = async (panel: string, label: string) => {
  const pos = await page.evaluate(
    ([panelId, text]) => {
      const s = (window as any).__comicDemo;
      const p = s.page.panel(panelId);
      const w = p.overlay.list.find((o: any) => o.opts?.text === text);
      const m = w.getWorldTransformMatrix();
      const canvas = s.game.canvas as HTMLCanvasElement;
      const r = canvas.getBoundingClientRect();
      return { x: r.left + (m.tx * r.width) / 1920, y: r.top + (m.ty * r.height) / 1080 };
    },
    [panel, label],
  );
  await page.mouse.click(pos.x, pos.y);
};
await click('P3', 'BELL!');
await page.waitForTimeout(1500);
await shot('02-bell-revealed');

await page.keyboard.press('Digit5');
await page.waitForTimeout(600);
await shot('03-p5-zoomed');
await click('P5', 'GLASS!');
await page.waitForTimeout(1500);
await shot('04-p5-glass');

await page.keyboard.press('KeyI');
await page.waitForTimeout(1200);
await shot('05-p5-ink');
await page.keyboard.press('Escape');
await page.keyboard.press('KeyC');
await page.waitForTimeout(1600);
await shot('06-all-colour');

await page.keyboard.press('KeyT');
await page.waitForTimeout(300);
await shot('07-page-turn-mid');

console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'No console errors.');
await browser.close();
server.httpServer.close();
