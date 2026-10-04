import Phaser from 'phaser';
import { burstPoints, Bubble } from './Bubble';
import { COLORS, FONTS, TEXT_RESOLUTION, TIMING } from './theme';
import { impact } from './Transitions';
import { comicSettings, dur } from './settings';

export interface SfxWordOptions {
  text: string; // e.g. "BELL!"
  size?: number; // font size in px
  color?: string; // fill colour of the letters
  burstColor?: number; // starburst behind the word; null-ish = no burst
  burst?: boolean;
  angle?: number; // degrees
  /** Fragment text revealed under the word when it is clicked (Blueprint H3 "fragment text it hides"). */
  evidence?: string;
}

/**
 * A clickable comic sound-effect word that hides an evidence fragment.
 * Emits 'reveal' (this) when clicked the first time.
 */
export class SfxWord extends Phaser.GameObjects.Container {
  readonly opts: SfxWordOptions;
  revealed = false;
  private label: Phaser.GameObjects.Text;
  private art: Phaser.GameObjects.Container; // burst + letters; fades after the pop, the evidence card doesn't
  private pulseTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: SfxWordOptions) {
    super(scene, x, y);
    this.opts = opts;
    const size = opts.size ?? 64;

    this.label = scene.add
      .text(0, 0, opts.text, {
        fontFamily: `"${FONTS.sfx}"`,
        fontSize: `${size}px`,
        color: opts.color ?? COLORS.amberCss,
        stroke: COLORS.inkCss,
        strokeThickness: Math.round(size * 0.14),
        shadow: { offsetX: 5, offsetY: 5, color: COLORS.inkCss, fill: true, stroke: true },
        padding: { x: 8, y: 4 },
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5);

    const w = this.label.width;
    const h = this.label.height;
    this.art = scene.add.container(0, 0);
    if (opts.burst !== false) {
      const g = scene.add.graphics();
      g.fillStyle(COLORS.ink).fillPoints(burstPoints(w * 0.66 + 6, h * 0.78 + 6, 14, 0.22), true);
      g.fillStyle(opts.burstColor ?? COLORS.white).fillPoints(burstPoints(w * 0.66, h * 0.78, 14, 0.22), true);
      this.art.add(g);
    }
    this.art.add(this.label);
    this.add(this.art);
    this.art.setAngle(opts.angle ?? -6);
    this.setSize(w * 1.2, h * 1.4);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation(); // don't also trigger the panel under the word
      this.pop();
    });
  }

  /** Gentle attention pulse for the first clue a player should find (Blueprint F3). */
  pulse(): this {
    if (comicSettings.reduceMotion || this.pulseTween) return this;
    this.pulseTween = this.scene.tweens.add({
      targets: this.art,
      scale: 1.08,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    return this;
  }

  /** Burst animation (1.0 → 1.15 → 1.0 with a tiny rotation, then fade) and evidence reveal. */
  pop(): void {
    if (this.revealed) return;
    this.revealed = true;
    this.pulseTween?.stop();
    this.pulseTween = undefined;
    this.disableInteractive();
    this.art.setScale(1);

    const scene = this.scene;
    scene.tweens.chain({
      targets: this.art,
      tweens: [
        { scale: 1.15, angle: this.art.angle + 4, duration: dur(TIMING.sfxPop / 2), ease: 'Back.Out' },
        { scale: 1, duration: dur(TIMING.sfxPop / 2), ease: 'Cubic.In' },
        { alpha: 0.35, duration: dur(250) },
      ],
    });
    impact(scene);

    if (this.opts.evidence) {
      // The evidence card fades in under the word with a small upward motion (Blueprint N).
      const card = new Bubble(scene, 0, this.label.height * 0.9, {
        kind: 'evidence',
        text: this.opts.evidence,
        maxWidth: 300,
        fontSize: 21,
      });
      this.add(card);
      card.setAlpha(0);
      scene.tweens.add({
        targets: card,
        alpha: 1,
        y: card.y - 10,
        duration: dur(TIMING.evidenceReveal),
        delay: dur(TIMING.sfxPop),
        ease: 'Cubic.Out',
      });
    }
    this.emit('reveal', this);
  }
}
