import Phaser from 'phaser';
import { attachComicFx, type ComicFxPipeline } from './ComicFxPipeline';
import type { PanelDef } from './types';
import { COLORS, PANEL_BORDER, TIMING } from './theme';
import { dur } from './settings';

export interface PanelOptions {
  /** Render-texture resolution multiplier so zoomed panels stay sharp. */
  quality?: number;
  /** Start greyscale (memory not yet reconstructed). */
  grey?: boolean;
}

/**
 * One comic panel: a crop of the page background plus cutouts, baked into a RenderTexture so
 * the whole panel can zoom, tint and take the comic shader as one image.
 * Positioned by its centre. `overlay` holds interactive things (SFX words, bubbles) in
 * panel-local top-left coordinates and is not clipped.
 */
export class ComicPanel extends Phaser.GameObjects.Container {
  readonly def: PanelDef;
  readonly rt: Phaser.GameObjects.RenderTexture;
  readonly overlay: Phaser.GameObjects.Container;
  readonly fx?: ComicFxPipeline;
  readonly home: { x: number; y: number };
  private readonly q: number;
  private readonly bgKey: string;
  private readonly frameName: string;

  constructor(scene: Phaser.Scene, pageId: string, bgKey: string, def: PanelDef, opts: PanelOptions = {}) {
    const { x, y, w, h } = def.frame;
    super(scene, x + w / 2, y + h / 2);
    this.def = def;
    this.bgKey = bgKey;
    this.q = opts.quality ?? 2;
    this.home = { x: this.x, y: this.y };

    // A named frame on the background texture = exactly this panel's crop.
    this.frameName = `${pageId}_${def.id}`;
    const tex = scene.textures.get(bgKey);
    if (!tex.has(this.frameName)) tex.add(this.frameName, 0, def.src.x, def.src.y, def.src.w, def.src.h);

    this.rt = scene.make
      .renderTexture({ width: Math.ceil(w * this.q), height: Math.ceil(h * this.q) }, false)
      .setOrigin(0.5)
      .setScale(1 / this.q);
    this.redraw();
    this.fx = attachComicFx(this.rt);
    if (this.fx) this.fx.colour = opts.grey === false ? 1 : 0;

    const border = scene.add.graphics();
    border.lineStyle(PANEL_BORDER, COLORS.ink).strokeRect(-w / 2, -h / 2, w, h);

    this.overlay = scene.add.container(-w / 2, -h / 2);
    this.add([this.rt, border, this.overlay]);
    this.setSize(w, h);
  }

  get frameW() {
    return this.def.frame.w;
  }
  get frameH() {
    return this.def.frame.h;
  }

  /** Re-bakes background + cutouts. Call after changing cutouts. */
  redraw(): void {
    const { w, h } = this.def.frame;
    const { src } = this.def;
    const q = this.q;
    this.rt.clear();

    const bg = this.scene.make.image({ key: this.bgKey, frame: this.frameName }, false).setOrigin(0.5);
    bg.setScale(Math.max(w / src.w, h / src.h) * q); // cover-fit
    this.rt.draw(bg, (w * q) / 2, (h * q) / 2);
    bg.destroy();

    for (const c of this.def.cutouts ?? []) {
      const img = this.scene.make.image({ key: c.key }, false).setOrigin(0.5, 1);
      img.setScale((c.scale ?? 1) * q).setFlipX(!!c.flipX);
      this.rt.draw(img, c.x * q, c.y * q);
      img.destroy();
    }
  }

  /** 0 = grey memory, 1 = full colour. */
  setColour(value: number, ms: number = TIMING.colourFill): void {
    if (!this.fx) return;
    this.scene.tweens.add({ targets: this.fx, colour: value, duration: dur(ms), ease: 'Sine.InOut' });
  }

  setInk(value: number, ms = 900): void {
    if (!this.fx) return;
    this.scene.tweens.add({ targets: this.fx, ink: value, duration: dur(ms), ease: 'Sine.InOut' });
  }

  setHalftone(value: number): void {
    if (this.fx) this.fx.halftone = value;
  }
}
