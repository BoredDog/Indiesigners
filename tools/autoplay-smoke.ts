// Headless smoke test of the core loop: Title → New Game → Village → Mira conversation → Memory →
// Deduction (one wrong try, then right ×3) → Aftermath → Village → reload → Continue → Pause.
// Screenshots + console-error report. Usage: npm run build && npx tsx tools/autoplay-smoke.ts [outDir]
import { chromium, type Page } from '@playwright/test';
import { preview } from 'vite';

const outDir = process.argv[2] ?? 'test-results/core';
const server = await preview({ preview: { port: 4181, strictPort: true }, logLevel: 'silent' });
const url = 'http://localhost:4181/?autosolve=1'; // autosolve: Echo Paths hand their fragment straight back (tools/shots-puzzle.ts plays them)
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors: string[] = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

let failed = 0;
const check = (cond: unknown, msg: string) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!cond) failed++;
};
const shot = (name: string) => page.screenshot({ path: `${outDir}/${name}.png` });
const wait = (ms: number) => page.waitForTimeout(ms);

/** Wait until `key` is the active (running) scene. Interval polling: rAF polling is throttled on a busy machine. */
async function scene(key: string) {
  await page.waitForFunction(
    (k) => (window as any).__echoes?.game.scene.getScenes(true).some((s: any) => s.scene.key === k),
    key,
    { polling: 250, timeout: 10_000 },
  );
  await wait(800);
}

/** True if `key` is currently running (no waiting). */
function activeScene(key: string): Promise<boolean> {
  return page.evaluate((k) => (window as any).__echoes.game.scene.getScenes(true).some((s: any) => s.scene.key === k), key);
}

/** Screen position of the topmost game object with this name in the running scenes. */
// Plain JS string: tsx would otherwise inject its __name helper into the browser code.
const FIND = `(n) => {
  const { game } = window.__echoes;
  function walk(list) {
    for (let i = list.length - 1; i >= 0; i--) {
      const o = list[i];
      if (o.visible === false || o.alpha === 0) continue; // Phaser ignores clicks on fully transparent objects
      if (o.list) { const hit = walk(o.list); if (hit) return hit; }
      if (o.name === n) return o;
    }
    return null;
  }
  for (const s of game.scene.getScenes(true).reverse()) {
    const o = walk([...s.children.list].sort((a, b) => a.depth - b.depth));
    if (o) {
      const m = o.getWorldTransformMatrix();
      const r = game.canvas.getBoundingClientRect();
      return { x: r.left + (m.tx * r.width) / 1920, y: r.top + (m.ty * r.height) / 1080 };
    }
  }
  return null;
}`;

/** Screen position of the topmost visible game object with this name in the running scenes. */
async function find(p: Page, name: string): Promise<{ x: number; y: number } | null> {
  return p.evaluate(([code, n]) => new Function(`return (${code})`)()(n), [FIND, name] as const);
}

async function click(name: string, after = 600) {
  let p = await find(page, name);
  for (let i = 0; i < 20 && !p; i++) p = (await wait(200), await find(page, name));
  if (!p) throw new Error(`Not on screen: ${name}`);
  await wait(250); // let entrance tweens (popup scale-in) settle, then re-measure
  p = (await find(page, name)) ?? p;
  await page.mouse.click(p.x, p.y);
  await wait(after);
}

const state = <T>(fn: string) => page.evaluate((code) => new Function('gs', `return ${code}`)((window as any).__echoes.gameState), fn) as Promise<T>;

try {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await scene('Title');
  await shot('01-title');
  await page.mouse.click(960, 540);
  await wait(500);
  check(!(await find(page, 'btn:CONTINUE')), 'no Continue without a save');
  await shot('02-title-menu');
  await click('btn:NEW GAME');
  // New Game plays the Opening first (6 frames); click through it into the Village.
  await scene('Opening');
  // Advance until the Village is up. A fixed 6 presses flaked on slow machines: the Opening
  // ignores input while a frame slides in, so a press can land during the slide and be dropped.
  const inVillage = () => page.evaluate(() => (window as any).__echoes.game.scene.isActive('Village'));
  for (let i = 0; i < 20 && !(await inVillage()); i++) {
    await page.keyboard.press('Space');
    await wait(700);
  }
  await scene('Village');
  // First visit (script §4): the unknown woman's room, then back to the Village.
  await scene('UnknownWoman');
  await wait(1200);
  check(await find(page, 'line:warning'), "unknown woman: \"don't trust the first memory you see\"");
  await shot('03a-unknown-woman');
  await page.mouse.click(300, 500);
  await wait(400);
  check(!(await find(page, 'unknownWoman')), 'she vanishes on click (no fade)');
  await click('btn:CONTINUE');
  await scene('Village');
  check(await state<boolean>("gs.flag('metUnknownWoman')"), 'unknown woman beat seen once (flag saved)');
  await shot('03-village');

  // Hover + conversation
  const mira = await find(page, 'spot:mira');
  await page.mouse.move(mira!.x, mira!.y);
  await wait(300);
  check(await find(page, 'hover'), 'hover status shows');
  await shot('04-village-hover');
  await page.mouse.click(mira!.x, mira!.y);
  await scene('Conversation');
  for (let i = 0; i < 4; i++) await (page.mouse.click(1500, 300), wait(300));
  check(await state<string>("gs.witnessStatus('mira')") === 'active', 'Mira active after first conversation');
  await shot('05-conversation');
  await click('btn:ENTER HER MEMORY');
  await scene('Memory');
  await shot('06-memory');

  // Collect Mira's core evidence the way Memory would, then reconstruct through the Deduction UI.
  await page.evaluate(() => {
    const gs = (window as any).__echoes.gameState;
    ['ev_mira_bell', 'ev_mira_clocks', 'ev_mira_resonance', 'ev_mira_later_entry', 'ev_mira_staff'].forEach((e) => gs.addEvidence(e));
  });
  const deductions: [string, string[]][] = [
    ['sis_1', ['ev_mira_bell', 'ev_mira_clocks', 'ev_mira_resonance']],
    ['sis_2', ['ev_mira_clocks', 'ev_mira_later_entry']],
    ['sis_3', ['ev_mira_staff', 'ev_mira_later_entry']],
  ];
  for (const [i, [id, cards]] of deductions.entries()) {
    await page.evaluate((d) => {
      const { game } = (window as any).__echoes;
      game.scene.getScenes(true)[0].scene.start('Deduction', { deductionId: d, witness: 'mira', returnTo: 'Memory' });
    }, id);
    await scene('Deduction');
    for (const c of cards) await click(`card:${c}`, 150);
    if (i === 0) {
      await click('conclusion:wrong_0', 150);
      await shot('07-deduction-selected');
      await click('btn:CONFIRM');
      await click('btn:CONFIRM');
      check(await find(page, 'btn:BACK TO EVIDENCE'), 'wrong conclusion → unsupported popup');
      await shot('08-deduction-unsupported');
      await click('btn:BACK TO EVIDENCE');
      check(await state<string>(`gs.deductionState('${id}')`) === 'open', 'no penalty / still open');
    }
    await click('conclusion:correct', 150);
    await click('btn:CONFIRM');
    await click('btn:CONFIRM', 1800);
    if (i === 0) await shot('09-deduction-confirmed');
    // CONFIRM (hypothesis popup) and CONTINUE both fade in; a click that lands mid-fade is dropped.
    // So press whichever is on screen until Memory is back (up to ~20 s).
    for (let tries = 0; tries < 40 && !(await activeScene('Memory')); tries++) {
      if (await find(page, 'btn:CONTINUE')) await click('btn:CONTINUE', 400);
      else if (await find(page, 'btn:CONFIRM')) await click('btn:CONFIRM', 1800);
      else await wait(500);
    }
    await scene('Memory');
    check(await state<string>(`gs.deductionState('${id}')`) === 'confirmed', `${id} confirmed via UI`);
  }

  // Leave memory → Aftermath (Mira resolved; no threads yet → "Nothing new").
  await page.evaluate(() => (window as any).__echoes.game.scene.getScenes(true)[0].scene.start('Aftermath', { witness: 'mira' }));
  await scene('Aftermath');
  await wait(800);
  await shot('10-aftermath');
  if (await find(page, 'btn:RETURN')) await click('btn:RETURN');
  check(await state<string>("gs.witnessStatus('mira')") === 'resolved', 'Mira resolved after aftermath');
  await click('btn:RETURN TO VILLAGE');
  await scene('Village');
  await shot('11-village-after-mira');
  check(await find(page, 'mark:mira'), 'resolved Mira leaves a permanent evidence mark in the village (Blueprint K)');

  // Clock tower clue (Puzzle scene autosolves → back to Village with the evidence)
  await click('spot:tower');
  await shot('12-tower-evidence');
  await click('btn:CONTINUE');
  check(await state<boolean>("gs.hasEvidence('ev_tower_residue')"), 'tower residue found');

  // Pause menu
  await page.keyboard.press('Escape');
  await scene('Pause');
  await shot('13-pause');
  await click('btn:RESUME');

  // Close tab → Continue restores state
  await page.reload();
  await scene('Title');
  await page.mouse.click(960, 540);
  await wait(500);
  await click('btn:CONTINUE');
  await scene('Village');
  check(await state<number>("gs.deductionsConfirmed('mira')") === 3, 'Continue restores 3/3 deductions');
  check(await state<string>("gs.witnessStatus('mira')") === 'resolved', 'Continue restores witness state');
  check(await state<number>('gs.allEvidence().length') === 6, 'Continue restores evidence');
  check(!(await activeScene('UnknownWoman')), 'unknown woman does not return on Continue');
  await shot('14-continued');

  // The burned photograph (script §4): close-up with IDENTITY UNKNOWN, then pinned in the Casebook.
  await click('spot:photo');
  check(await find(page, 'photo:fourth'), 'photo close-up: fourth face IDENTITY UNKNOWN');
  check(await find(page, 'photo:mira'), 'photo close-up: met witness is named');
  await shot('15-photo');
  await click('btn:CLOSE');
  check(await state<boolean>("gs.hasEvidence('ev_photo_burned')"), 'burned photograph added as evidence');
  await click('btn:CASEBOOK');
  await scene('Casebook');
  check(await find(page, 'figure:identity-unknown'), 'casebook pins the photo as IDENTITY UNKNOWN');
  await shot('16-casebook-photo');
} catch (e) {
  failed++;
  console.error('FAIL', e);
  await shot('99-failure');
}

console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'No console errors.');
console.log(failed ? `${failed} check(s) failed` : 'Smoke test passed.');
await browser.close();
server.httpServer.close();
process.exit(failed || errors.length ? 1 : 0);
