import Phaser from 'phaser';
import { RichText } from './RichText';
import { COLORS, FONTS, TIMING } from './theme';
import { comicSettings, dur } from './settings';

export type BubbleKind = 'speech' | 'thought' | 'shout' | 'narration' | 'evidence';

export interface BubbleOptions {
  kind: BubbleKind;
  text: string; // supports [[redacted]], ~cracked~, *bold*, \n
  maxWidth?: number;
  /** Where the tail points, relative to the bubble centre. Ignored for narration/evidence boxes. */
  tail?: { x: number; y: number };
  fontSize?: number;
  /** Upper limit for the text-size setting on this bubble (lettering placed on panel art, fixed cards). */
  scaleCap?: number;
}

const OUTLINE = 4;

/**
 * Speech / thought / shout bubbles and narration / evidence caption boxes.
 * Positioned by its centre. Call `appear()` to play the Blueprint N "bubble rises 6 px" entrance.
 */
export class Bubble extends Phaser.GameObjects.Container {
  readonly kind: BubbleKind;
  readonly content: RichText;
  private homeY: number;
  /** How far a pixel tail/trail reaches beyond the box, above and below (layouts that stack bubbles add these). */
  extraAbove = 0;
  extraBelow = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: BubbleOptions) {
    super(scene, x, y);
    this.kind = opts.kind;
    this.homeY = y;

    const isBox = opts.kind === 'narration' || opts.kind === 'evidence';
    // Text size setting: bigger letters, and proportionally wider boxes so line counts stay similar.
    const scale = Math.min(comicSettings.textScale, opts.scaleCap ?? 2);
    const fontSize = Math.round((opts.fontSize ?? (isBox ? 24 : 28)) * scale);
    const maxWidth = Math.min(1500, Math.round((opts.maxWidth ?? (isBox ? 380 : 320)) * scale));
    this.content = new RichText(scene, 0, 0, opts.text, {
      fontFamily: isBox ? FONTS.narration : FONTS.speech,
      fontSize,
      color: COLORS.inkCss,
      maxWidth,
      align: isBox ? 'left' : 'center',
    });

    // Pixel text boxes (design/pixel/CONVERSATION.md): 24×24 9-slices, slice 5, drawn at ×4 and
    // stretched only in whole art pixels. Shouts keep the comic burst.
    const skin = { narration: 'ui_caption_9s', evidence: 'ui_caption_9s', speech: 'ui_speech_9s', thought: 'ui_thought_9s', shout: '' }[opts.kind];
    const pixel = !!skin && scene.textures.exists(`px_${skin}`) && scene.game.renderer.type === Phaser.WEBGL;
    const padX = pixel ? (isBox ? 40 : 48) : isBox ? 18 : 30;
    const padY = pixel ? (isBox ? 32 : 40) : isBox ? 14 : 22;
    let w = this.content.textWidth + padX * 2;
    let h = this.content.textHeight + padY * 2;
    this.content.setPosition(-this.content.textWidth / 2, -this.content.textHeight / 2);

    if (pixel) {
      w = Math.ceil(w / 4) * 4;
      h = Math.ceil(h / 4) * 4;
      const box = scene.add.nineslice(0, 0, `px_${skin}`, undefined, w / 4, h / 4, 5, 5, 5, 5).setScale(4);
      const parts: Phaser.GameObjects.GameObject[] = [box];
      if (opts.kind === 'evidence') parts.push(scene.add.rectangle(-w / 2 + 14, 0, 4, h - 40, COLORS.spiritTeal)); // recovered evidence rule
      const tail = opts.tail;
      if (tail && opts.kind === 'speech') {
        const side = tail.x < 0 ? 'l' : 'r';
        const key = scene.textures.exists(`px_ui_speech_tail_${side}`) ? `px_ui_speech_tail_${side}` : 'px_ui_speech_tail_l';
        const up = tail.y < -h / 2;
        const t = scene.add.image(side === 'l' ? -w / 2 + 80 : w / 2 - 80, up ? -h / 2 + 4 : h / 2 - 4, key).setOrigin(0.5, up ? 1 : 0).setScale(4).setFlipY(up);
        parts.unshift(t);
        if (up) this.extraAbove = t.displayHeight - 4;
        else this.extraBelow = t.displayHeight - 4;
      } else if (tail && opts.kind === 'thought' && scene.textures.exists('px_ui_thought_trail')) {
        const t = scene.add.image(Math.sign(tail.x || 1) * (w / 2 - 60), h / 2 - 4, 'px_ui_thought_trail').setOrigin(0.5, 0).setScale(4).setFlipX(tail.x < 0);
        parts.unshift(t);
        this.extraBelow = t.displayHeight - 4;
      }
      this.add([...parts, this.content]);
      this.setSize(w, h);
      return;
    }

    const g = scene.add.graphics();
    this.draw(g, opts, w, h);
    this.add([g, this.content]);
    this.setSize(w, h);
  }

  private draw(g: Phaser.GameObjects.Graphics, opts: BubbleOptions, w: number, h: number) {
    const tail = opts.tail;
    switch (opts.kind) {
      case 'narration':
      case 'evidence': {
        const fill = opts.kind === 'narration' ? COLORS.paper : 0xfff6c9;
        g.fillStyle(COLORS.ink, 0.35).fillRect(-w / 2 + 6, -h / 2 + 6, w, h); // drop shadow
        g.fillStyle(fill).fillRect(-w / 2, -h / 2, w, h);
        g.lineStyle(3, COLORS.ink).strokeRect(-w / 2, -h / 2, w, h);
        if (opts.kind === 'evidence') {
          // Thin spirit-teal rule marks recovered evidence.
          g.lineStyle(4, COLORS.spiritTeal).lineBetween(-w / 2 + 3, -h / 2 + 6, -w / 2 + 3, h / 2 - 6);
        }
        return;
      }
      case 'speech': {
        // Ink pass (slightly larger), then white pass: gives a clean outline round body + tail.
        if (tail) this.tailTriangle(g, COLORS.ink, w, h, tail, OUTLINE);
        g.fillStyle(COLORS.ink).fillRoundedRect(-w / 2 - OUTLINE, -h / 2 - OUTLINE, w + OUTLINE * 2, h + OUTLINE * 2, 34);
        if (tail) this.tailTriangle(g, COLORS.white, w, h, tail, 0);
        g.fillStyle(COLORS.white).fillRoundedRect(-w / 2, -h / 2, w, h, 30);
        return;
      }
      case 'thought': {
        g.fillStyle(COLORS.ink).fillEllipse(0, 0, w + 34 + OUTLINE * 2, h + 26 + OUTLINE * 2);
        g.fillStyle(COLORS.white).fillEllipse(0, 0, w + 34, h + 26);
        if (tail) {
          [0.62, 0.8, 0.93].forEach((t, i) => {
            const px = tail.x * t;
            const py = tail.y * t;
            const r = 12 - i * 3.5;
            g.fillStyle(COLORS.ink).fillCircle(px, py, r + OUTLINE);
            g.fillStyle(COLORS.white).fillCircle(px, py, r);
          });
        }
        return;
      }
      case 'shout': {
        const pts = burstPoints(w * 0.62 + 30, h * 0.62 + 26, 18, 0.18);
        if (tail) this.tailTriangle(g, COLORS.ink, w, h, tail, OUTLINE);
        g.fillStyle(COLORS.ink).fillPoints(burstPoints(w * 0.62 + 30 + OUTLINE, h * 0.62 + 26 + OUTLINE, 18, 0.18), true);
        if (tail) this.tailTriangle(g, COLORS.white, w, h, tail, 0);
        g.fillStyle(COLORS.white).fillPoints(pts, true);
        return;
      }
    }
  }

  private tailTriangle(
    g: Phaser.GameObjects.Graphics,
    color: number,
    w: number,
    h: number,
    tail: { x: number; y: number },
    grow: number,
  ) {
    // Base of the tail sits on the body edge facing the target point.
    const angle = Math.atan2(tail.y, tail.x);
    const edge = Math.min(Math.abs(w / 2 / Math.cos(angle)), Math.abs(h / 2 / Math.sin(angle))) * 0.8;
    const bx = Math.cos(angle) * edge;
    const by = Math.sin(angle) * edge;
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    const half = 16 + grow;
    g.fillStyle(color).fillTriangle(
      bx + nx * half,
      by + ny * half,
      bx - nx * half,
      by - ny * half,
      tail.x + Math.cos(angle) * grow * 2,
      tail.y + Math.sin(angle) * grow * 2,
    );
  }

  /** Fade in while rising 6 px (Blueprint N, 0.2 s). */
  appear(delay = 0): this {
    this.setAlpha(0);
    this.y = this.homeY + 6;
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      y: this.homeY,
      duration: dur(TIMING.bubbleAppear),
      delay,
      ease: 'Cubic.Out',
    });
    return this;
  }
}

/** Points of a jagged starburst ellipse, centred on 0,0. */
export function burstPoints(rx: number, ry: number, spikes: number, depth: number): Phaser.Math.Vector2[] {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    // Deterministic jitter so the burst doesn't change shape between redraws.
    const k = i % 2 === 0 ? 1 : 1 - depth - 0.06 * Math.sin(i * 12.9898);
    pts.push(new Phaser.Math.Vector2(Math.cos(a) * rx * k, Math.sin(a) * ry * k));
  }
  return pts;
}
