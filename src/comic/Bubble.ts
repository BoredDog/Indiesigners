import Phaser from 'phaser';
import { RichText } from './RichText';
import { COLORS, FONTS, TIMING } from './theme';
import { dur } from './settings';

export type BubbleKind = 'speech' | 'thought' | 'shout' | 'narration' | 'evidence';

export interface BubbleOptions {
  kind: BubbleKind;
  text: string; // supports [[redacted]], ~cracked~, *bold*, \n
  maxWidth?: number;
  /** Where the tail points, relative to the bubble centre. Ignored for narration/evidence boxes. */
  tail?: { x: number; y: number };
  fontSize?: number;
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

  constructor(scene: Phaser.Scene, x: number, y: number, opts: BubbleOptions) {
    super(scene, x, y);
    this.kind = opts.kind;
    this.homeY = y;

    const isBox = opts.kind === 'narration' || opts.kind === 'evidence';
    const fontSize = opts.fontSize ?? (isBox ? 24 : 28);
    const maxWidth = opts.maxWidth ?? (isBox ? 380 : 320);
    this.content = new RichText(scene, 0, 0, opts.text, {
      fontFamily: isBox ? FONTS.narration : FONTS.speech,
      fontSize,
      color: COLORS.inkCss,
      maxWidth,
      align: isBox ? 'left' : 'center',
    });

    const padX = isBox ? 18 : 30;
    const padY = isBox ? 14 : 22;
    const w = this.content.textWidth + padX * 2;
    const h = this.content.textHeight + padY * 2;
    this.content.setPosition(-this.content.textWidth / 2, -this.content.textHeight / 2);

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
