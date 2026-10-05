// N8: plays the whole game to the summary screen for all 6 witness orders, through the real UI:
// Title → New Game → Opening → Village → (Conversation → Memory → real Puzzles → Deduction ×3 →
// Aftermath) ×3 → clock tower → THE RECORD → Archive → pz_archive → Finale → Ending summary.
// Puzzles are played move by move with the solver's solution (no autosolve). Each order runs in its
// own browser context (own save), a few in parallel. Order 1 runs with default settings; the rest
// with Reduce Motion on, which also proves that setting end to end and keeps the suite fast.
// Usage: npm run build && npx tsx tools/autoplay-full.ts [outDir] [orderIndex ...] [--browser=firefox|msedge]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, firefox, type Browser, type Page } from '@playwright/test';
import { preview } from 'vite';
import { parseLevel } from '../src/puzzle/Rules';
import { solve } from '../src/puzzle/Solver';
import type { LevelFile } from '../src/puzzle/types';
import deductionsJson from '../content/deductions.json';
import dialogueJson from '../content/dialogue.json';

type Witness = 'mira' | 'arun' | 'leela';
const ORDERS: Witness[][] = [
  ['mira', 'arun', 'leela'],
  ['mira', 'leela', 'arun'],
  ['arun', 'mira', 'leela'],
  ['arun', 'leela', 'mira'],
  ['leela', 'mira', 'arun'],
  ['leela', 'arun', 'mira'],
];
// Flags (work in npm scripts on Windows too): --browser=chromium|firefox|msedge (N9).
const flag = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const outDir = positional[0] ?? 'test-results/autoplay';
const pick = positional.slice(1).map(Number);
const BROWSER = flag('browser') ?? process.env.AUTOPLAY_BROWSER ?? 'chromium';
const PARALLEL = Number(process.env.AUTOPLAY_PARALLEL ?? 3);
const PORT = 4191;

// Solutions for every level, computed once in Node.
const SOLUTIONS = new Map<string, string>();
for (const f of ['pz_tower', 'pz_sis_1', 'pz_sis_2', 'pz_sis_3', 'pz_bro_1', 'pz_bro_2', 'pz_bro_3', 'pz_mom_1', 'pz_mom_2', 'pz_mom_3', 'pz_archive']) {
  const file = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'content', 'puzzles', `${f}.json`), 'utf8')) as LevelFile;
  SOLUTIONS.set(f, solve(parseLevel(file))!.moves.join(''));
}
const DEDUCTIONS = deductionsJson.deductions as { id: string; witness: Witness; requiredEvidence: string[] }[];

// Browser-side lookup: topmost visible object by name, or a Text whose text is `label` (ComicButtons
// without a name). Returns its screen position. Plain JS string so tsx doesn't inject helpers.
const FIND = `(key) => {
  const { game } = window.__echoes;
  const hit = (o) => o.name === key || (o.type === 'Text' && o.text === key);
  function walk(list) {
    for (let i = list.length - 1; i >= 0; i--) {
      const o = list[i];
      if (o.visible === false || o.alpha === 0) continue; // Phaser ignores clicks on fully transparent objects
      if (o.list) { const h = walk(o.list); if (h) return h; }
      if (hit(o)) return o;
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

class Run {
  log: string[] = [];
  failed = 0;
  errors: string[] = [];
  constructor(
    readonly page: Page,
    readonly order: Witness[],
    readonly tag: string,
  ) {
    page.on('console', (m) => m.type() === 'error' && this.errors.push(m.text()));
    page.on('pageerror', (e) => this.errors.push(String(e)));
  }

  check(cond: unknown, msg: string) {
    this.log.push(`${cond ? 'ok  ' : 'FAIL'} [${this.tag}] ${msg}`);
    if (!cond) this.failed++;
  }
  wait(ms: number) {
    return this.page.waitForTimeout(ms);
  }
  shot(name: string) {
    return this.page.screenshot({ path: `${outDir}/${this.tag}-${name}.png`, timeout: 120_000 }).catch(() => {});
  }
  gs<T>(code: string): Promise<T> {
    return this.page.evaluate((c) => new Function('gs', `return ${c}`)((window as any).__echoes.gameState), code) as Promise<T>;
  }
  active(): Promise<string[]> {
    return this.page.evaluate(() => (window as any).__echoes.game.scene.getScenes(true).map((s: any) => s.scene.key));
  }
  async scene(key: string, timeout = 30_000) {
    await this.page.waitForFunction(
      (k) => (window as any).__echoes?.game.scene.getScenes(true).some((s: any) => s.scene.key === k),
      key,
      { timeout },
    );
    await this.wait(300);
  }
  find(key: string) {
    return this.page.evaluate(([code, k]) => new Function(`return (${code})`)()(k), [FIND, key] as const) as Promise<{ x: number; y: number } | null>;
  }
  /** Clicks a named object or a button label once it is on screen. */
  async click(key: string, after = 400, timeout = 20_000) {
    const t0 = Date.now();
    let p = await this.find(key);
    while (!p && Date.now() - t0 < timeout) p = (await this.wait(200), await this.find(key));
    if (!p) throw new Error(`Not on screen: ${key} (scenes: ${(await this.active()).join(',')})`);
    await this.wait(200); // let scale-in tweens settle, then re-measure
    p = (await this.find(key)) ?? p;
    await this.page.mouse.click(p.x, p.y);
    await this.wait(after);
  }

  /** Clicks a button inside a modal popup, waiting for the popup itself first (it opens a beat later). */
  async popupClick(key: string, timeout = 30_000) {
    await this.page.waitForFunction(
      () => (window as any).__echoes.game.scene.getScenes(true).some((s: any) => s.children.list.some((o: any) => o.name === 'popup' && o.alpha > 0)),
      undefined,
      { timeout },
    );
    await this.click(key, 400, timeout);
  }

  /** Puzzle scene: dismiss first-time captions, then play the solution through the input path. */
  async puzzle(back: string) {
    await this.scene('Puzzle');
    await this.page.waitForFunction(() => (window as any).__puzzle?.level, undefined, { timeout: 20_000 });
    const id: string = await this.page.evaluate(() => (window as any).__puzzle.level.id);
    for (let k = 0; k < 60; k++) {
      const st = await this.page.evaluate(() => {
        const p = (window as any).__puzzle;
        const b = p.children.list.find((o: any) => o.name === 'popup')?.list.find((o: any) => o.name === 'btn:GOT IT');
        if (b) return (b.emit('click'), 'clicked');
        return p.teachDone ? 'done' : 'wait';
      });
      if (st === 'done') break;
      await this.wait(250);
    }
    await this.page.evaluate((m) => (window as any).__puzzle.play(m), SOLUTIONS.get(id)!);
    await this.scene(back, 30_000);
    this.check(true, `${id} played to the end (${SOLUTIONS.get(id)!.length} moves)`);
  }

  async memory(w: Witness) {
    await this.scene('Memory');
    await this.page.waitForFunction(() => (window as any).__memory?.page, undefined, { timeout: 20_000 });
    // First memory page shows the evidence tip (GOT IT).
    if (await this.find('GOT IT')) await this.click('GOT IT');
    const ids: string[] = await this.page.evaluate(() => [...(window as any).__memory.words.keys()]);
    for (const id of ids) {
      const st = await this.page.evaluate((e) => {
        const word = (window as any).__memory.words.get(e);
        return word.revealed ? 'done' : word.locked ? 'locked' : 'open';
      }, id);
      if (st === 'done') continue;
      const p = await this.page.evaluate((e) => {
        const s = (window as any).__memory;
        const m = s.words.get(e).getWorldTransformMatrix();
        const r = s.game.canvas.getBoundingClientRect();
        return { x: r.left + (m.tx * r.width) / 1920, y: r.top + (m.ty * r.height) / 1080 };
      }, id);
      await this.page.mouse.click(p.x, p.y);
      if (st === 'locked') {
        await this.puzzle('Memory');
        await this.page.waitForFunction(() => (window as any).__memory?.page, undefined, { timeout: 20_000 });
      }
      await this.page
        .waitForFunction((e) => (window as any).__echoes.gameState.hasEvidence(e), id, { timeout: 15_000 })
        .catch(() => {});
      this.check(await this.gs<boolean>(`gs.hasEvidence('${id}')`), `${w}: ${id} recovered${st === 'locked' ? ' via puzzle' : ''}`);
    }
    await this.shot(`${w}-memory-complete`);

    // RECONSTRUCT each deduction through the Deduction screen until LEAVE MEMORY shows.
    for (let k = 0; k < 3; k++) {
      await this.click('RECONSTRUCT');
      await this.scene('Deduction');
      const id: string = await this.page.evaluate(
        () => (window as any).__echoes.game.scene.getScene('Deduction').args.deductionId,
      );
      const d = DEDUCTIONS.find((x) => x.id === id)!;
      for (const c of d.requiredEvidence) await this.click(`card:${c}`, 150);
      await this.click('conclusion:correct', 150);
      await this.click('btn:CONFIRM'); // screen button
      await this.popupClick('btn:CONFIRM'); // hypothesis prompt
      await this.popupClick('btn:CONTINUE'); // "Deduction confirmed"
      await this.scene('Memory');
      this.check((await this.gs<string>(`gs.deductionState('${id}')`)) === 'confirmed', `${w}: ${id} confirmed`);
    }
    await this.click('LEAVE MEMORY');
    await this.scene('Aftermath');
    await this.wait(600);
    await this.shot(`${w}-aftermath`);
    this.check((await this.gs<string>(`gs.witnessStatus('${w}')`)) === 'resolved', `${w}: resolved`);
    // Resolution popup ("{ghost} testimony reconstructed." RETURN) appears after the panels.
    await this.popupClick('btn:RETURN', 10_000).catch(() => {});
    await this.click('RETURN TO VILLAGE');
    await this.scene('Village');
  }

  async witness(w: Witness, first: boolean) {
    await this.click(`spot:${w}`);
    await this.scene('Conversation');
    for (let k = 0; k < 6; k++) await (this.page.keyboard.press('Space'), this.wait(150));
    // Ask one evidence-gated question if any is open (later witnesses have them).
    const q = (dialogueJson.witnesses as any)[w].questions as { ask: string; requires: string[] }[];
    for (const question of q) {
      const unlocked = await this.gs<boolean>(`${JSON.stringify(question.requires)}.every((e) => gs.hasEvidence(e))`);
      if (unlocked) {
        await this.click(question.ask, 300);
        this.check(true, `${w}: asked "${question.ask}"`);
        break;
      }
    }
    if (!first) await this.shot(`${w}-conversation`);
    await this.click((dialogueJson.witnesses as any)[w].enterButton);
    await this.memory(w);
  }

  async play(defaultSettings: boolean) {
    await this.page.goto(`http://localhost:${PORT}/`);
    await this.page.evaluate(() => localStorage.clear());
    await this.page.reload();
    await this.scene('Title');
    await this.page.mouse.click(960, 540);
    await this.wait(400);
    await this.click('btn:NEW GAME');
    if (!defaultSettings) {
      await this.page.evaluate(() => (window as any).__echoes.gameState.setSetting('reduceMotion', true));
    }
    await this.scene('Opening');
    for (let k = 0; k < 40 && !(await this.active()).includes('Village'); k++) {
      await this.page.keyboard.press('Space');
      await this.wait(400);
    }
    await this.scene('Village');
    this.check(true, `opening → village (${defaultSettings ? 'default settings' : 'Reduce Motion'})`);

    // Clock tower Echo Path first (Blueprint F3: the first spirit-lantern use), from the village.
    await this.click('spot:tower');
    await this.puzzle('Village');
    await this.popupClick('btn:CONTINUE');
    this.check(await this.gs<boolean>("gs.hasEvidence('ev_tower_residue')"), 'tower residue via pz_tower');

    if (process.env.AUTOPLAY_FROM === 'end') {
      // Debug shortcut: skip the witnesses (state set directly), test only the ending.
      await this.page.evaluate((ds) => {
        const st = (window as any).__echoes.gameState;
        for (const d of ds) {
          d.requiredEvidence.forEach((e: string) => st.addEvidence(e));
          st.confirmDeduction(d.id);
        }
        ['mira', 'arun', 'leela'].forEach((w) => st.setWitness(w, 'resolved'));
        (window as any).__echoes.game.scene.getScene('Village').scene.restart();
      }, DEDUCTIONS);
      await this.wait(1500);
    } else for (const [i, w] of this.order.entries()) await this.witness(w, i === 0);

    // 9/9 → the village announces the archive (popup) or shows THE RECORD.
    this.check((await this.gs<string>('gs.finale')) !== 'locked', 'all 9 deductions → archive unlocked');
    // The village announces it once (popup a beat after it opens); otherwise use THE RECORD hotspot.
    const announced = await this.popupClick('btn:ENTER ARCHIVE', 6000).then(() => true, () => false);
    if (!announced) await this.click('spot:record');
    await this.scene('Archive');
    await this.click('btn:ESCAPE WITH THE RECORD', 400, 30_000);
    await this.puzzle('Archive');
    this.check(await this.gs<boolean>("gs.flag('archiveEscaped')"), 'archive escaped');
    await this.click('btn:CONTINUE', 400, 30_000);

    await this.scene('Finale');
    await this.shot('finale');
    for (let k = 0; k < 80 && !(await this.active()).includes('Ending'); k++) {
      if (await this.find('CONTINUE')) await this.click('CONTINUE', 300, 2000).catch(() => {});
      else await (this.page.keyboard.press('Space'), this.wait(500));
    }
    await this.scene('Ending');
    for (let k = 0; k < 40 && !(await this.find('PLAY AGAIN')); k++) {
      await this.page.keyboard.press('Space');
      await this.wait(500);
    }
    await this.shot('summary');
    this.check(!!(await this.find('PLAY AGAIN')), 'reached the summary screen (BACK TO TITLE / PLAY AGAIN)');
    this.check((await this.gs<string>('gs.finale')) === 'complete', 'finale complete');
    this.check((await this.gs<number>('gs.deductionsConfirmed()')) === 9, '9/9 deductions in the save');
  }
}

async function launch(): Promise<Browser> {
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  if (BROWSER === 'firefox') return firefox.launch();
  if (BROWSER === 'msedge') return chromium.launch({ channel: 'msedge', args });
  return chromium.launch({ args });
}

const server = await preview({ preview: { port: PORT, strictPort: true }, logLevel: 'silent' });
const browser = await launch();
const todo = (pick.length ? pick : ORDERS.map((_, i) => i)).map((i) => ({ i, order: ORDERS[i] }));
const results: Run[] = [];
const t0 = Date.now();

async function worker() {
  for (let job = todo.shift(); job; job = todo.shift()) {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await ctx.newPage();
    const run = new Run(page, job.order, `${job.i + 1}-${job.order.map((w) => w[0]).join('')}`);
    const start = Date.now();
    try {
      await run.play(job.i === 0);
    } catch (e) {
      const err = e as Error;
      const at = (err.stack ?? '').split('\n').find((l) => l.includes('autoplay-full')) ?? '';
      run.check(false, `crashed: ${err.message.split('\n')[0]} ${at.trim()} (scenes: ${(await run.active().catch(() => [])).join(',')})`);
      await run.shot('error');
    }
    run.log.push(`     [${run.tag}] ${run.order.join(' → ')} in ${Math.round((Date.now() - start) / 1000)} s`);
    results.push(run);
    console.log(run.log.join('\n'));
    await ctx.close();
  }
}
await Promise.all(Array.from({ length: Math.min(PARALLEL, todo.length) }, worker));

let failed = 0;
for (const r of results) {
  failed += r.failed + r.errors.length;
  if (r.errors.length) console.log(`CONSOLE ERRORS [${r.tag}]:\n${r.errors.join('\n')}`);
}
console.log(
  `${results.length} order(s) on ${BROWSER} in ${Math.round((Date.now() - t0) / 1000)} s: ` +
    (failed ? `${failed} failure(s)` : 'all reached the summary, no console errors'),
);
await browser.close();
server.httpServer.close();
process.exit(failed ? 1 : 0);
