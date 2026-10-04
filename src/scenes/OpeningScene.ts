import Phaser from 'phaser';
import { COLORS, comicSettings, ComicButton, dur, pageTurn } from '../comic';
import { story } from '../core/StoryData';
import { PH } from '../dev/placeholders';
import { FRAME, SequenceScene, type FrameBuilder } from './sequence/SequenceScene';

/**
 * Opening (Blueprint F2): six frames, ~50 s, Elias never shown (hands, lantern glow and a
 * reflection only). Text comes from content/opening.json; visuals are placeholder crops of the
 * village until final art lands. Ends with a page turn into the Village hub.
 */
export class OpeningScene extends SequenceScene {
  constructor() {
    super('Opening');
  }

  create() {
    super.create();
    // Replays can skip straight to the village.
    this.add
      .existing(new ComicButton(this, 1840, 40, { label: 'SKIP', fontSize: 22 }))
      .setDepth(60)
      .on('click', () => this.finish());
  }

  protected frames(): FrameBuilder[] {
    const f = story.opening.frames;
    const n = (i: number) => f[i].narration;
    return [
      // 1 — Rainy Veyra road, case file and lantern held from off-screen.
      (layer) => {
        this.panel(layer, PH.village, { x: 0, y: 560, w: 920, h: 518 });
        this.rain(layer);
        this.lanternGlow(layer, FRAME.x + FRAME.w - 160, FRAME.y + FRAME.h - 140, 1);
        const { doc } = this.document(layer, FRAME.x + 1200, FRAME.y + 640, 420, 260, 'CASE FILE', 'VEYRA — mass disappearance.\nStatus: unsolved.', false, -6);
        doc.setScale(0.9);
        this.narration(layer, n(0));
        this.sfxWord(layer, f[0].sfx, FRAME.x + 260, FRAME.y + 760, 64);
      },
      // 2 — Elias sets the lantern down; face never shown.
      (layer) => {
        this.panel(layer, PH.village, { x: 560, y: 600, w: 760, h: 428 });
        this.lanternGlow(layer, FRAME.x + FRAME.w / 2, FRAME.y + FRAME.h - 220, 1.6);
        this.narration(layer, n(1));
        this.sfxWord(layer, f[1].sfx, FRAME.x + 1300, FRAME.y + 200, 64);
      },
      // 3 — Clock tower close-up frozen at 2:17; the hand twitches but never advances.
      (layer) => {
        this.panel(layer, PH.village, { x: 643, y: 150, w: 534, h: 300 });
        this.twitchingHand(layer);
        this.narration(layer, n(2));
        this.sfxWord(layer, f[2].sfx, FRAME.x + 1280, FRAME.y + 760, 60);
      },
      // 4 — Mira appears by the schoolhouse.
      (layer) => {
        this.panel(layer, PH.village, { x: 60, y: 380, w: 640, h: 360 });
        const mira = this.add.image(FRAME.x + 1150, FRAME.y + FRAME.h - 20, PH.mira).setOrigin(0.5, 1).setScale(1.25).setAlpha(0);
        layer.add(mira);
        this.tweens.add({ targets: mira, alpha: 0.88, duration: dur(1200), delay: 300 });
        this.narration(layer, n(3));
        if (f[3].dialogue) this.speech(layer, f[3].dialogue.line, FRAME.x + 820, FRAME.y + 300, { x: 180, y: 90 }, 1100);
        this.sfxWord(layer, f[3].sfx, FRAME.x + 300, FRAME.y + 700, 64);
      },
      // 5 — Black silhouette in a window reflection; it doubles for one beat, then clears.
      (layer) => {
        this.panel(layer, PH.village, { x: 1100, y: 480, w: 420, h: 236 });
        const win = { x: FRAME.x + 494, y: FRAME.y + 380 };
        const fig = this.add.image(win.x + 190, win.y + 330, PH.figure).setOrigin(0.5, 1).setScale(0.48).setAlpha(0.7);
        const echo = this.add.image(fig.x + 14, fig.y, PH.figure).setOrigin(0.5, 1).setScale(0.48).setAlpha(0);
        layer.add([fig, echo]);
        if (!comicSettings.reduceMotion) {
          this.tweens.chain({
            targets: echo,
            tweens: [
              { alpha: 0.45, duration: 180, delay: 900 },
              { alpha: 0, x: fig.x, duration: 500 },
            ],
          });
        }
        this.narration(layer, n(4));
        this.sfxWord(layer, f[4].sfx, FRAME.x + 1250, FRAME.y + 740, 64, 900);
      },
      // 6 — Village hub, three witnesses, clock tower; the comic page turns into the hub.
      (layer) => {
        this.panel(layer, PH.village, { x: 0, y: 0, w: 1920, h: 1080 });
        this.narration(layer, n(5), FRAME.x + 310, FRAME.y + 90);
        this.sfxWord(layer, f[5].sfx, FRAME.x + 920, FRAME.y + 300, 84, 500);
      },
    ];
  }

  protected finish(): void {
    pageTurn(this, () => this.scene.start('Village'));
  }

  // ------------------------------------------------------------------ effects

  private rain(layer: Phaser.GameObjects.Container) {
    if (!this.textures.exists('fx_rain')) {
      const g = this.make.graphics({}, false);
      g.fillStyle(0xbfd6e6, 0.55).fillRect(0, 0, 2, 22);
      g.generateTexture('fx_rain', 2, 22);
      g.destroy();
    }
    const quantity = comicSettings.reduceMotion ? 1 : 3;
    const rain = this.add.particles(0, 0, 'fx_rain', {
      x: { min: FRAME.x, max: FRAME.x + FRAME.w },
      y: FRAME.y,
      speedY: { min: 900, max: 1200 },
      speedX: -120,
      angle: 0,
      rotate: 6,
      lifespan: 900,
      quantity,
      frequency: 16,
      alpha: { start: 0.8, end: 0.2 },
    });
    // Keep the drops inside the panel.
    const mask = this.make.graphics({}, false).fillRect(FRAME.x, FRAME.y, FRAME.w, FRAME.h);
    rain.setMask(mask.createGeometryMask());
    layer.add(rain);
  }

  private lanternGlow(layer: Phaser.GameObjects.Container, x: number, y: number, scale: number) {
    const outer = this.add.circle(x, y, 110 * scale, COLORS.spiritTeal, 0.18);
    const inner = this.add.circle(x, y, 36 * scale, COLORS.spiritTeal, 0.85);
    layer.add([outer, inner]);
    if (!comicSettings.reduceFlashing) {
      this.tweens.add({ targets: outer, scale: 1.25, alpha: 0.08, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
  }

  /** The minute hand over the 2:17 clock face, twitching toward 2:18 and snapping back (Blueprint N). */
  private twitchingHand(layer: Phaser.GameObjects.Container) {
    // Clock centre (910,300) in the village texture → panel coordinates for src x:643 y:150 at 3×.
    const cx = FRAME.x + (910 - 643) * 3;
    const cy = FRAME.y + (300 - 150) * 3;
    const hand = this.add.rectangle(cx, cy, 15, 150, COLORS.ink).setOrigin(0.5, 1);
    hand.setAngle((17 / 60) * 360);
    layer.add(hand);
    if (!comicSettings.reduceMotion) {
      this.tweens.add({
        targets: hand,
        angle: hand.angle + 3,
        duration: 90,
        yoyo: true,
        repeat: -1,
        repeatDelay: 1100,
        ease: 'Back.Out',
      });
    }
  }
}
