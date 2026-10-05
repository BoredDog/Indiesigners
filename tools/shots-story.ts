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
const CASES: { name: string; ep: number; advance: number; setup?: string; wait?: number; clicks?: [number, number][]; title?: 'menu' | 'howto' | 'restart' }[] = [
  { name: 'title-menu', ep: -1, advance: 0, title: 'menu' },
  { name: 'title-howto', ep: -1, advance: 0, title: 'howto' },
  { name: 'title-restart', ep: -1, advance: 0, title: 'restart' },
  { name: 'board-focus', ep: 2, advance: 0, setup: `const d=window.__story; d.save.found.push(${FOUND_B}); d.save.flags.qKey=true; d.save.flags.qTime=true; d.save.flags.askWho=true; d.deduce('qWho');` },
  { name: '01-arrival', ep: 0, advance: 1 },
  { name: '02-street', ep: 0, advance: 9, setup: 'const d=window.__story; d.teleport(d.a.footprints.x - 60, d.a.footprints.y);' },
  { name: '03-ivy-namecard', ep: 1, advance: 0, setup: 'const d=window.__story; d.teleport(d.a.school.x - 30, d.a.school.y);' },
  { name: '04-dock', ep: 2, advance: 0, setup: 'const d=window.__story; d.teleport(d.a.dock.x - 40, d.a.dock.y);' },
  { name: '05-board', ep: 2, advance: 0, setup: `const d=window.__story; d.save.found.push(${FOUND_A}); d.save.flags.qKey=true; d.save.flags.sawLanternIvy=true; d.busyUi=false; d.openCasebook();` },
  { name: 'board-select', ep: 2, advance: 0, clicks: [[560, 300]], setup: `const d=window.__story; d.save.found.push(${FOUND_A}); d.save.flags.qKey=true; d.save.flags.sawLanternIvy=true; d.busyUi=false; d.openCasebook();` },
  { name: 'board-pick', ep: 2, advance: 0, clicks: [[900, 610]], setup: `const d=window.__story; d.save.found.push(${FOUND_B}); d.save.flags.qKey=true; d.deduce('qTime');` },
  { name: 'board-wrong', ep: 2, advance: 0, clicks: [[900, 280], [1660, 975], [900, 500], [1660, 975]], setup: `const d=window.__story; d.save.found.push(${FOUND_B}); d.save.flags.qKey=true; d.deduce('qTime');` },
  { name: 'board-solved', ep: 2, advance: 0, clicks: [[900, 610], [1660, 975]], setup: `const d=window.__story; d.save.found.push(${FOUND_B}); d.save.flags.qKey=true; d.deduce('qTime');` },
  { name: '06-deduce', ep: 2, advance: 0, setup: `const d=window.__story; d.save.found.push(${FOUND_B}); d.save.flags.qKey=true; d.deduce('qTime');` },
  { name: '07-chamber', ep: 5, advance: 2 },
  // Every kind of dialog, for a spacing check.
  { name: 'ui-namecard', ep: 1, advance: 0, wait: 4, setup: "void window.__story.nameCard('ELIAS VANE', 'Ghost hunter');" },
  { name: 'ui-choice', ep: 1, advance: 0, setup: "void window.__story.choice(['Watch the figure on the bank.', 'Watch Luke.', 'Ask about the watch.', '…'], { timer: 60, prompt: 'Someone is walking back toward the village. Quick, where do you look?' });" },
  { name: 'ui-toasts', ep: 1, advance: 0, wait: 4, setup: "const d=window.__story; d.found('drawing'); d.remember('Ivy');" },
  { name: 'ui-say', ep: 1, advance: 0, setup: "void window.__story.say('Hanna', 'This isn’t the first time you’ve stood in my doorway. Ask yourself why you don’t remember the others.');" },
  { name: 'ui-qte', ep: 1, advance: 0, wait: 4, setup: "void window.__story.qte.mash('HELP LUKE PUSH THE BOAT', 'SPACE');" },
  { name: 'ui-summary', ep: 1, advance: 0, setup: "const d=window.__story; d.save.flags.ending='light'; d.save.flags.sawCarried=true; d.save.remembered.push('Ivy will remember that.'); void d['summary']();" },
  { name: 'toy-horse', ep: 1, advance: 0, setup: "const d=window.__story; d.teleport(d.a.footprints.x - 60, d.a.footprints.y); setTimeout(() => d.world.add.image(d.player.x + 22, d.player.y, 'w_horse').setOrigin(0.5, 1).setDepth(7).setFlipX(true), 300);" },
  { name: 'nia-flower', ep: 1, advance: 0, setup: "const d=window.__story; d.teleport(d.a.chamber.x - 30, d.a.chamber.y); setTimeout(() => { d.face(-1); d.npc('nia', d.a.chamber.x - 95, d.player.y, { ghost: true, tint: 0xd8f4ff }); d.world.add.image(d.player.x - 30, d.player.y, 'w_horse').setOrigin(0.5, 1).setDepth(7); }, 300);" },
  { name: 'tower-toll', ep: 1, advance: 0, setup: "const d=window.__story; d.teleport(d.a.towerDoor.x - 40, d.a.towerDoor.y); setTimeout(() => { void d.pan(d.a.clock.x, d.a.clock.y + 30, 10); void d.toll(d.a.clock.x, d.a.clock.y); }, 400);" },
  { name: 't01-cemetery', ep: 1, advance: 0, setup: 'const d=window.__story; d.teleport(d.a.start.x + 40, d.a.start.y);' },
  { name: 't02-well-school', ep: 1, advance: 0, setup: 'const d=window.__story; d.teleport(d.a.well.x + 60, d.a.well.y);' },
  { name: 't03-house', ep: 1, advance: 0, setup: 'const d=window.__story; d.teleport(d.a.house.x + 30, d.a.house.y);' },
  { name: 't04-tower-outside', ep: 1, advance: 0, setup: 'const d=window.__story; d.teleport(d.a.towerDoor.x - 70, d.a.towerDoor.y);' },
  { name: 't05-tower-inside', ep: 1, advance: 0, setup: 'const d=window.__story; d.teleport(d.a.bell.x, d.a.footprints.y - 240);' },
  { name: 't06-tower-top', ep: 1, advance: 0, setup: 'const d=window.__story; d.teleport(d.a.bell.x, d.a.bell.y);' },
  { name: 't07-dock', ep: 1, advance: 0, setup: 'const d=window.__story; d.teleport(d.a.dock.x - 30, d.a.dock.y);' },
  { name: 't08-vault', ep: 1, advance: 0, setup: 'const d=window.__story; d.teleport(d.a.vault.x, d.a.vault.y);' },
  { name: 't09-chamber', ep: 1, advance: 0, setup: 'const d=window.__story; d.teleport(d.a.chamber.x, d.a.chamber.y);' },
];

let failed = 0;
try {
  const only = args.find((a) => a.startsWith('--only='))?.split('=')[1];
  for (const c of CASES.filter((k) => !only || only.split(',').some((o) => k.name.includes(o)))) {
    if (c.title) {
      await page.goto('http://localhost:4190/?scene=Title');
      await page.waitForFunction(() => (window as any).__echoes?.game.scene.isActive('Title'), undefined, { polling: 250, timeout: 60_000 });
      await frames(20);
      if (c.title === 'restart') {
        // A save exists, and the player clicks AND presses a key (used to open two menus).
        await js("localStorage.setItem('echoes_story_v3', JSON.stringify({ episode: 3, flags: {}, found: [], remembered: [] })); window.__echoes.game.scene.getScene('Title').scene.restart();");
        await frames(20);
        await page.mouse.click(640, 360);
        await frames(4);
      }
      await page.keyboard.press('Enter');
      await frames(20);
      if (c.title === 'restart') {
        await js("const s = window.__echoes.game.scene.getScene('Title'); const all=[]; const w=(o)=>{all.push(o);(o.list||[]).forEach(w)}; s.children.list.forEach(w); all.find((o)=>o.name==='btn:RESTART STORY').emit('pointerup');");
        await frames(20);
      }
      if (c.title === 'howto') {
        await js("const s = window.__echoes.game.scene.getScene('Title'); const all=[]; const w=(o)=>{all.push(o);(o.list||[]).forEach(w)}; s.children.list.forEach(w); all.find((o)=>o.name==='btn:HOW TO PLAY').emit('pointerup');");
        await frames(20);
      }
      await page.screenshot({ path: `${outDir}/${c.name}.png` });
      console.log('shot', c.name);
      continue;
    }
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
      await frames(c.wait ?? 20);
    }
    // Clicks are in game pixels (1920×1080); the page shows the canvas at the viewport size.
    for (const [x, y] of c.clicks ?? []) {
      const box = (await page.$('canvas'))!.boundingBox ? await (await page.$('canvas'))!.boundingBox() : null;
      if (box) await page.mouse.click(box.x + (x / 1920) * box.width, box.y + (y / 1080) * box.height);
      await frames(15);
    }
    for (let i = 0; i < c.advance; i++) {
      await page.keyboard.press('Space');
      await frames(30);
    }
    if (c.wait === undefined) await frames(20);
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
