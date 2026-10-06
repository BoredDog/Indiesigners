// The closing cutscene: Elias's case file, told as a hard-boiled detective comic.
// Three pages of panels in heavy ink, halftone and near-greyscale, with typewritten captions in
// his voice. The last panel depends on the ending: in the good ending colour floods back into
// Veyra at 2:18; in the forget ending ink swallows the page and the case stays open.
//
// Panel art is baked into a RenderTexture per panel (painted backgrounds from the art pack plus
// game sprites), then run through the shared comic shader (src/comic/ComicFxPipeline).
import Phaser from 'phaser';
import { attachComicFx, COLORS, FONTS, TEXT_RESOLUTION, comicSettings } from '../comic';
import { H, W } from '../scenes/coreUi';

export type Ending = 'light' | 'dark';

/** Painted panel backgrounds (art pack, 270 px tall). */
export const CASE_FILE_ART: [key: string, file: string][] = [
  ['cf_village', 'village_hub.png'],
  ['cf_school', 'ivy_schoolhouse.png'],
  ['cf_dock', 'luke_river_dock.png'],
  ['cf_archive', 'hanna_archive.png'],
  ['cf_tower', 'clock_tower.png'],
];
export function loadCaseFileArt(scene: Phaser.Scene) {
  for (const [k, f] of CASE_FILE_ART) if (!scene.textures.exists(k)) scene.load.image(k, `assets/story/comic/${f}`);
}

interface Sprite {
  key: string;
  frame?: number;
  /** Feet position as a fraction of the panel. */
  x: number;
  y: number;
  scale: number;
  flip?: boolean;
  alpha?: number;
  angle?: number;
  glow?: number; // radius in px of a warm light behind it
}
interface PanelDef {
  x: number;
  y: number;
  w: number;
  h: number;
  bg: string;
  /** Which part of the background stays in frame (0..1 on each axis). */
  focus: [number, number];
  zoom?: number;
  sprites?: Sprite[];
  letter?: { x: number; y: number; angle: number };
  caption: string;
  captionAt?: 'top' | 'bottom';
}

const M = 50, TOP = 112, GUT = 24;
const CW = W - M * 2, CH = H - TOP - 50;

function pages(ending: Ending, flags: Record<string, unknown>): PanelDef[][] {
  const third = (CW - GUT * 2) / 3, half = (CW - GUT) / 2;
  const row1 = 470, row2 = CH - row1 - GUT;
  return [
    [
      {
        x: M, y: TOP, w: CW, h: row1, bg: 'cf_village', focus: [0.5, 0.45],
        sprites: [{ key: 'gv_hatman_idle', x: 0.4, y: 1.02, scale: 7.5 }],
        letter: { x: 0.76, y: 0.6, angle: -5 },
        caption: 'The letter had no stamp and no return address. Two words in pencil, in a child’s hand, and a smudge where a name should be. I told myself it was just another haunting.',
      },
      {
        x: M, y: TOP + row1 + GUT, w: half, h: row2, bg: 'cf_tower', focus: [0.5, 0.15], zoom: 1.1,
        caption: 'The bell in Veyra hadn’t rung in ten years. It rang the moment I arrived.',
        captionAt: 'bottom',
      },
      {
        x: M + half + GUT, y: TOP + row1 + GUT, w: half, h: row2, bg: 'cf_tower', focus: [0.55, 0.22], zoom: 2.3,
        sprites: [{ key: 'pt_watch', x: 0.8, y: 0.96, scale: 2.4, angle: -8, glow: 140 }],
        caption: 'Every clock in town said 2:17. One pocket watch said 2:31. Somebody had been lying about the time.',
      },
    ],
    [
      {
        x: M, y: TOP, w: third, h: row1 + 40, bg: 'cf_school', focus: [0.5, 0.6],
        sprites: [{ key: 'pt_ivy', x: 0.5, y: 1.04, scale: 3.4, alpha: 0.9 }],
        caption: 'The teacher heard the bell. She never saw who rang it.',
        captionAt: 'bottom',
      },
      {
        x: M + third + GUT, y: TOP, w: third, h: row1 + 40, bg: 'cf_dock', focus: [0.62, 0.7],
        sprites: [{ key: 'pt_luke', x: 0.5, y: 1.04, scale: 3.4, alpha: 0.9 }],
        caption: flags.pushedBoat ? 'The boatman never got to thank the stranger who helped him push. He has now.' : 'The boatman kept loading boats long after the river turned.',
        captionAt: 'bottom',
      },
      {
        x: M + (third + GUT) * 2, y: TOP, w: third, h: row1 + 40, bg: 'cf_archive', focus: [0.5, 0.6],
        sprites: [{ key: 'pt_hanna', x: 0.5, y: 1.04, scale: 3.4, alpha: 0.9 }],
        caption: 'The archivist told a boy to stop. Ten years late, he listened.',
        captionAt: 'bottom',
      },
      {
        x: M, y: TOP + row1 + 40 + GUT, w: CW, h: row2 - 40, bg: 'cf_village', focus: [0.05, 0.92], zoom: 2.2,
        sprites: [
          { key: 'pt_lantern', x: 0.36, y: 0.94, scale: 3.2, glow: 220 },
          { key: 'w_photo', x: 0.78, y: 0.86, scale: 13, angle: 6 },
        ],
        caption: 'The fourth face in the photograph was mine. So was the lantern. So was the night.',
      },
    ],
    [
      ending === 'light'
        ? {
            x: M, y: TOP, w: CW, h: CH, bg: 'cf_village', focus: [0.55, 0.5],
            sprites: [
              { key: 'gv_hatman_idle', x: 0.44, y: 0.99, scale: 9 },
              { key: 'gv_woman_idle', x: 0.54, y: 0.99, scale: 5.6, flip: true },
            ],
            caption: '2:18. The first minute Veyra has had in ten years. I kept the horse. Case closed.',
          }
        : {
            x: M, y: TOP, w: CW, h: CH, bg: 'cf_village', focus: [0.5, 0.75], zoom: 1.4,
            letter: { x: 0.5, y: 0.72, angle: 3 },
            caption: 'Next year the letter will come again, and I will read it as if it were the first time. Case open.',
          },
    ],
  ];
}

/** Soft radial light and an edge vignette, made once. */
function ensureTextures(scene: Phaser.Scene) {
  if (!scene.textures.exists('cf_glow')) {
    const t = scene.textures.createCanvas('cf_glow', 128, 128)!;
    const c = t.getContext(), g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,214,140,0.85)');
    g.addColorStop(1, 'rgba(255,214,140,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
    t.refresh();
  }
  if (!scene.textures.exists('cf_vignette')) {
    const t = scene.textures.createCanvas('cf_vignette', 256, 256)!;
    const c = t.getContext(), g = c.createRadialGradient(128, 128, 60, 128, 128, 182);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.8)');
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
    t.refresh();
  }
}

/** Bakes one panel's art into a RenderTexture with the comic shader on it. */
function bake(scene: Phaser.Scene, p: PanelDef, fxStart: { colour: number; ink: number }) {
  const rt = scene.add.renderTexture(p.x, p.y, p.w, p.h).setOrigin(0);
  const src = scene.textures.get(p.bg).getSourceImage();
  const s = Math.max(p.w / src.width, p.h / src.height) * (p.zoom ?? 1);
  const bg = scene.make.image({ key: p.bg, add: false }).setOrigin(0).setScale(s);
  rt.draw(bg, (p.w - src.width * s) * p.focus[0], (p.h - src.height * s) * p.focus[1]);
  bg.destroy();
  for (const sp of p.sprites ?? []) {
    if (!scene.textures.exists(sp.key)) continue;
    const im = scene.make.image({ key: sp.key, frame: sp.frame ?? 0, add: false }).setOrigin(0.5, 1).setScale(sp.scale).setFlipX(!!sp.flip).setAngle(sp.angle ?? 0).setAlpha(sp.alpha ?? 1);
    if (sp.glow) {
      const gl = scene.make.image({ key: 'cf_glow', add: false }).setDisplaySize(sp.glow * 2, sp.glow * 2).setBlendMode(Phaser.BlendModes.ADD);
      rt.draw(gl, sp.x * p.w, sp.y * p.h - im.displayHeight / 2);
      gl.destroy();
    }
    rt.draw(im, sp.x * p.w, sp.y * p.h);
    im.destroy();
  }
  if (p.letter) {
    // A slip of paper with the four words on it.
    const lw = Math.min(420, p.w * 0.3), lh = lw * 0.5;
    const sheet = scene.make.graphics({}, false);
    sheet.fillStyle(0x000000, 0.45).fillRect(-lw / 2 + 8, -lh / 2 + 10, lw, lh);
    sheet.fillStyle(0xeee4cc, 1).fillRect(-lw / 2, -lh / 2, lw, lh);
    sheet.lineStyle(2, 0xb8aa88, 1).lineBetween(-lw / 2 + 20, lh / 6, lw / 2 - 20, lh / 6);
    sheet.setAngle(p.letter.angle);
    const word = scene.make.text({ text: 'COME HOME, ELI', style: { fontFamily: `"${FONTS.hand}"`, fontSize: `${Math.round(lw / 6.5)}px`, color: '#3a3440', resolution: TEXT_RESOLUTION } }, false).setOrigin(0.5).setAngle(p.letter.angle);
    if (word.width > lw * 0.84) word.setScale((lw * 0.84) / word.width);
    rt.draw(sheet, p.letter.x * p.w, p.letter.y * p.h);
    rt.draw(word, p.letter.x * p.w, p.letter.y * p.h - lh * 0.08);
    sheet.destroy();
    word.destroy();
  }
  const vig = scene.make.image({ key: 'cf_vignette', add: false }).setOrigin(0).setDisplaySize(p.w, p.h);
  rt.draw(vig, 0, 0);
  vig.destroy();
  const fx = attachComicFx(rt);
  if (fx) {
    fx.colour = fxStart.colour;
    fx.ink = fxStart.ink;
    fx.halftone = 0.7;
    fx.dot = 7;
  }
  return { rt, fx };
}

/** A yellowed, typewritten caption box in the panel's corner. */
function caption(scene: Phaser.Scene, p: PanelDef) {
  const maxW = Math.min(p.w - 48, 640);
  const t = scene.add.text(0, 0, p.caption, {
    fontFamily: `"${FONTS.narration}"`, fontSize: '30px', color: COLORS.inkCss, resolution: TEXT_RESOLUTION,
    wordWrap: { width: maxW - 40 }, lineSpacing: 6,
  });
  const bw = t.width + 40, bh = t.height + 30;
  const x = p.x + 18, y = p.captionAt === 'bottom' ? p.y + p.h - bh - 18 : p.y + 18;
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.5).fillRect(x + 6, y + 6, bw, bh);
  g.fillStyle(0xefe0ae, 1).fillRect(x, y, bw, bh);
  g.lineStyle(3, COLORS.ink, 1).strokeRect(x, y, bw, bh);
  t.setPosition(x + 20, y + 15);
  return [g, t];
}

/**
 * Plays the case file. Click, Space or Enter moves on a beat; SKIP jumps to the last panel.
 * Resolves once the player dismisses the last page.
 */
export async function playCaseFile(scene: Phaser.Scene, opts: { ending: Ending; flags: Record<string, unknown> }): Promise<void> {
  ensureTextures(scene);
  const root = scene.add.container(0, 0).setDepth(65);
  const paper = scene.add.rectangle(0, 0, W, H, COLORS.paper).setOrigin(0).setInteractive();
  root.add(paper);
  const head = scene.add.text(M, 26, 'CASE FILE 217: VEYRA', { fontFamily: `"${FONTS.sfx}"`, fontSize: '64px', color: COLORS.inkCss, resolution: TEXT_RESOLUTION, padding: { x: 6, y: 2 } });
  const pageNo = scene.add.text(W - M, 46, '', { fontFamily: `"${FONTS.narration}"`, fontSize: '30px', color: COLORS.inkCss, resolution: TEXT_RESOLUTION }).setOrigin(1, 0);
  const hint = scene.add.text(W - M, H - 22, 'Click or press Space', { fontFamily: `"${FONTS.narration}"`, fontSize: '24px', color: '#5a5048', resolution: TEXT_RESOLUTION }).setOrigin(1, 0.5);
  const skip = scene.add.text(W - M - 300, 46, 'SKIP', { fontFamily: `"${FONTS.sfx}"`, fontSize: '40px', color: COLORS.inkCss, resolution: TEXT_RESOLUTION, padding: { x: 6, y: 2 } }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setName('btn:SKIP');
  root.add([head, pageNo, hint, skip]);
  const layer = scene.add.container(0, 0);
  root.add(layer);

  const instant = comicSettings.reduceMotion;
  let skipping = false;
  skip.on('pointerdown', () => (skipping = true));
  const kb = scene.input.keyboard;
  /** Waits for a click/key, or `ms` (pass Infinity to wait for the player). */
  const beat = (ms: number) =>
    new Promise<void>((res) => {
      if (skipping) return res();
      let done = false;
      const fin = () => {
        if (done) return;
        done = true;
        timer?.remove();
        paper.off('pointerdown', fin);
        layer.list.forEach((o) => o.off?.('pointerdown', fin));
        kb?.off('keydown-SPACE', fin);
        kb?.off('keydown-ENTER', fin);
        skip.off('pointerdown', fin);
        res();
      };
      // Screenshot tests set __caseFileHold so every beat waits for a key press.
      const hold = !!(window as unknown as { __caseFileHold?: boolean }).__caseFileHold;
      const timer = Number.isFinite(ms) && !hold ? scene.time.delayedCall(ms, fin) : undefined;
      paper.on('pointerdown', fin);
      kb?.on('keydown-SPACE', fin);
      kb?.on('keydown-ENTER', fin);
      skip.on('pointerdown', fin);
    });
  const tweenTo = (targets: object, props: Record<string, number>, ms: number) =>
    new Promise<void>((res) => {
      if (instant || skipping) {
        Object.assign(targets, props);
        return res();
      }
      scene.tweens.add({ targets, ...props, duration: ms, ease: 'Sine.Out', onComplete: () => res() });
    });

  const book = pages(opts.ending, opts.flags);
  for (let pi = 0; pi < book.length; pi++) {
    const last = pi === book.length - 1;
    if (last) skipping = false; // the ending is never skipped past
    pageNo.setText(`${pi + 1} / ${book.length}`);
    skip.setVisible(!last);
    for (const p of book[pi]) {
      const { rt, fx } = bake(scene, p, last ? { colour: 0.12, ink: 0 } : { colour: 0.12, ink: 0 });
      const frame = scene.add.graphics().lineStyle(8, COLORS.ink, 1).strokeRect(p.x, p.y, p.w, p.h);
      const cap = caption(scene, p);
      layer.add([rt, frame, ...cap]);
      rt.setAlpha(0);
      frame.setAlpha(0);
      cap.forEach((o) => (o as Phaser.GameObjects.Text).setAlpha(0));
      await tweenTo(rt, { alpha: 1 }, 500);
      frame.setAlpha(1);
      if (last && fx) {
        // The payoff: colour floods back into Veyra, or ink takes it.
        if (opts.ending === 'light') await tweenTo(fx, { colour: 1, halftone: 0.25 }, 3200);
        else await tweenTo(fx, { ink: 0.55 }, 3200);
      }
      for (const o of cap) await tweenTo(o, { alpha: 1 }, 350);
      await beat(Infinity); // each panel stays until the player clicks or presses Space / Enter
    }
    if (!last) {
      await beat(skipping ? 0 : 600);
      await tweenTo(layer, { alpha: 0 }, 300);
      layer.removeAll(true);
      layer.setAlpha(1);
    }
  }
  await tweenTo(root, { alpha: 0 }, 400);
  root.destroy(true);
}
