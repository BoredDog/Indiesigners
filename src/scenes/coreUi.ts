// Small UI helpers shared by Nav's scenes (Title, Village, Conversation, Deduction, Aftermath, Pause).
// Comic visuals come from src/comic; this file only arranges them.
import Phaser from 'phaser';
import { Bubble, ComicButton, COLORS, FONTS, TEXT_RESOLUTION, dur } from '../comic';
import { gameState } from '../core/GameState';
import { story, type WitnessId } from '../core/StoryData';
import { PH } from '../dev/placeholders';

export const W = 1920;
export const H = 1080;
export const MARGIN = 16; // Blueprint M: icons top-right with a 16 px safe margin

export function hasScene(scene: Phaser.Scene, key: string): boolean {
  return !!scene.scene.manager.keys[key];
}

export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 32,
  opts: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: `"${FONTS.sfx}"`,
    fontSize: `${size}px`,
    color: COLORS.paperCss,
    stroke: COLORS.inkCss,
    strokeThickness: Math.max(4, size / 6),
    resolution: TEXT_RESOLUTION,
    ...opts,
  });
}

/** A ComicButton named `btn:<LABEL>` so tests can find it. */
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  onClick: () => void,
  opts: { width?: number; fontSize?: number; fill?: number } = {},
): ComicButton {
  const b = new ComicButton(scene, x, y, { label: text, ...opts });
  b.setName(`btn:${text}`);
  b.on('click', onClick);
  scene.add.existing(b);
  return b;
}

/** Dimmed village backdrop used behind conversations/pages until real art lands. */
export function backdrop(scene: Phaser.Scene, dim = 0.55): void {
  scene.add.image(0, 0, PH.village).setOrigin(0).setDisplaySize(W, H);
  if (dim > 0) scene.add.rectangle(0, 0, W, H, COLORS.ink, dim).setOrigin(0);
}

const GHOST_TINT: Record<WitnessId, number> = { mira: 0xffffff, arun: 0xc9d39a, leela: 0xd7c6f0 };
const GHOST_PALE = 0xdde6f2; // a cold wash over real witness art: still a ghost

/**
 * Placeholder ghost of a witness (pale, translucent, slow float: Blueprint C/N).
 * Only Mira has placeholder art; Arun/Leela reuse it tinted until Bhumi's art lands.
 */
export function ghost(scene: Phaser.Scene, w: WitnessId, x: number, y: number, scale = 1): Phaser.GameObjects.Image {
  // Own art (char_<w>) once it exists; until then Mira's stand-in, tinted per witness.
  const own = scene.textures.exists(`ph_${w}`);
  const img = scene.add
    .image(x, y, own ? `ph_${w}` : PH.mira)
    .setOrigin(0.5, 1)
    .setScale(scale)
    .setTint(own ? GHOST_PALE : GHOST_TINT[w])
    .setAlpha(0.88);
  if (dur(1) > 0) {
    scene.tweens.add({ targets: img, y: y - 4, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
  return img;
}

/**
 * Modal comic caption box (Blueprint M "caption boxes with comic borders and small fade/scale").
 * Resolves with the label of the button pressed.
 */
export function popup(scene: Phaser.Scene, text: string, buttons: string[], y = H / 2): Promise<string> {
  return new Promise((resolve) => {
    const layer = scene.add.container(0, 0).setDepth(5000).setName('popup');
    const blocker = scene.add.rectangle(0, 0, W, H, COLORS.ink, 0.45).setOrigin(0).setInteractive();
    const box = new Bubble(scene, W / 2, y - 40, { kind: 'narration', text, maxWidth: 760, fontSize: 30 });
    layer.add([blocker, box]);
    const gap = 24;
    const btns = buttons.map((b) => new ComicButton(scene, 0, 0, { label: b, fontSize: 30 }).setName(`btn:${b}`));
    const total = btns.reduce((s, b) => s + b.width, 0) + gap * (btns.length - 1);
    let bx = W / 2 - total / 2;
    for (const b of btns) {
      b.setPosition(bx + b.width / 2, y - 40 + box.height / 2 + 60);
      bx += b.width + gap;
      layer.add(b);
    }
    btns.forEach((b, i) =>
      b.on('click', () => {
        layer.destroy();
        resolve(buttons[i]);
      }),
    );
    layer.setAlpha(0).setScale(0.96);
    layer.setPosition((W * 0.04) / 2, (H * 0.04) / 2);
    scene.tweens.add({ targets: layer, alpha: 1, scale: 1, x: 0, y: 0, duration: dur(180), ease: 'Back.Out' });
    // Without buttons (e.g. a hover caption) the caller removes it; clicking dismisses.
    if (!buttons.length) blocker.once('pointerup', () => (layer.destroy(), resolve('')));
  });
}

/** Casebook + Menu icons top-right (Blueprint M), with the NEW EVIDENCE badge on the casebook. */
export function hudIcons(scene: Phaser.Scene, returnTo: string): { refresh: () => void } {
  const ui = story.ui.village;
  const menu = button(scene, W - MARGIN - 70, MARGIN + 34, ui.menu.toUpperCase(), () => openPause(scene, returnTo), {
    fontSize: 26,
    width: 140,
  });
  const casebook = button(
    scene,
    W - MARGIN - 70 - 160 - 20,
    MARGIN + 34,
    ui.casebook.toUpperCase(),
    () => openCasebook(scene, returnTo),
    { fontSize: 26, width: 160 },
  );
  menu.setDepth(900);
  casebook.setDepth(900);
  const badge = label(scene, casebook.x, casebook.y + 46, story.ui.aftermath.newEvidenceBadge, 20, {
    color: COLORS.spiritTealCss,
  })
    .setOrigin(0.5, 0)
    .setDepth(900)
    .setName('badge:new-evidence');
  const refresh = () => badge.setVisible(gameState.casebookHasNew());
  refresh();
  scene.input.keyboard?.on('keydown-ESC', () => openPause(scene, returnTo));
  scene.input.keyboard?.on('keydown-C', () => openCasebook(scene, returnTo));
  return { refresh };
}

export function openPause(scene: Phaser.Scene, returnTo: string): void {
  if (!hasScene(scene, 'Pause') || scene.scene.isActive('Pause')) return;
  scene.scene.pause();
  scene.scene.launch('Pause', { returnTo });
}

export function openCasebook(scene: Phaser.Scene, returnTo: string): void {
  if (!hasScene(scene, 'Casebook')) {
    void popup(scene, 'The casebook is not built yet.', ['CLOSE']);
    return;
  }
  // Casebook wakes the caller when it closes.
  scene.scene.sleep();
  scene.scene.launch('Casebook', { returnTo });
}

/** Village hover status (Blueprint G1): "Unvisited", "Evidence found 2/5", "3/3 deductions", "Resolved". */
export function witnessStatusText(w: WitnessId): string {
  const ui = story.ui.village;
  const status = gameState.witnessStatus(w);
  if (status === 'unvisited') return ui.statusUnvisited;
  if (status === 'resolved') return ui.statusResolved;
  const confirmed = gameState.deductionsConfirmed(w);
  if (confirmed > 0) return ui.statusDeductions.replace('{confirmed}', String(confirmed));
  const { found, total } = gameState.evidenceProgress(w);
  return ui.statusEvidence.replace('{found}', String(found)).replace('{total}', String(total));
}
