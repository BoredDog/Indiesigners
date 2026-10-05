// Clicks through Opening → Village, and Finale → Ending (truth, epilogue, summary), screenshotting
// every frame. Usage: npm run build && npx tsx tools/shots-sequence.ts [outDir]
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const outDir = process.argv[2] ?? 'test-results/sequence';
const server = await preview({ preview: { port: 4187, strictPort: true }, logLevel: 'silent' });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors: string[] = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const shot = (n: string) => page.screenshot({ path: `${outDir}/${n}.png`, timeout: 120_000 });
const active = () =>
  page.evaluate(() => (window as any).__echoes.game.scene.getScenes(true).map((s: any) => s.scene.key).join(','));
const advance = async (wait = 2600) => {
  await page.keyboard.press('Space');
  await page.waitForTimeout(wait);
};
let failures = 0;
const expect = (ok: boolean, what: string) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures++;
};

// Opening
await page.goto('http://localhost:4187/?scene=Opening');
await page.waitForFunction(() => (window as any).__echoes?.game.scene.isActive('Opening'));
await page.waitForTimeout(2200);
for (let i = 1; i <= 6; i++) {
  await shot(`opening-${i}`);
  if (i < 6) await advance();
}
await advance(1800);
expect((await active()).includes('Village'), 'Opening ends in Village');

// Finale → Ending (fresh save, so no epilogue)
await page.goto('http://localhost:4187/?scene=Finale');
await page.waitForFunction(() => (window as any).__echoes?.game.scene.isActive('Finale'));
await page.waitForTimeout(2200);
for (let i = 1; i <= 8; i++) {
  await shot(`finale-${i}`);
  if (i < 8) await advance(i === 6 || i === 7 ? 4200 : 2600);
}
await advance(2500);
expect((await active()).includes('Ending'), 'Finale ends in Ending');
await page.waitForTimeout(2500);
await shot('ending-1-truth');
// Every player: the clock frame (2:17 → 2:18), then the closing desk, then the summary.
await advance(2600);
await shot('ending-2-clock');
// Plain JS strings: tsx would inject its __name helper into named functions sent to the browser.
const FIND_IN_ENDING = `(name) => {
  const walk = (list) => { for (const o of list) { if (o.name === name) return o; const h = o.list && walk(o.list); if (h) return h; } return null; };
  return walk(window.__echoes.game.scene.getScene('Ending').children.list);
}`;
const findInEnding = (name: string) =>
  page.evaluate(([code, n]) => {
    const o = new Function(`return (${code})`)()(n);
    return o ? { angle: o.angle as number } : null;
  }, [FIND_IN_ENDING, name] as const);
const minute = (await findInEnding('clock:minute'))?.angle;
expect(Math.abs(((minute ?? 0) + 360) % 360 - 108) < 1, `clock reaches 2:18 for every player (minute hand at ${minute}°)`);
for (let i = 3; i <= 5 && !(await findInEnding('btn:PLAY AGAIN')); i++) {
  await advance(2000);
  await shot(`ending-${i}`);
}
await shot('ending-summary');
expect(
  await page.evaluate(() => (window as any).__echoes.gameState.finale === 'complete'),
  'finale state is complete',
);

console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'No console errors.');
await browser.close();
server.httpServer.close();
if (errors.length || failures) process.exit(1);
