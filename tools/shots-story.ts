// Story-mode screenshots. Each case opens an episode, waits out the episode card, optionally runs
// a setup snippet, advances some dialogue and screenshots. Fails on console errors.
// Usage: npm run build && npx tsx tools/shots-story.ts [outDir] [--chrome] [--only=board,deduce]
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--')) ?? 'test-results/story';
const server = await preview({ preview: { port: 4190, strictPort: true }, logLevel: 'silent' });
const browser = await chromium.launch({ channel: args.includes('--chrome') ? 'chrome' : undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors: string[] = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const js = <T = unknown>(code: string) => page.evaluate((c) => new Function(c)(), code) as Promise<T>;
const frames = async (n: number) => {
  const f0 = await js<number>('return window.__echoes.game.loop.frame');
  await page.waitForFunction((t) => (window as any).__echoes.game.loop.frame >= t, f0 + n, { polling: 100, timeout: 180_000 });
};

const FOUND_A = "'case','figure','footprints','key','bell','records','photo','symbols','drawing','ivy','ivyMem','luke'";
const FOUND_B = "'case','figure','footprints','key','bell','records','photo','symbols','ivy','ivyMem','luke','lukeMem','carried'";
const CASES: { name: string; ep: number; advance: number; setup?: string }[] = [
  { name: '01-arrival', ep: 0, advance: 1 },
  { name: '02-street', ep: 0, advance: 9, setup: 'const d=window.__story; d.teleport(d.a.footprints.x - 60, d.a.footprints.y);' },
  { name: '03-ivy-namecard', ep: 1, advance: 0, setup: 'const d=window.__story; d.teleport(d.a.school.x - 30, d.a.school.y);' },
  { name: '04-dock', ep: 2, advance: 0, setup: 'const d=window.__story; d.teleport(d.a.dock.x - 40, d.a.dock.y);' },
  { name: '05-board', ep: 2, advance: 0, setup: `const d=window.__story; d.save.found.push(${FOUND_A}); d.save.flags.qKey=true; d.save.flags.sawLanternIvy=true; d.busyUi=false; d.openCasebook();` },
  { name: '06-deduce', ep: 2, advance: 0, setup: `const d=window.__story; d.save.found.push(${FOUND_B}); d.save.flags.qKey=true; d.deduce('qTime');` },
  { name: '07-chamber', ep: 5, advance: 2 },
];

let failed = 0;
try {
  const only = args.find((a) => a.startsWith('--only='))?.split('=')[1];
  for (const c of CASES.filter((k) => !only || only.split(',').some((o) => k.name.includes(o)))) {
    await page.goto(`http://localhost:4190/?scene=Story&fresh=1&episode=${c.ep}`);
    await page.waitForFunction(() => (window as any).__story, undefined, { polling: 250, timeout: 60_000 });
    // Wait out the episode card (the only thing at depth 40 in the UI scene).
    await page.waitForFunction(() => {
      const ui = (window as any).__echoes.game.scene.getScene('StoryUI');
      return ui && !ui.children.list.some((o: { depth: number }) => o.depth === 40);
    }, undefined, { polling: 200, timeout: 180_000 });
    await frames(30);
    if (c.setup) {
      await js(c.setup);
      await frames(20);
    }
    for (let i = 0; i < c.advance; i++) {
      await page.keyboard.press('Space');
      await frames(30);
    }
    await frames(20);
    await page.screenshot({ path: `${outDir}/${c.name}.png` });
    console.log('shot', c.name);
  }
} catch (e) {
  console.log('FAIL', e);
  failed++;
}
console.log(errors.length ? `FAIL console errors: ${errors.slice(0, 5).join(' | ')}` : 'ok   no console errors');
await browser.close();
server.httpServer.close();
process.exit(failed || errors.length ? 1 : 0);
