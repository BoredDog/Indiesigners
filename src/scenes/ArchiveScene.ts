import Phaser from 'phaser';
import { attachComicFx, Bubble, COLORS, comicSettings, dur, impact, pageTurn, SfxWord } from '../comic';
import { gameState } from '../core/GameState';
import { evidence, evidenceOf, story } from '../core/StoryData';
import { PH, makePlaceholders } from '../dev/placeholders';
import { PX, PixelStage, hasPixel, lanternLight } from '../pixel/pixel';
import { button, hasScene, hudIcons } from './coreUi';

// Pixel scene 10 (design/pixel/scene10_under_veyra.html): the well lock, then the tunnel down.
const WELL = ['bg_well_lock', 'prop_key_turn', 'bg_tunnel', 'char_elias_walk'];

export interface ArchiveData {
  solved?: string; // set by the Puzzle scene when pz_archive is escaped
}

// Archive beats (Blueprint E "Hidden archive", script v2 d8): explore, master console,
// collapse/scripted escape, the record (two documents granted automatically) → Accusation → Finale.
const TEXT = {
  well: "The key wasn't meant for a door above ground.\nIt was meant for what was underneath.", // final script §9
  wellSfx: 'CLICK.',
  intro: 'My feet knew the way down. I told myself it was instinct.',
  console: "Beneath the well, Leela's hidden archive. The master console was still warm.",
  collapse: 'Then the archive began to fall in on itself.',
  escape: 'ESCAPE WITH THE RECORD',
  escaped: 'I got out with the record. The archive did not.',
  question: 'One question left.',
  next: 'CONTINUE',
};

/**
 * Hidden Archive (PLAN.md §2 step 9): opens after 9/9 deductions. A short comic beat, then the
 * collapse escape (Echo Path `pz_archive`), then the Finale.
 */
export class ArchiveScene extends Phaser.Scene {
  constructor() {
    super('Archive');
  }

  create(data: ArchiveData = {}) {
    makePlaceholders(this);
    this.add.rectangle(0, 0, 1920, 1080, 0x06070a).setOrigin(0);
    const escaped = data.solved === 'pz_archive' || gameState.flag('archiveEscaped');
    // First way down: the key in the well, then the tunnel (once; the flag skips it on a revisit).
    if (!escaped && !gameState.flag('wellOpened') && hasPixel(this, ...WELL)) return this.wellBeat(data);

    const pixelBg = escaped ? 'bg_archive_escape' : 'bg_archive_intro';
    if (hasPixel(this, pixelBg)) {
      const st = new PixelStage(this, this.add.container(0, 0), { x: 0, y: 0, w: 1920, h: 1080 });
      st.image(pixelBg).setName(`pixel:${pixelBg}`).setAlpha(0.8);
    } else {
      const bg = this.add.image(960, 540, PH.village).setDisplaySize(1920, 1080).setAlpha(0.35);
      const fx = attachComicFx(bg);
      if (fx) fx.colour = 0;
    }
    this.add.rectangle(960, 540, 1880, 1040).setStrokeStyle(10, COLORS.spiritTeal, 0.35);
    hudIcons(this, 'Archive');

    if (escaped) {
      gameState.setFlag('archiveEscaped');
      // The record itself: granted with the escape, shown automatically (never on a page, never optional-counted).
      for (const e of evidenceOf('archive')) gameState.addEvidence(e.id);
      return this.escapedBeat(data.solved === 'pz_archive');
    }
    this.introBeat();
  }

  private introBeat() {
    // The tunnel beat already said the intro line.
    if (!gameState.flag('wellOpened')) {
      const intro = new Bubble(this, 760, 260, { kind: 'narration', text: TEXT.intro, maxWidth: 900, fontSize: 34 });
      this.add.existing(intro.appear(200));
    }
    const consoleBox = new Bubble(this, 1100, 470, { kind: 'narration', text: TEXT.console, maxWidth: 820, fontSize: 32 });
    this.add.existing(consoleBox.appear(900));
    const crack = new SfxWord(this, 620, 640, { text: 'CRACK!', evidence: TEXT.collapse, size: 110, angle: -8 });
    this.add.existing(crack);
    this.time.delayedCall(dur(1500), () => {
      crack.pop();
      impact(this);
    });
    const go = button(this, 960, 900, TEXT.escape, () => this.startEscape(), { fontSize: 40, fill: COLORS.spiritTeal });
    go.setAlpha(0);
    this.tweens.add({ targets: go, alpha: 1, delay: dur(1900), duration: dur(300) });
  }

  /**
   * Pixel scene 10, final script §9. Shot 1: the well lock at 10×, the key turns a quarter
   * (3 frames), the stone drops a pixel row and teal breathes out of the seams, CLICK. Shot 2: the
   * tunnel at 4×, Elias walks under the lantern, everything past ~50 px dithers down to ink by
   * ~180 px. Each shot moves on by itself or on a click / Space; then the archive proper.
   */
  private wellBeat(data: ArchiveData) {
    const calm = comicSettings.reduceMotion;
    const shots = [calm ? 2400 : 3600, calm ? 2400 : 5600];
    let shot = -1;
    let layer: Phaser.GameObjects.Container | undefined;
    let timer: Phaser.Time.TimerEvent | undefined;
    const next = () => {
      timer?.remove();
      layer?.destroy();
      shot++;
      if (shot >= shots.length) {
        gameState.setFlag('wellOpened');
        this.input.keyboard?.off('keydown-SPACE', next);
        this.scene.restart(data);
        return;
      }
      layer = this.add.container(0, 0);
      if (shot === 0) this.wellLock(layer, calm);
      else this.tunnel(layer, calm);
      timer = this.time.delayedCall(shots[shot], next);
    };
    this.add.rectangle(0, 0, 1920, 1080, 0x000000, 0).setOrigin(0).setDepth(100).setInteractive().on('pointerup', next);
    this.input.keyboard?.on('keydown-SPACE', next);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown-SPACE', next));
    next();
  }

  private wellLock(layer: Phaser.GameObjects.Container, calm: boolean) {
    const st = new PixelStage(this, layer, { x: 0, y: 0, w: 1920, h: 1080 }, 192, 108);
    st.image('bg_well_lock').setName('pixel:bg_well_lock');
    const key = st.sprite('prop_key_turn', 84, 44, 0, 0, calm ? 2 : 0).setName('pixel:key');
    const seams = [18, 91].map((y) => {
      const r = this.add.rectangle(st.at(58, y).x, st.at(58, y).y, 77 * st.scale, st.scale, COLORS.spiritTeal).setOrigin(0).setAlpha(0);
      layer.add(r);
      return r;
    });
    const turned = () => {
      key.setFrame(2).setY(st.at(84, 45).y); // the stone (and the key in it) drops one row
      for (const s of seams) this.tweens.add({ targets: s, alpha: { from: 0.9, to: 0.35 }, duration: 900, yoyo: true, repeat: -1 });
      const click = new SfxWord(this, 1380, 300, { text: TEXT.wellSfx, evidence: '', size: 96, angle: -6 });
      click.disableInteractive();
      layer.add(click);
      if (!calm) impact(this);
    };
    if (calm) turned();
    else {
      this.time.delayedCall(1500, () => key.active && key.setFrame(1));
      this.time.delayedCall(1800, () => key.active && turned());
    }
    layer.add(new Bubble(this, 960, 930, { kind: 'narration', text: TEXT.well, maxWidth: 1000, fontSize: 34 }).appear(calm ? 0 : 2100));
  }

  private tunnel(layer: Phaser.GameObjects.Container, calm: boolean) {
    const st = new PixelStage(this, layer, { x: 0, y: 0, w: 1920, h: 1080 });
    st.image('bg_tunnel').setName('pixel:bg_tunnel');
    const FEET = 198;
    const [X0, X1] = [-20, 380];
    if (!this.anims.exists('elias_walk')) {
      this.anims.create({ key: 'elias_walk', frames: this.anims.generateFrameNumbers(PX('char_elias_walk'), { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
      this.anims.create({ key: 'elias_idle', frames: this.anims.generateFrameNumbers(PX('char_elias_walk'), { start: 4, end: 5 }), frameRate: 2, repeat: -1 });
    }
    const elias = st.sprite('char_elias_walk', calm ? X1 : X0, FEET, 0, 56 / 58).setName('pixel:elias').play(calm ? 'elias_idle' : 'elias_walk');
    const lantern = hasPixel(this, 'prop_lantern') ? st.sprite('prop_lantern', 0, 0, 0.5, 0) : undefined;
    const dark = this.add.image(0, 0, this.darkness()).setScale(st.scale);
    layer.add(dark);
    let ex = calm ? X1 : X0;
    const light = lanternLight(st, () => st.at(ex + 12, FEET - 46), 58);
    layer.add(new Bubble(this, 960, 930, { kind: 'narration', text: TEXT.intro, maxWidth: 1000, fontSize: 34 }).appear(calm ? 0 : 900));
    const t0 = this.time.now;
    const tick = () => {
      const t = this.time.now - t0;
      if (!calm) ex = Math.round(X0 + (X1 - X0) * Phaser.Math.Clamp(t / 5400, 0, 1));
      const p = st.at(ex, FEET);
      elias.setPosition(p.x, p.y);
      if (lantern) {
        const q = st.at(ex + 12, FEET - 52 + (calm ? 0 : Math.round(Math.sin(t / 160))));
        lantern.setPosition(q.x, q.y).setFrame(Math.floor(t / 120) % 3);
      }
      const c = st.at(ex + 12, FEET - 46);
      dark.setPosition(c.x, c.y);
      light(t);
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, tick);
    layer.once(Phaser.GameObjects.Events.DESTROY, () => this.events.off(Phaser.Scenes.Events.UPDATE, tick));
    tick();
  }

  /**
   * The underground darkness around the lantern, at 1× canvas pixels and twice the canvas size so
   * it covers the stage wherever the lantern is: clear to ~50 px, then 4×4 Bayer dither down one
   * step (half ink) and then to solid ink by ~180 px.
   */
  private darkness(): string {
    const key = 'px_fx_tunnel_dark';
    if (this.textures.exists(key)) return key;
    const [w, h] = [960, 540];
    const tex = this.textures.createCanvas(key, w, h)!;
    const ctx = tex.getContext();
    const img = ctx.createImageData(w, h);
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const ink = [(COLORS.ink >> 16) & 255, (COLORS.ink >> 8) & 255, COLORS.ink & 255];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const d = Phaser.Math.Clamp((Math.hypot(x - w / 2, (y - h / 2) * 1.1) - 50) / 130, 0, 1);
        const b = BAYER[(y % 4) * 4 + (x % 4)] / 16;
        const a = b < d * 0.45 ? 255 : b < d * 0.9 ? 140 : 0;
        const i = (y * w + x) * 4;
        img.data.set([ink[0], ink[1], ink[2], a], i);
      }
    }
    ctx.putImageData(img, 0, 0);
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return key;
  }

  private startEscape() {
    if (!hasScene(this, 'Puzzle')) return this.goFinale();
    pageTurn(this, () => this.scene.start('Puzzle', { puzzleId: 'pz_archive', returnTo: 'Archive' }));
  }

  private escapedBeat(fresh: boolean) {
    if (fresh) impact(this);
    const sfx = new SfxWord(this, 960, 190, { text: 'CRASH!', evidence: '', size: 130, angle: 6 });
    this.add.existing(sfx);
    sfx.disableInteractive();
    const box = new Bubble(this, 960, 350, { kind: 'narration', text: TEXT.escaped, maxWidth: 900, fontSize: 36 });
    this.add.existing(box.appear(300));
    // What I carried out: the purge list and the case request beside the apprentice log.
    evidenceOf('archive').forEach((e, i) => {
      const x = i === 0 ? 560 : 1360;
      const word = new SfxWord(this, x, 500, { text: e.sfx, evidence: '', size: 64, angle: i === 0 ? -6 : 5 });
      word.disableInteractive();
      word.setName(`archive:${e.id}`);
      this.add.existing(word);
      const card = new Bubble(this, x, 610, { kind: 'evidence', text: evidence(e.id).text, maxWidth: 560, fontSize: 26 });
      this.add.existing(card.appear(700 + i * 400));
    });
    const p = story.ui.popups.finalReconstruction;
    const pending = hasScene(this, 'Accusation') && !gameState.flag('accused');
    const cue = new Bubble(this, 960, 780, { kind: 'narration', text: pending ? TEXT.question : p.text, maxWidth: 900, fontSize: 30 });
    this.add.existing(cue.appear(1400));
    button(this, 960, 920, p.buttons[0] ?? TEXT.next, () => this.goFinale(), { fontSize: 40 });
  }

  private goFinale() {
    // A2: name who did it first (once); the Finale then plays as the confirmation.
    const next = hasScene(this, 'Accusation') && !gameState.flag('accused') ? 'Accusation' : hasScene(this, 'Finale') ? 'Finale' : 'Village';
    pageTurn(this, () => this.scene.start(next));
  }
}
