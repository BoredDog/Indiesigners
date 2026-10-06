import Phaser from 'phaser';
import { dur } from '../../comic';
import { panel, pbutton, ptext } from '../../world/ui';
import { H, W } from '../coreUi';

// Story-mode versions of the two comic widgets the Echo Paths board uses (popup and rail buttons),
// so a puzzle inside story mode looks like the rest of story mode.

/** A message with buttons, in story mode's navy panel. Enter, Space or E picks the first button. */
export function storyPopup(scene: Phaser.Scene, text: string, buttons: string[], y = H / 2): Promise<string> {
  return new Promise((resolve) => {
    const layer = scene.add.container(0, 0).setDepth(5000).setName('popup');
    const blocker = scene.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0).setInteractive();
    const w = 900;
    const body = ptext(scene, W / 2, 0, text, 36, '#e8fbff', w - 80).setOrigin(0.5, 0).setAlign('center');
    const h = body.height + 170;
    const top = y - h / 2;
    body.setY(top + 40);
    const box = panel(scene, W / 2 - w / 2, top, w, h, 0.96);
    layer.add([blocker, box, body]);
    const keys = scene.input.keyboard;
    const pick = (i: number) => {
      keys?.off('keydown', onKey);
      layer.destroy();
      resolve(buttons[i]);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'e') pick(0);
    };
    const bw = 280, gap = 24, total = buttons.length * bw + (buttons.length - 1) * gap;
    buttons.forEach((label, i) => layer.add(pbutton(scene, W / 2 - total / 2 + bw / 2 + i * (bw + gap), top + h - 60, bw, 64, label, () => pick(i), 32)));
    keys?.on('keydown', onKey);
    layer.setAlpha(0);
    scene.tweens.add({ targets: layer, alpha: 1, duration: dur(160) });
  });
}

/** A rail button in story mode's style (same signature as coreUi.button for the calls we use). */
export function storyButton(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, opts: { width?: number; fontSize?: number } = {}) {
  return pbutton(scene, x, y, opts.width ?? 220, 64, label, onClick, opts.fontSize ?? 30);
}
