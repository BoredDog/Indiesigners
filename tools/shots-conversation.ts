// Conversation layout check: every witness with all questions unlocked and asked, so the log is
// long. No visible dialogue line may reach under the option buttons; the log scrolls back.
// Usage: npm run build && npx tsx tools/shots-conversation.ts [outDir]
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import dialogueJson from '../content/dialogue.json';

const outDir = process.argv[2] ?? 'test-results/conversation';
const server = await preview({ preview: { port: 4185, strictPort: true }, logLevel: 'silent' });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors: string[] = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const shot = (n: string) => page.screenshot({ path: `${outDir}/${n}.png`, timeout: 120_000 });
let failed = 0;
const check = (cond: unknown, msg: string) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!cond) failed++;
};

type W = 'mira' | 'arun' | 'leela';
const witnesses = dialogueJson.witnesses as Record<W, { first: string[]; questions: { id: string; requires: string[] }[] }>;

/** Screen-space boxes of the visible (unclipped) log lines and of the option buttons. */
const LAYOUT = `() => {
  const s = window.__echoes.game.scene.getScene('Conversation');
  const box = (o) => { const b = o.getBounds(); return { top: b.top, bottom: b.bottom, name: o.name }; };
  const visible = s.lines.map(box).filter((b) => b.bottom > 130 && b.top < s.logBottom);
  const buttons = s.options.filter((o) => o.name !== 'btn:BACK').map(box);
  return { visible, buttons, logBottom: s.logBottom, scroll: s.scroll, max: s.maxScroll(), up: s.moreUp.visible };
}`;
const layout = () => page.evaluate((c) => new Function(`return (${c})`)()(), LAYOUT) as Promise<{
  visible: { top: number; bottom: number; name: string }[];
  buttons: { top: number; bottom: number; name: string }[];
  logBottom: number;
  scroll: number;
  max: number;
  up: boolean;
}>;

try {
  for (const w of ['mira', 'arun', 'leela'] as W[]) {
    const d = witnesses[w];
    await page.goto('http://localhost:4185/');
    await page.evaluate(() => localStorage.clear());
    await page.waitForFunction(() => (window as any).__echoes?.game.scene.isActive('Title'), undefined, { polling: 250 });
    await page.evaluate(
      ([wit, evs]) => {
        const { game, gameState } = (window as any).__echoes;
        gameState.newGame();
        for (const e of evs) gameState.addEvidence(e);
        game.scene.getScenes(true)[0].scene.start('Conversation', { witness: wit });
      },
      [w, [...new Set(d.questions.flatMap((q) => q.requires))]] as const,
    );
    await page.waitForFunction(() => (window as any).__echoes.game.scene.isActive('Conversation'));
    await page.waitForTimeout(600);
    for (let i = 1; i < d.first.length; i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(250);
    }
    // Ask every question through the scene (same path as clicking it).
    await page.evaluate((wit) => {
      const { game, gameState } = (window as any).__echoes;
      const s = game.scene.getScene('Conversation');
      for (const q of gameState.questionsFor(wit)) s.ask(q);
    }, w);
    await page.waitForTimeout(700);
    const l = await layout();
    const topButton = Math.min(...l.buttons.map((b) => b.top));
    check(l.buttons.length === d.questions.length + 1, `${w}: ${d.questions.length} questions + ENTER shown`);
    check(l.logBottom <= topButton, `${w}: log window ends above the options (${Math.round(l.logBottom)} ≤ ${Math.round(topButton)})`);
    const newest = l.visible[l.visible.length - 1];
    check(newest && newest.bottom <= l.logBottom + 1, `${w}: newest line fully in view`);
    check(l.max > 0 && l.up, `${w}: long log scrolls (max ${Math.round(l.max)} px) and shows ▲ earlier`);
    await shot(`${w}-1-asked`);
    await page.mouse.move(1180, 300);
    await page.mouse.wheel(0, -5000);
    await page.waitForTimeout(400);
    const up = await layout();
    check(up.scroll === 0, `${w}: wheel scrolls back to the first line`);
    await shot(`${w}-2-scrolled-up`);
  }
} catch (e) {
  failed++;
  console.log('FAIL', e);
}
console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'No console errors.');
if (errors.length) failed++;
await browser.close();
await server.close();
console.log(failed ? `${failed} check(s) failed` : 'Conversation checks passed.');
process.exit(failed ? 1 : 0);
