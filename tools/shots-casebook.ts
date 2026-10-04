// Casebook check: finish Mira's page, add two Arun clues, open the casebook, open a card.
// Usage: npm run build && npx tsx tools/shots-casebook.ts [outDir]
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const outDir = process.argv[2] ?? 'test-results/casebook';
const server = await preview({ preview: { port: 4181, strictPort: true }, logLevel: 'silent' });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors: string[] = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const shot = (n: string) => page.screenshot({ path: `${outDir}/${n}.png`, timeout: 120_000 });

await page.goto('http://localhost:4181/?scene=Memory&witness=mira');
await page.waitForFunction(() => (window as any).__memory?.page);
await page.waitForTimeout(800);
await page.evaluate(() => {
  const s = (window as any).__memory;
  s.deps.markSeen('tip_evidence');
  for (const id of ['ev_mira_bell', 'ev_mira_clocks', 'ev_mira_resonance', 'ev_mira_later_entry', 'ev_arun_tick', 'ev_arun_cloth', 'ev_mira_clinic'])
    s.deps.addEvidence(id);
  s.deps.confirmDeduction('sis_1');
  s.deps.confirmDeduction('sis_2');
  s.scene.sleep();
  s.scene.launch('Casebook', { returnTo: 'Memory' });
});
await page.waitForTimeout(3000);
await shot('01-board');
// Open the sis_2 card (Mira column, second row).
const r = await page.evaluate(() => (window as any).__memory.game.canvas.getBoundingClientRect());
await page.mouse.click(r.left + (300 * r.width) / 1920, r.top + (590 * r.height) / 1080);
await page.waitForTimeout(500);
await shot('02-detail');
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.waitForTimeout(1500);
const resumed = await page.evaluate(() => (window as any).__memory.scene.isActive());
console.log('memory resumed after close:', resumed);
console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'No console errors.');
await browser.close();
server.httpServer.close();
if (errors.length || !resumed) process.exit(1);
