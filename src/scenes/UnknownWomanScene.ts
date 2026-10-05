import Phaser from 'phaser';
import { Bubble, COLORS, SfxWord, comicSettings, dur, pageTurn } from '../comic';
import { gameState } from '../core/GameState';
import { BEAT, makeBeatArt } from '../dev/beatArt';
import { button } from './coreUi';

// Script beat (design/script_final.html §4, kept in v2 by Garv, 5 Oct): the first time Elias walks
// into Veyra, an unknown woman in an abandoned room warns him, then is simply gone. She is Leela,
// recognisable only in hindsight; she is never named here.
export const UNKNOWN_WOMAN_TEXT = {
  line: "Whatever you find here, don't trust the first memory you see.",
  creak: 'Creeeak...',
  narration1: "I didn't know who she was.",
  narration2: 'But I remembered what she said.',
  next: 'CONTINUE',
} as const;
export const MET_FLAG = 'metUnknownWoman';

/**
 * One-time beat: room → her warning → click → she vanishes (no fade, per the script) → the chair
 * rocks → two narration lines → CONTINUE back to the village. Sets the `metUnknownWoman` flag.
 */
export class UnknownWomanScene extends Phaser.Scene {
  private step = 0;
  private woman!: Phaser.GameObjects.Image;
  private chair!: Phaser.GameObjects.Image;
  private line?: Bubble;

  constructor() {
    super('UnknownWoman');
  }

  create() {
    this.step = 0;
    makeBeatArt(this);
    this.add.image(0, 0, BEAT.room).setOrigin(0).setDisplaySize(1920, 1080);
    // The chair rocks around its rockers, so pivot near the floor.
    this.chair = this.add.image(900, 900, BEAT.chair).setOrigin(0.5, 0.92);
    this.woman = this.add.image(900, 860, BEAT.woman).setOrigin(0.5, 1).setScale(0.95).setName('unknownWoman');
    this.cameras.main.fadeIn(dur(500), 0, 0, 0);

    // Click anywhere / Space / Enter advances.
    const advance = () => this.advance();
    this.add.zone(0, 0, 1920, 1080).setOrigin(0).setInteractive().on('pointerup', advance).setDepth(-1).setName('advance');
    this.input.keyboard?.on('keydown-SPACE', advance);
    this.input.keyboard?.on('keydown-ENTER', advance);

    this.time.delayedCall(dur(700), () => {
      this.line = new Bubble(this, 1260, 420, {
        kind: 'speech',
        text: UNKNOWN_WOMAN_TEXT.line,
        maxWidth: 560,
        fontSize: 34,
        tail: { x: -300, y: 120 },
      });
      this.line.setName('line:warning');
      this.add.existing(this.line.appear(0));
    });
    (window as unknown as { __unknownWoman: UnknownWomanScene }).__unknownWoman = this;
  }

  /** 0 → she vanishes + chair rocks; 1 → narration; afterwards the CONTINUE button takes over. */
  advance() {
    if (!this.line) return; // her line isn't up yet
    if (this.step === 0) {
      this.step = 1;
      // "She disappears without fading. The chair remains and slowly rocks."
      this.woman.setVisible(false);
      this.line.destroy();
      if (!comicSettings.reduceMotion) {
        this.tweens.add({ targets: this.chair, angle: { from: -7, to: 7 }, duration: 900, yoyo: true, repeat: 3, ease: 'Sine.InOut', onComplete: () => this.chair.setAngle(0) });
      }
      const creak = new SfxWord(this, 1180, 640, { text: UNKNOWN_WOMAN_TEXT.creak, size: 70, angle: -6, burst: false });
      this.add.existing(creak);
      creak.disableInteractive();
      this.time.delayedCall(dur(900), () => this.narrate());
      return;
    }
  }

  private narrate() {
    if (this.step !== 1) return;
    this.step = 2;
    const n1 = new Bubble(this, 960, 160, { kind: 'narration', text: UNKNOWN_WOMAN_TEXT.narration1, maxWidth: 820, fontSize: 32 });
    this.add.existing(n1.appear(0));
    const n2 = new Bubble(this, 960, 250, { kind: 'narration', text: UNKNOWN_WOMAN_TEXT.narration2, maxWidth: 820, fontSize: 32 });
    this.add.existing(n2.appear(dur(600)));
    const next = button(this, 960, 980, UNKNOWN_WOMAN_TEXT.next, () => this.leave(), { fontSize: 36, fill: COLORS.paper });
    next.setAlpha(0);
    this.tweens.add({ targets: next, alpha: 1, delay: dur(900), duration: dur(250) });
  }

  private leave() {
    gameState.setFlag(MET_FLAG);
    pageTurn(this, () => this.scene.start('Village'));
  }
}
