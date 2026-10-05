// Puzzle ↔ evidence link check: every puzzle-locked fragment on every memory page opens its real
// Puzzle (no ?autosolve), the puzzle is solved via the test hook, and the evidence must come back
// to the Memory page revealed + saved in GameState. Also: tower → Village, Archive → Accusation.
// Usage: npm run build && npx tsx tools/check-links.ts   (exit 1 on any failure)
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const server = await preview({ preview: { port: 4190, strictPort: true }, logLevel: 'silent' });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs: string[] = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
let fails = 0;
const check = (c: boolean, m: string) => {
  console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`);
  if (!c) fails++;
};

for (const witness of ['mira', 'arun', 'leela']) {
  await p.goto(`http://localhost:4190/?scene=Memory&witness=${witness}`);
  await p.waitForFunction(() => (window as any).__memory?.page, null, { timeout: 60000 });
  await p.evaluate(() => (window as any).__memory.deps.markSeen('tip_evidence'));
  const locked: { id: string; puzzle: string }[] = await p.evaluate(() => {
    const s = (window as any).__memory;
    return [...s.words.entries()].filter(([, w]: any) => w.locked).map(([id]: any) => ({ id, puzzle: '' }));
  });
  for (const { id } of locked) {
    // Click the locked word (emits 'locked' → Puzzle scene).
    await p.evaluate((eid) => (window as any).__memory.words.get(eid).emit('locked'), id);
    await p.waitForFunction(() => (window as any).__puzzle && (window as any).__echoes.game.scene.isActive('Puzzle'), null, { timeout: 30000 });
    await p.waitForTimeout(500);
    await p.evaluate(() => (window as any).__puzzle.solve());
    await p.waitForFunction(() => (window as any).__echoes.game.scene.isActive('Memory'), null, { timeout: 30000 });
    // The page rebuild + delayed reveal can take a few seconds under the software renderer.
    await p.waitForFunction((eid) => (window as any).__echoes.gameState.hasEvidence(eid), id, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(500);
    const res = await p.evaluate((eid) => {
      const s = (window as any).__memory;
      return { revealed: s.words.get(eid)?.revealed, saved: (window as any).__echoes.gameState.hasEvidence(eid), witness: s.witness };
    }, id);
    check(res.revealed && res.saved && res.witness === witness, `${witness}: ${id} puzzle → back on page, revealed=${res.revealed}, saved=${res.saved}`);
  }
}

// Tower + archive hand-offs
await p.goto('http://localhost:4190/?scene=Village');
await p.waitForFunction(() => (window as any).__echoes?.game.scene.isActive('Village'), null, { timeout: 60000 });
const g = (code: string) => p.evaluate(code);
await g(`(() => { const s = __echoes.game.scene.getScene('Village'); s.scene.start('Puzzle', {puzzleId:'pz_tower', evidenceId:'ev_tower_residue', returnTo:'Village'}); })()`);
await p.waitForFunction(() => (window as any).__echoes.game.scene.isActive('Puzzle'), null, { timeout: 30000 });
await p.waitForTimeout(500);
await g(`__puzzle.solve()`);
await p.waitForFunction(() => (window as any).__echoes.game.scene.isActive('Village'), null, { timeout: 30000 });
await p.waitForFunction(() => (window as any).__echoes.gameState.hasEvidence('ev_tower_residue'), null, { timeout: 15000 }).catch(() => {});
check(await p.evaluate(() => (window as any).__echoes.gameState.hasEvidence('ev_tower_residue')), 'tower puzzle → evidence saved, back in Village');

await g(`(() => { const st = __echoes.gameState; st.newGame(); ['sis_1','sis_2','sis_3','bro_1','bro_2','bro_3','mom_1','mom_2','mom_3'].forEach(id => st.confirmDeduction(id)); __echoes.game.scene.getScenes(true).forEach(s => s.scene.stop()); __echoes.game.scene.start('Archive'); })()`);
await p.waitForFunction(() => (window as any).__echoes.game.scene.isActive('Archive') || (window as any).__echoes.game.scene.isActive('Puzzle'), null, { timeout: 30000 });
// Archive intro: the ESCAPE button fades in at (960, 900) after ~2 s.
for (let i = 0; i < 10 && !(await p.evaluate(() => (window as any).__echoes.game.scene.isActive('Puzzle'))); i++) {
  await p.waitForTimeout(1500);
  await p.mouse.click(960, 900);
}
await p.waitForTimeout(1500);
check(await p.evaluate(() => (window as any).__echoes.game.scene.isActive('Puzzle')), 'Archive opens pz_archive');
await g(`__puzzle.solve()`);
// After the escape the Archive shows CONTINUE at (960, 900) → Accusation (A2) → Finale.
for (let i = 0; i < 12 && !(await p.evaluate(() => (window as any).__echoes.game.scene.isActive('Accusation'))); i++) {
  await p.waitForTimeout(1500);
  await p.mouse.click(960, 900);
}
check(await p.evaluate(() => (window as any).__echoes.game.scene.isActive('Accusation')), 'Archive escape → Accusation');

console.log(errs.length ? `CONSOLE ERRORS:\n${errs.join('\n')}` : 'No console errors.');
await b.close();
server.httpServer.close();
process.exit(fails || errs.length ? 1 : 0);
