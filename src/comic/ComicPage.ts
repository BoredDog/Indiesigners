import Phaser from 'phaser';
import { ComicPanel, type PanelOptions } from './ComicPanel';
import type { PageDef } from './types';
import { COLORS, TIMING } from './theme';
import { dur } from './settings';

export type FocusMode = 'lift' | 'full';

export interface PageOptions extends PanelOptions {
  paperKey?: string; // tiled paper texture behind the panels
}

/**
 * A full comic page: paper + panels cut from one background (Blueprint P2/H).
 * Emits 'panel-click' (panel) when a panel is clicked. Handles zoom/dim (Blueprint H1, N).
 */
export class ComicPage extends Phaser.GameObjects.Container {
  readonly def: PageDef;
  readonly panels: ComicPanel[] = [];
  focused?: ComicPanel;

  constructor(scene: Phaser.Scene, def: PageDef, opts: PageOptions = {}) {
    super(scene, 0, 0);
    this.def = def;
    const b = def.bounds;

    const shadow = scene.add.rectangle(b.x + 10, b.y + 12, b.w, b.h, 0x000000, 0.45).setOrigin(0);
    this.add(shadow);
    if (opts.paperKey && scene.textures.exists(opts.paperKey)) {
      this.add(scene.add.tileSprite(b.x, b.y, b.w, b.h, opts.paperKey).setOrigin(0).setTint(COLORS.paper));
    } else {
      this.add(scene.add.rectangle(b.x, b.y, b.w, b.h, COLORS.paper).setOrigin(0));
    }

    for (const p of def.panels) {
      const panel = new ComicPanel(scene, def.id, def.background, p, opts);
      panel.setInteractive({ useHandCursor: true });
      panel.on('pointerup', () => this.emit('panel-click', panel));
      this.panels.push(panel);
      this.add(panel);
    }
  }

  panel(id: string): ComicPanel {
    const p = this.panels.find((x) => x.def.id === id);
    if (!p) throw new Error(`Panel ${id} not on page ${this.def.id}`);
    return p;
  }

  /**
   * 'lift' = Blueprint N panel zoom (1.06×, others dim).
   * 'full' = bring the panel to the screen centre at reading size (for puzzles / close inspection).
   */
  focus(id: string, mode: FocusMode = 'full'): void {
    if (this.focused) this.restore(this.focused);
    const panel = this.panel(id);
    this.focused = panel;
    this.bringToTop(panel);

    const cam = this.scene.cameras.main;
    const target =
      mode === 'lift'
        ? { x: panel.home.x, y: panel.home.y, scale: 1.06 }
        : {
            x: cam.width / 2,
            y: cam.height / 2,
            scale: Math.min((cam.width * 0.8) / panel.frameW, (cam.height * 0.82) / panel.frameH),
          };
    this.scene.tweens.add({ targets: panel, ...target, alpha: 1, duration: dur(TIMING.panelZoom), ease: 'Cubic.Out' });
    for (const other of this.panels) {
      if (other !== panel) this.scene.tweens.add({ targets: other, alpha: 0.25, duration: dur(TIMING.panelZoom) });
    }
    this.emit('focus', panel);
  }

  unfocus(): void {
    if (!this.focused) return;
    this.restore(this.focused);
    this.focused = undefined;
    for (const p of this.panels) this.scene.tweens.add({ targets: p, alpha: 1, duration: dur(TIMING.panelZoom) });
    this.emit('unfocus');
  }

  private restore(panel: ComicPanel) {
    this.scene.tweens.add({
      targets: panel,
      x: panel.home.x,
      y: panel.home.y,
      scale: 1,
      duration: dur(TIMING.panelZoom),
      ease: 'Cubic.Out',
    });
  }

  setAllColour(value: number, ms?: number): void {
    this.panels.forEach((p, i) => this.scene.time.delayedCall(i * 90, () => p.setColour(value, ms)));
  }

  setAllHalftone(value: number): void {
    this.panels.forEach((p) => p.setHalftone(value));
  }
}
