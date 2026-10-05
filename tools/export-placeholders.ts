// Saves the procedural placeholder textures (src/dev/placeholders.ts) as PNGs for the Godot port,
// so both builds share identical stand-in art until real art lands.
// Usage: npm run build && npx tsx tools/export-placeholders.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const OUT = 'godot/art/placeholders';
mkdirSync(OUT, { recursive: true });
const server = await preview({ preview: { port: 4191, strictPort: true }, logLevel: 'silent' });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
await p.goto('http://localhost:4191/?scene=ComicDemo');
await p.waitForFunction(() => (window as any).__echoes?.game.textures.exists('ph_nia'), null, { timeout: 60000 });
const keys = ['ph_village', 'ph_figure', 'ph_mira', 'ph_elias_young', 'ph_nia'];
const data: Record<string, string> = await p.evaluate((ks) => {
  const tex = (window as any).__echoes.game.textures;
  return Object.fromEntries(ks.map((k: string) => [k, (tex.get(k).getSourceImage() as HTMLCanvasElement).toDataURL('image/png')]));
}, keys);
for (const [k, url] of Object.entries(data)) {
  writeFileSync(`${OUT}/${k}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', `${OUT}/${k}.png`);
}
await b.close();
server.httpServer.close();
