import Phaser from 'phaser';
import { COLORS, comicSettings, ComicButton, dur, pageTurn } from '../comic';
import { story } from '../core/StoryData';
import { PH } from '../dev/placeholders';
import { FRAME, SequenceScene, type FrameBuilder } from './sequence/SequenceScene';
import { PX, PixelStage, hasPixel, lanternLight } from '../pixel/pixel';

const SCENE1 = ['bg_veyra_sky', 'bg_veyra_far', 'bg_veyra_mid', 'bg_veyra_street', 'bg_veyra_fg', 'char_elias_walk'];
const SCENE2 = ['bg_tower_sky', 'bg_tower', 'prop_bell', 'bg_clockface_close'];
const SCENE3 = ['bg_veyra_sky', 'bg_veyra_far', 'bg_veyra_mid', 'bg_veyra_street', 'bg_veyra_fg', 'char_elias_walk', 'prop_toy_horse'];
const WINDOW = ['bg_window_close', 'char_window_figure'];

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
        if (hasPixel(this, ...SCENE1)) this.pixelEntering(layer);
        else {
          this.panel(layer, PH.village, { x: 0, y: 560, w: 920, h: 518 });
          this.rain(layer);
          this.lanternGlow(layer, FRAME.x + FRAME.w - 160, FRAME.y + FRAME.h - 140, 1);
        }
        const { doc } = this.document(layer, FRAME.x + 1200, FRAME.y + 640, 420, 260, 'CASE FILE', 'VEYRA — mass disappearance.\nStatus: unsolved.', false, -6);
        doc.setScale(0.9);
        this.narration(layer, n(0));
        this.sfxWord(layer, f[0].sfx, FRAME.x + 260, FRAME.y + 760, 64);
      },
      // 2 — Gloved hands set the lantern down; the unsigned request (found in the lantern case) is
      // pinned to the typed file. Face never shown.
      (layer) => {
        if (hasPixel(this, ...SCENE3)) this.pixelToy(layer);
        else {
          this.panel(layer, PH.village, { x: 560, y: 600, w: 760, h: 428 });
          this.lanternGlow(layer, FRAME.x + FRAME.w / 2, FRAME.y + FRAME.h - 220, 1.6);
        }
        if (f[1].prop) this.document(layer, FRAME.x + 1220, FRAME.y + 330, 480, 250, 'REQUEST', f[1].prop, true, 4);
        this.narration(layer, n(1));
        this.sfxWord(layer, f[1].sfx, FRAME.x + 260, FRAME.y + 760, 64);
      },
      // 3 — Clock tower close-up frozen at 2:17; the hand twitches but never advances.
      (layer) => {
        if (hasPixel(this, ...SCENE2)) this.pixelTower(layer);
        else {
          this.panel(layer, PH.village, { x: 643, y: 150, w: 534, h: 300 });
          this.twitchingHand(layer);
        }
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
        if (hasPixel(this, ...WINDOW)) {
          this.pixelWindow(layer);
          this.narration(layer, n(4));
          this.sfxWord(layer, f[4].sfx, FRAME.x + 1250, FRAME.y + 740, 64, 900);
          return;
        }
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

  // ------------------------------------------------------------------ pixel art (design/pixel, scenes 1–2)

  /** Runs `fn(ms since start)` every frame until `layer` is destroyed (the frame changes). */
  private everyFrame(layer: Phaser.GameObjects.Container, fn: (t: number) => void) {
    const t0 = this.time.now;
    const tick = () => fn(this.time.now - t0);
    this.events.on(Phaser.Scenes.Events.UPDATE, tick);
    layer.once(Phaser.GameObjects.Events.DESTROY, () => this.events.off(Phaser.Scenes.Events.UPDATE, tick));
    tick();
  }

  /** Scene 1, entering Veyra: Elias walks in under the lantern; door symbols show only in its light. */
  private pixelEntering(layer: Phaser.GameObjects.Container) {
    const st = new PixelStage(this, layer, FRAME);
    for (const n of ['bg_veyra_sky', 'bg_veyra_far', 'bg_veyra_mid', 'bg_veyra_street']) st.image(n);
    const FEET = 236;
    const [X0, X1] = [-20, 196];
    const T0 = 1000;
    const T1 = 8500;
    if (!this.anims.exists('elias_walk')) {
      this.anims.create({ key: 'elias_walk', frames: this.anims.generateFrameNumbers(PX('char_elias_walk'), { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
      this.anims.create({ key: 'elias_idle', frames: this.anims.generateFrameNumbers(PX('char_elias_walk'), { start: 4, end: 5 }), frameRate: 2, repeat: -1 });
    }
    const elias = st.sprite('char_elias_walk', X0, FEET, 0, 56 / 58).setName('pixel:elias');
    const lantern = hasPixel(this, 'prop_lantern') ? st.sprite('prop_lantern', X0 + 12, FEET - 52, 0.5, 0) : undefined;
    st.image('bg_veyra_fg');
    const instant = comicSettings.reduceMotion;
    let ex = instant ? X1 : X0;
    const light = lanternLight(st, () => st.at(ex + 12, FEET - 46), 58, 'bg_veyra_residue');
    elias.play(instant ? 'elias_idle' : 'elias_walk');
    let idle = instant;
    this.everyFrame(layer, (t) => {
      if (!instant) {
        const k = Phaser.Math.Clamp((t - T0) / (T1 - T0), 0, 1);
        ex = Math.round(X0 + (X1 - X0) * k);
        if (k >= 1 && !idle) {
          idle = true;
          elias.play('elias_idle');
        }
      }
      const p = st.at(ex, FEET);
      elias.setPosition(p.x, p.y);
      if (lantern) {
        const q = st.at(ex + 12, FEET - 52 + (idle ? 0 : Math.round(Math.sin(t / 160)))); // swings as he walks
        lantern.setPosition(q.x, q.y).setFrame(Math.floor(t / 120) % 3);
      }
      light(t);
    });
  }

  /** Scene 2, the clock tower: the bell swings for two DONGs, then the 2:17 face up close. */
  private pixelTower(layer: Phaser.GameObjects.Container) {
    const st = new PixelStage(this, layer, FRAME);
    st.image('bg_tower_sky');
    st.image('bg_tower');
    const bell = st.sprite('prop_bell', 240, 24, 24 / 48, 2 / 40).setName('pixel:bell');
    const DONGS = [1200, 3400];
    const angle = (t: number) => DONGS.reduce((a, d) => (t > d ? a + 0.45 * Math.sin(((t - d) / 1000) * 5.5) * Math.exp(-((t - d) / 1000) * 0.9) : a), 0);
    const rang = new Set<number>();
    // 2B: the face up close, the dried-blood second hand twitching toward 2:18 and snapping back.
    const close = this.add.container(0, 0).setVisible(false);
    layer.add(close);
    const cst = new PixelStage(this, close, FRAME, 192, 108);
    cst.image('bg_clockface_close');
    const c = cst.at(96, 54);
    const hand = this.add.rectangle(c.x, c.y, cst.scale, 38 * cst.scale, 0x7a1010).setOrigin(0.5, 1);
    close.add(hand);
    const CUT = comicSettings.reduceMotion ? 0 : 5000;
    this.everyFrame(layer, (t) => {
      if (!comicSettings.reduceMotion) bell.setRotation(angle(t));
      for (const d of DONGS) {
        if (t > d && !rang.has(d)) {
          rang.add(d);
          if (!comicSettings.reduceMotion && !comicSettings.reduceFlashing) this.cameras.main.shake(350, 0.004);
        }
      }
      if (t >= CUT && !close.visible) close.setVisible(true);
      // Frozen at :40; every 1.3 s it tries the next tick and snaps straight back.
      const twitch = !comicSettings.reduceMotion && t % 1300 < 120 ? 6 : 0;
      hand.setAngle(40 * 6 + twitch);
    });
  }

  /** Scene 3a: Elias has stopped on the street; a child's toy horse rolls in and stops at his feet. */
  private pixelToy(layer: Phaser.GameObjects.Container) {
    const st = new PixelStage(this, layer, FRAME);
    for (const n of ['bg_veyra_sky', 'bg_veyra_far', 'bg_veyra_mid', 'bg_veyra_street']) st.image(n);
    const FEET = 236;
    const EX = 196;
    if (!this.anims.exists('elias_idle')) {
      this.anims.create({ key: 'elias_idle', frames: this.anims.generateFrameNumbers(PX('char_elias_walk'), { start: 4, end: 5 }), frameRate: 2, repeat: -1 });
    }
    st.sprite('char_elias_walk', EX, FEET, 0, 56 / 58).play('elias_idle');
    const toy = st.sprite('prop_toy_horse', 480 + 12, 222, 0.5, 1).setName('pixel:toy');
    st.image('bg_veyra_fg');
    const light = lanternLight(st, () => st.at(EX + 12, FEET - 46), 58, 'bg_veyra_residue');
    const [TX0, TX1, T0, T1] = [492, 270, 600, 3600];
    this.everyFrame(layer, (t) => {
      const k = comicSettings.reduceMotion ? 1 : Phaser.Math.Clamp((t - T0) / (T1 - T0), 0, 1);
      const e = 1 - (1 - k) * (1 - k); // rolls in and slows to a stop
      const x = Math.round(TX0 + (TX1 - TX0) * e);
      const p = st.at(x, 222 + (k < 1 && Math.floor(t / 90) % 2 ? -1 : 0)); // bumps over the cobbles
      toy.setPosition(p.x, p.y);
      light(t);
    });
  }

  /** Scene 3b: a figure in the window, there for a blink (6 frames at 4.6 s), then fade to black. */
  private pixelWindow(layer: Phaser.GameObjects.Container) {
    const st = new PixelStage(this, layer, FRAME, 192, 108);
    st.image('bg_window_close');
    const fig = st.sprite('char_window_figure', 76, 30, 0, 0).setVisible(false).setName('pixel:window-figure');
    const black = this.add.rectangle(st.x, st.y, 192 * st.scale, 108 * st.scale, COLORS.ink).setOrigin(0).setAlpha(0);
    layer.add(black);
    const SHOW = comicSettings.reduceMotion ? 1500 : 4600;
    this.everyFrame(layer, (t) => {
      fig.setVisible(t >= SHOW && t < SHOW + 100); // 6 frames at 60 fps
      if (t >= SHOW + 100) black.setAlpha(Math.min(0.85, (t - SHOW - 100) / 900));
    });
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
