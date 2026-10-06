// Audio check: the title screen plays rain and the title theme after the first key, the MUSIC and
// SOUND settings actually silence their buses, and story mode starts with ambience and music.
// Measures the signal on each bus with an AnalyserNode (src/story/music.ts exposes the mix).
// Usage: npm run build && npx tsx tools/check-audio.ts [--chrome]
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const args = process.argv.slice(2);
const server = await preview({ preview: { port: 4195, strictPort: true }, logLevel: 'silent' });
const browser = await chromium.launch({
  channel: args.includes('--chrome') ? 'chrome' : undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
let failed = 0;
const expect = (ok: boolean, what: string) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failed++;
};

/** RMS level on the MUSIC and SOUND buses, averaged over `ms`. Sent as a string, like the other
 *  tools, so the bundler's helpers don't leak into the page. */
const LEVELS = `
  const mix = window.__echoesMix;
  if (!mix) return { music: -1, sfx: -1, state: 'no mix' };
  if (mix.ctx.state !== 'running') await mix.ctx.resume().catch(() => undefined);
  const probe = (bus) => { const a = mix.ctx.createAnalyser(); a.fftSize = 2048; bus.connect(a); return a; };
  const am = probe(mix.music), as = probe(mix.sfx);
  const buf = new Float32Array(2048);
  const rms = (a) => { a.getFloatTimeDomainData(buf); let t = 0; for (const v of buf) t += v * v; return Math.sqrt(t / buf.length); };
  let m = 0, s = 0, n = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < MS) { await new Promise((r) => setTimeout(r, 50)); m += rms(am); s += rms(as); n++; }
  mix.music.disconnect(am); mix.sfx.disconnect(as);
  return { music: m / n, sfx: s / n, state: mix.ctx.state };
`;
const levels = (ms = 2500) =>
  page.evaluate((code) => new Function(`return (async () => { ${code} })()`)(), LEVELS.replace('MS', String(ms))) as Promise<{ music: number; sfx: number; state: string }>;
const js = (code: string) => page.evaluate((c) => new Function(`return (async () => { ${c} })()`)(), code);

try {
  // Title: nothing until the first input, then rain + the title theme.
  await page.goto('http://localhost:4195/');
  await page.waitForFunction(() => (window as any).__echoes?.game?.scene?.isActive('Title'), undefined, { polling: 250, timeout: 60_000 });
  await page.mouse.click(640, 600);
  await page.waitForTimeout(3000); // let the fades come up
  const title = await levels();
  console.log(`     title: music ${title.music.toFixed(4)}, sound ${title.sfx.toFixed(4)} (${title.state})`);
  expect(title.music > 0.002, 'title theme plays on the MUSIC bus');
  expect(title.sfx > 0.002, 'rain plays on the SOUND bus');

  // Settings: OFF really is off, and turning it back on brings it back.
  await js("const gs = window.__echoes.gameState; gs.setSetting('music', 0); gs.setSetting('sfx', 0);");
  await page.waitForTimeout(600);
  const off = await levels(1200);
  console.log(`     off:   music ${off.music.toFixed(5)}, sound ${off.sfx.toFixed(5)}`);
  expect(off.music < 0.0005 && off.sfx < 0.0005, 'MUSIC and SOUND set to OFF silence both buses');
  await js("const gs = window.__echoes.gameState; gs.setSetting('music', 0.8); gs.setSetting('sfx', 1);");

  // Story mode: ambience and the night score from the very first episode.
  await page.goto('http://localhost:4195/?scene=Story&fresh=1');
  await page.waitForFunction(() => (window as any).__story, undefined, { polling: 250, timeout: 60_000 });
  await page.mouse.click(640, 400);
  await page.waitForTimeout(4000);
  const story = await levels();
  console.log(`     story: music ${story.music.toFixed(4)}, sound ${story.sfx.toFixed(4)}`);
  expect(story.music > 0.001, 'story mode starts with music (episode one)');
  expect(story.sfx > 0.002, 'story mode starts with ambience (episode one)');

  // A memory switches the score; the river has water; ghosts' lines shimmer. Just make sure none
  // of these throw.
  await js(`
    const d = window.__story;
    d.memory(true);
    d.world.setRiver(true, 10);
    d.audio.tone('whisper');
    d.audio.tone('sting');
    for (const s of ['grass', 'stone', 'wood', 'mud']) d.audio.step(s, true);
    await new Promise((r) => setTimeout(r, 800));
    d.world.setRiver(false, 10);
    d.memory(false);
    d.score('dawn');
  `);
  await page.waitForTimeout(500);
  expect(true, 'memory, river water, whisper, sting, all four footsteps and the dawn score run');
} catch (e) {
  console.log('FAIL', e);
  failed++;
}
expect(errors.length === 0, errors.length ? `page errors: ${errors.slice(0, 4).join(' | ')}` : 'no page errors');
await browser.close();
server.httpServer.close();
process.exit(failed ? 1 : 0);
