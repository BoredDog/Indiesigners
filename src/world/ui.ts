// Story-mode UI in Terraria style (translucent blue panels, pixel font), drawn in a separate
// zoom-1 scene ('StoryUI') so the world can be zoomed for crisp pixel art.
import Phaser from 'phaser';
import { H, W } from '../scenes/coreUi';

export const PIX = '"VT323", monospace';
export const PANEL = { fill: 0x16233f, alpha: 0.88, line: 0x7f9fd8, hi: 0x2d4778 };

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, alpha = PANEL.alpha) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.35).fillRoundedRect(x + 5, y + 6, w, h, 10);
  g.fillStyle(PANEL.fill, alpha).fillRoundedRect(x, y, w, h, 10);
  g.lineStyle(3, PANEL.line, 0.95).strokeRoundedRect(x, y, w, h, 10);
  g.lineStyle(1, 0xffffff, 0.12).strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, 8);
  return g;
}

export function ptext(scene: Phaser.Scene, x: number, y: number, s: string, size = 40, color = '#ffffff', wrap?: number) {
  return scene.add.text(x, y, s, {
    fontFamily: PIX,
    fontSize: `${size}px`,
    color,
    stroke: '#05070f',
    strokeThickness: Math.max(3, size / 9),
    wordWrap: wrap ? { width: wrap } : undefined,
    lineSpacing: 2,
  });
}

/** A Terraria-ish button: panel that brightens on hover. */
export function pbutton(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, onClick: () => void, size = 38) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const draw = (hover: boolean) => {
    g.clear();
    g.fillStyle(hover ? PANEL.hi : PANEL.fill, 0.95).fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    g.lineStyle(3, hover ? 0xffe08a : PANEL.line, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
  };
  draw(false);
  const t = ptext(scene, 0, 0, label, size, '#ffffff', w - 30).setOrigin(0.5).setAlign('center');
  c.add([g, t]);
  c.setSize(w, h).setInteractive({ useHandCursor: true }).setName(`btn:${label}`);
  c.on('pointerover', () => (draw(true), t.setColor('#ffe08a')));
  c.on('pointerout', () => (draw(false), t.setColor('#ffffff')));
  c.on('pointerup', onClick);
  return c;
}

export const UI_W = W;
export const UI_H = H;
