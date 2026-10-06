// Resume check: RESTART a story, go back to the title, then CONTINUE a later save in the same
// session. (Phaser reuses old scene data, which used to make CONTINUE wipe the save.)
// Also checks that a finished story offers PLAY AGAIN instead of dropping into the ending.
// Usage: npm run build && npx tsx tools/check-resume.ts [--chrome]
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const args = process.argv.slice(2);
const server = await preview({ preview: { port: 4195, strictPort: true }, logLevel: 'silent' });
const browser = await chromium.launch({ channel: args.includes('--chrome') ? 'chrome' : undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e)));
const js = <T = unknown>(code: string) => page.evaluate((c) => new Function(c)(), code) as Promise<T>;
let failed = 0;
const check = (ok: unknown, msg: string) => (console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`), ok || failed++);
const FIND = `const s = window.__echoes.game.scene.getScene('Title'); const all=[]; const w=(o)=>{all.push(o);(o.list||[]).forEach(w)}; s.children.list.forEach(w);`;
const buttons = () => js<string[]>(`${FIND} return all.filter((o)=>o.name && o.name.startsWith('btn:')).map((o)=>o.name);`);
const press = (name: string) => js(`${FIND} all.find((o)=>o.name===${JSON.stringify(name)}).emit('pointerup');`);
const toTitle = async () => {
  await js(`window.__echoes.game.scene.getScenes(true).forEach((s) => s.scene.key !== 'Title' && s.scene.stop()); window.__echoes.game.scene.start('Title', {});`);
  await page.waitForFunction(() => (window as any).__echoes.game.scene.isActive('Title'), undefined, { polling: 200, timeout: 30_000 });
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter'); // past "press any key"
  await page.waitForTimeout(800);
};
const storyEpisode = async () => {
  await page.waitForFunction(() => (window as any).__story?.save, undefined, { polling: 200, timeout: 30_000 });
  return js<number>('return window.__story.save.episode');
};

try {
  await page.goto('http://localhost:4195/?scene=Title');
  await page.waitForFunction(() => (window as any).__echoes?.game.scene.isActive('Title'), undefined, { polling: 250, timeout: 60_000 });
  // 1. A save at episode 3 → RESTART STORY → confirm.
  await js(`localStorage.setItem('echoes_story_v3', JSON.stringify({ episode: 3, flags: {}, found: ['case'], remembered: [] }))`);
  await toTitle();
  await press('btn:RESTART STORY');
  await page.waitForTimeout(400);
  await press('btn:RESTART');
  check((await storyEpisode()) === 0, 'RESTART starts from episode one');
  // 2. Back to the title with a later save, then CONTINUE.
  await js(`window.__story = undefined; localStorage.setItem('echoes_story_v3', JSON.stringify({ episode: 4, flags: { qKey: true }, found: ['case', 'key'], remembered: [] }))`);
  await toTitle();
  const b = await buttons();
  check(b.includes('btn:CONTINUE: EPISODE FIVE'), `the menu offers CONTINUE: EPISODE FIVE (${b.join(', ')})`);
  await press('btn:CONTINUE: EPISODE FIVE');
  const ep = await storyEpisode();
  const found = await js<string[]>('return window.__story.save.found');
  check(ep === 4 && found.includes('key'), `CONTINUE resumed episode five with the save intact (episode index ${ep}, evidence ${found.length})`);
  // 3. A finished story.
  await js(`window.__story = undefined; localStorage.setItem('echoes_story_v3', JSON.stringify({ episode: 8, flags: { ending: 'light' }, found: [], remembered: [] }))`);
  await toTitle();
  const b2 = await buttons();
  check(b2.includes('btn:PLAY AGAIN') && !b2.some((n) => n.startsWith('btn:CONTINUE')), `a finished story offers PLAY AGAIN (${b2.join(', ')})`);
} catch (e) {
  console.log('FAIL', e);
  failed++;
}
check(!errors.length, errors.length ? `page errors: ${errors.slice(0, 3).join(' | ')}` : 'no page errors');
await browser.close();
await server.close();
process.exit(failed ? 1 : 0);
