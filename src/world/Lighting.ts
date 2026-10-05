// Terraria-style tile lighting: every tile in view gets a light level from the night sky,
// lamps, candles and Elias's lantern, flood-filled with falloff (faster through solid blocks).
// The result is drawn as a tiny canvas (1 px per tile) scaled up with smoothing, so light
// blends softly between tiles.
import Phaser from 'phaser';
import { SOLID, TILE } from './tiles';
import { HT, WT } from './worldgen';

export interface LightSource { x: number; y: number; r: number; strength?: number }

export class Lighting {
  private tex: Phaser.Textures.CanvasTexture;
  private img: Phaser.GameObjects.Image;
  private fg: number[][];
  private skyOpen: Int16Array; // first solid row per column (sky light reaches above it)
  private cw = 0;
  private ch = 0;
  ambient = 0.42; // moonlight on open sky (0 = black, 1 = full)
  memory = false;

  constructor(scene: Phaser.Scene, fg: number[][], depth: number) {
    this.fg = fg;
    this.skyOpen = new Int16Array(WT);
    this.recomputeSky();
    this.tex = scene.textures.exists('w_light') ? (scene.textures.get('w_light') as Phaser.Textures.CanvasTexture) : scene.textures.createCanvas('w_light', 64, 64)!;
    this.img = scene.add.image(0, 0, 'w_light').setOrigin(0).setDepth(depth);
    this.tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }

  recomputeSky() {
    for (let x = 0; x < WT; x++) {
      let y = 0;
      while (y < HT && !SOLID.has(this.fg[y][x])) y++;
      this.skyOpen[x] = y;
    }
  }

  update(cam: Phaser.Cameras.Scene2D.Camera, sources: LightSource[]) {
    const view = cam.worldView;
    const pad = 12;
    const x0 = Math.max(0, Math.floor(view.x / TILE) - pad), y0 = Math.max(0, Math.floor(view.y / TILE) - pad);
    const x1 = Math.min(WT - 1, Math.ceil(view.right / TILE) + pad), y1 = Math.min(HT - 1, Math.ceil(view.bottom / TILE) + pad);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    if (w !== this.cw || h !== this.ch) {
      this.tex.setSize(w, h);
      this.cw = w;
      this.ch = h;
    }
    const L = new Float32Array(w * h);
    // Sky: tiles above the first solid block in their column, plus soft spill one block down.
    for (let x = 0; x < w; x++) {
      const open = this.skyOpen[x + x0];
      for (let y = 0; y < h; y++) {
        const wy = y + y0;
        if (wy < open) L[y * w + x] = this.ambient;
        else if (wy < open + 3) L[y * w + x] = this.ambient * (0.55 - (wy - open) * 0.17);
      }
    }
    // Point lights: flood fill with falloff; solid blocks absorb more.
    const queue: number[] = [];
    for (const s of sources) {
      const tx = Math.floor(s.x / TILE) - x0, ty = Math.floor(s.y / TILE) - y0;
      if (tx < -s.r || ty < -s.r || tx >= w + s.r || ty >= h + s.r) continue;
      const start = Math.min(1, s.strength ?? 1);
      const dropAir = start / (s.r + 1);
      if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
      const i0 = ty * w + tx;
      if (L[i0] < start) L[i0] = start;
      queue.length = 0;
      queue.push(i0);
      for (let qi = 0; qi < queue.length; qi++) {
        const i = queue[qi], v = L[i];
        const cx = i % w, cy = (i / w) | 0;
        const solid = SOLID.has(this.fg[cy + y0][cx + x0]);
        const nv = v - dropAir * (solid ? 2.6 : 1);
        if (nv <= 0.02) continue;
        if (cx > 0 && L[i - 1] < nv) (L[i - 1] = nv, queue.push(i - 1));
        if (cx < w - 1 && L[i + 1] < nv) (L[i + 1] = nv, queue.push(i + 1));
        if (cy > 0 && L[i - w] < nv) (L[i - w] = nv, queue.push(i - w));
        if (cy < h - 1 && L[i + w] < nv) (L[i + w] = nv, queue.push(i + w));
      }
    }
    // Paint darkness (alpha = 1 - light).
    const ctx = this.tex.getContext();
    const data = ctx.createImageData(w, h);
    const tint = this.memory ? [8, 22, 34] : [4, 4, 12];
    for (let i = 0; i < w * h; i++) {
      const a = Math.max(0, Math.min(1, 1 - L[i] * 1.15));
      data.data[i * 4] = tint[0];
      data.data[i * 4 + 1] = tint[1];
      data.data[i * 4 + 2] = tint[2];
      data.data[i * 4 + 3] = Math.round(a * 248);
    }
    ctx.putImageData(data, 0, 0);
    this.tex.refresh();
    // Each pixel = one tile, centred on the tile (offset half a tile for the smooth blend).
    this.img.setPosition(x0 * TILE - TILE / 2, y0 * TILE - TILE / 2).setDisplaySize(w * TILE, h * TILE);
    this.img.setPosition(x0 * TILE, y0 * TILE);
  }
}
