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
  /** Locked words (behind an Echo Paths puzzle) emit 'locked' on click instead of revealing. */
  locked?: boolean;
  /** Panel size (panel-local px). The evidence card is kept inside it. */
  area?: { w: number; h: number };
  /** Explicit evidence-card centre in panel-local px (overrides the default "below the word"). */
  cardAt?: { x: number; y: number };
}

/**
 * A clickable comic sound-effect word that hides an evidence fragment.
 * Emits 'reveal' (this) when clicked the first time, or 'locked' (this) while locked.
 */
export class SfxWord extends Phaser.GameObjects.Container {
  readonly opts: SfxWordOptions;
  revealed = false;
  locked: boolean;
  private lockMark?: Phaser.GameObjects.Text;
  private label: Phaser.GameObjects.Text;
  private art: Phaser.GameObjects.Container; // burst + letters; fades after the pop, the evidence card doesn't
  private pulseTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: SfxWordOptions) {
    super(scene, x, y);
    this.opts = opts;
    this.locked = !!opts.locked;
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
      if (this.locked) {
        this.emit('locked', this);
        this.wiggle();
      } else this.pop();
    });

    if (this.locked) {
      // Small spirit-light padlock badge: this fragment sits behind an Echo Path.
      this.lockMark = scene.add
        .text(w * 0.5, -h * 0.55, '◆', {
          fontFamily: `"${FONTS.sfx}"`,
          fontSize: `${Math.round(size * 0.45)}px`,
          color: COLORS.spiritTealCss,
          stroke: COLORS.inkCss,
          strokeThickness: 6,
          resolution: TEXT_RESOLUTION,
        })
        .setOrigin(0.5);
      this.art.add(this.lockMark);
    }
  }

  /** Remove the lock (e.g. after the puzzle is solved). */
  unlock(): this {
    this.locked = false;
    this.lockMark?.destroy();
    this.lockMark = undefined;
    return this;
  }

  private wiggle() {
    if (comicSettings.reduceMotion) return;
    const base = this.art.angle;
    this.scene.tweens.chain({
      targets: this.art,
      tweens: [
        { angle: base - 5, duration: 60 },
        { angle: base + 5, duration: 80 },
        { angle: base, duration: 60 },
      ],
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

  /**
   * Burst animation (1.0 → 1.15 → 1.0 with a tiny rotation, then fade) and evidence reveal.
   * `silent` shows the already-revealed state instantly and emits nothing (evidence found earlier).
   */
  pop(silent = false): void {
    if (this.revealed) return;
    this.revealed = true;
    this.unlock();
    this.pulseTween?.stop();
    this.pulseTween = undefined;
    this.disableInteractive();
    this.art.setScale(1);

    if (silent) {
      this.art.setAlpha(0.35);
      if (this.opts.evidence) this.add(this.evidenceCard(-10));
      return;
    }

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
      const card = this.evidenceCard(0);
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

  /** Evidence card positioned below the word (or at `cardAt`), clamped inside `area`. */
  private evidenceCard(dy: number): Bubble {
    const card = new Bubble(this.scene, 0, 0, { kind: 'evidence', text: this.opts.evidence ?? '', maxWidth: 280, fontSize: 21 });
    const { area, cardAt } = this.opts;
    // Work in panel-local coordinates (this container sits at x,y in the panel overlay).
    let cx = cardAt ? cardAt.x : this.x;
    let cy = cardAt ? cardAt.y : this.y + this.label.height * 0.5 + card.height / 2 + 6;
    if (area) {
      const m = 8;
      if (!cardAt && cy + card.height / 2 > area.h - m) cy = this.y - this.label.height * 0.5 - card.height / 2 - 6;
      cx = Phaser.Math.Clamp(cx, card.width / 2 + m, area.w - card.width / 2 - m);
      cy = Phaser.Math.Clamp(cy, card.height / 2 + m, area.h - card.height / 2 - m);
    }
    card.setPosition(cx - this.x, cy - this.y + dy);
    return card;
  }
}
