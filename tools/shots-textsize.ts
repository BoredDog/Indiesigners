// N7: screenshots of every text-heavy screen at a text size (default 150 %) to check the setting is
// applied and nothing breaks: Conversation, Memory (tip + evidence card), Deduction, Aftermath,
// Casebook, Puzzle tip, a popup. Also checks the setting actually changed rendered font sizes.
// Usage: npm run build && npx tsx tools/shots-textsize.ts [100|125|150] [outDir]
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const size = Number(process.argv[2] ?? 150);
const outDir = process.argv[3] ?? `test-results/textsize-${size}`;
const server = await preview({ preview: { port: 4192, strictPort: true }, logLevel: 'silent' });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors: string[] = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
let failed = 0;
const check = (c: unknown, m: string) => {
  console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`);
  if (!c) failed++;
};

/** Starts a scene with a fresh save at this text size, mid-game state for the given setup. */
async function open(scene: string, data: Record<string, unknown> = {}, setup = '') {
  await page.goto('http://localhost:4192/');
  await page.waitForFunction(() => (window as any).__echoes?.game.scene.getScenes(true).length > 0);
  await page.evaluate(
    ([sz, sc, d, code]) => {
      const { game, gameState: gs } = (window as any).__echoes;
      gs.newGame();
      gs.setSetting('textSize', sz);
      new Function('gs', code as string)(gs);
      game.scene.getScenes(true).forEach((s: any) => s.scene.stop());
      // Start on the next tick: starting a scene stopped in this same frame (e.g. Title) is dropped.
      setTimeout(() => game.scene.start(sc, d), 50);
    },
    [size, scene, data, setup] as const,
  );
  await page.waitForFunction((k) => (window as any).__echoes.game.scene.isActive(k), scene);
  await page.waitForTimeout(1500);
}
const shot = (n: string) => page.screenshot({ path: `${outDir}/${n}.png`, timeout: 120_000 });

const evid = "['ev_mira_bell','ev_mira_clocks','ev_mira_resonance','ev_arun_tick','ev_arun_footsteps'].forEach((e) => gs.addEvidence(e))";
try {
  await open('Conversation', { witness: 'mira' }, evid + "; gs.setWitness('mira','active')");
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);
  await shot('01-conversation');

  await open('Memory', { witness: 'mira' });
  await shot('02-memory-tip');
  await page.mouse.click(960, 620);
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const w = (window as any).__memory.words.get('ev_mira_bell');
    w.emit('pointerup', {}, 0, 0, { stopPropagation() {} });
  });
  await page.waitForTimeout(900);
  await shot('03-memory-evidence-card');

  await open('Deduction', { deductionId: 'sis_1', witness: 'mira', returnTo: 'Memory' }, evid);
  await shot('04-deduction');

  await open('Aftermath', { witness: 'mira' }, evid + "; ['sis_1','sis_2','sis_3'].forEach((d)=>gs.confirmDeduction(d))");
  await page.waitForTimeout(800);
  await shot('05-aftermath');

  await open('Casebook', { returnTo: 'Village' }, evid + "; gs.confirmDeduction('sis_1')");
  await shot('06-casebook');

  await open('Puzzle', { puzzleId: 'pz_tower', evidenceId: 'ev_tower_residue', returnTo: 'Village' });
  await page.waitForTimeout(500);
  await shot('07-puzzle-caption');

  // The setting must change real sizes: the same caption bubble font at this size vs 100 %.
  // Plain JS string: tsx would inject its __name helper into a named function here.
  const captionFont = (await page.evaluate(`(() => {
    const p = window.__puzzle;
    const layer = p.children.list.find((o) => o.name === 'popup');
    let px = 0;
    const walk = (l) => l.forEach((o) => { if (o.list) walk(o.list); if (o.type === 'Text') px = Math.max(px, parseFloat(o.style.fontSize)); });
    walk(layer ? layer.list : []);
    return px;
  })()`)) as number;
  // popup() uses fontSize 30 for its narration box; Bubble scales it.
  check(Math.abs(captionFont - Math.round(30 * (size / 100))) <= 1, `caption text is ${captionFont}px at ${size}% (expected ~${Math.round(30 * (size / 100))})`);

  const countLoops = async () =>
    (await page.evaluate(`(() => {
      let n = 0;
      for (const s of window.__echoes.game.scene.getScenes(true))
        for (const t of s.tweens.getTweens()) if ((t.data || []).some((d) => d.repeat === -1) || t.loop === -1) n++;
      return n;
    })()`)) as number;
  // Control: with default settings the Title's CTA pulses, so the detector must see it.
  await open('Title', {});
  check((await countLoops()) > 0, 'control: endless tweens are detected with default settings');

  // Reduce Motion + Reduce Flashing: no screen may keep an endless (repeat: -1) tween running.
  for (const [scene, data] of [
    ['Title', {}],
    ['Opening', {}],
    ['Village', {}],
    ['Conversation', { witness: 'mira' }],
    ['Memory', { witness: 'mira' }],
    ['Puzzle', { puzzleId: 'pz_mom_1', evidenceId: 'ev_leela_tink', witness: 'leela', returnTo: 'Memory' }],
    ['Finale', {}],
  ] as [string, Record<string, unknown>][]) {
    await open(scene, data, "gs.setSetting('reduceMotion', true); gs.setSetting('reduceFlashing', true)");
    const loops = await countLoops();
    check(loops === 0, `${scene}: no endless tweens under Reduce Motion + Reduce Flashing (${loops})`);
  }
} catch (e) {
  failed++;
  console.error(e);
}
console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'No console errors.');
await browser.close();
server.httpServer.close();
process.exit(failed || errors.length ? 1 : 0);
