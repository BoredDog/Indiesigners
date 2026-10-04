// Plays a witness memory page headlessly: tip → reveal every fragment (incl. puzzle-locked ones)
// → RECONSTRUCT until all deductions confirmed → LEAVE MEMORY. Screenshots + console errors.
// Usage: npm run build && npx tsx tools/shots-memory.ts [mira|arun|leela] [outDir]
import { chromium, type Page } from '@playwright/test';
import { preview } from 'vite';

const witness = process.argv[2] ?? 'mira';
const outDir = process.argv[3] ?? `test-results/memory-${witness}`;
const server = await preview({ preview: { port: 4180, strictPort: true }, logLevel: 'silent' });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors: string[] = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

const shot = (name: string) => page.screenshot({ path: `${outDir}/${name}.png`, timeout: 120_000 });

/** Screen position of a game object's world transform. */
async function screenPos(page: Page, expr: string) {
  return page.evaluate((code) => {
    const s = (window as any).__memory;
    const obj = new Function('s', `return ${code}`)(s);
    const m = obj.getWorldTransformMatrix();
    const r = (s.game.canvas as HTMLCanvasElement).getBoundingClientRect();
    return { x: r.left + (m.tx * r.width) / 1920, y: r.top + (m.ty * r.height) / 1080 };
  }, expr);
}
async function clickObj(expr: string) {
  const p = await screenPos(page, expr);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(700);
}
const state = () =>
  page.evaluate(() => {
    const s = (window as any).__memory;
    return {
      counter: s.counter.text,
      reconstruct: s.reconstructBtn.visible,
      leave: s.leaveBtn.visible,
      revealed: [...s.words.entries()].filter(([, w]: any) => w.revealed).map(([k]: any) => k),
    };
  });

await page.goto(`http://localhost:4180/?scene=Memory&witness=${witness}`);
await page.waitForFunction(() => (window as any).__memory?.page);
await page.waitForTimeout(1200);
await shot('01-tip');
await page.mouse.click(960, 620); // GOT IT
await page.waitForTimeout(400);
await shot('02-page');

const ids: string[] = await page.evaluate(() => [...(window as any).__memory.words.keys()]);
for (const id of ids) {
  const word = `s.words.get(${JSON.stringify(id)})`;
  await clickObj(word); // locked words unlock on first click (no Puzzle scene yet)
  const locked = await page.evaluate((code) => new Function('s', `return ${code}.revealed`)((window as any).__memory), word);
  if (!locked) await clickObj(word);
}
await page.waitForTimeout(800);
await shot('03-all-found');
console.log('after fragments:', await state());

// RECONSTRUCT opens the real Deduction scene (tested by autoplay-smoke); here we only check
// the button appears, then confirm through game state and reopen the page.
const before = await state();
if (!before.reconstruct) throw new Error('RECONSTRUCT not shown with all evidence found');
await page.evaluate((w) => {
  const s = (window as any).__memory;
  for (const d of s.deps.deductionsFor(w)) s.deps.confirmDeduction(d.id);
  s.scene.restart({ witness: w });
}, witness);
await page.waitForTimeout(1500);
const final = await state();
console.log('after confirming:', final);
await shot('04-ready-to-leave');

console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'No console errors.');
await browser.close();
server.httpServer.close();
if (errors.length || !final.leave || final.revealed.length !== ids.length) process.exit(1);
