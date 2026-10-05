import Phaser from 'phaser';
import { COLORS, FONTS, TEXT_RESOLUTION, comicSettings, dur, pageTurn } from '../comic';
import { gameState } from '../core/GameState';
import { PH } from '../dev/placeholders';
import { TrailState } from '../trail/TrailState';
import {
  CROSSING, DOUBT_TEXT, ENDINGS, LANDMARKS, TUNING,
  type Landmark, type TrailEvent,
} from '../trail/TrailData';
import { H, W, button, hasScene, label, openPause } from './coreUi';
import { buildTrailTextures, LANDMARK_TEX } from './trail/trailArt';
import { TrailAudio } from './trail/trailAudio';

const HOUR_MS = 520; // real time per hour on the road
const PX_PER_MILE = 70; // landmarks scroll in from this far away
const GROUND_Y = 900; // where feet meet the road
const ELIAS_X = 760;
const DEPTH = { world: 0, actors: 10, fg: 20, dark: 30, glow: 31, hud: 40, card: 50 };

type Mode = 'outfit' | 'travel' | 'card' | 'ending';
interface CardChoice {
  label: string;
  onPick: () => void;
  disabled?: boolean;
  kind?: 'light' | 'dark';
}

/** One trail for the whole session, so the pause menu can come and go. */
export const trail = new TrailState();

/**
 * THE ROAD TO VEYRA: a side-scrolling night journey (Oregon Trail) told by a narrator who can't
 * be trusted (Shutter Island). Manage oil, rations and composure; the lantern pool is all you can
 * see; question the ledger; arrive at Veyra knowing — or not knowing — who is pushing the cart.
 */
export class TrailScene extends Phaser.Scene {
  private mode: Mode = 'outfit';
  private clock = 0;
  private layers: { sprite: Phaser.GameObjects.TileSprite; speed: number }[] = [];
  private elias!: Phaser.GameObjects.Image;
  private nia!: Phaser.GameObjects.Image;
  private niaEcho!: Phaser.GameObjects.Image;
  private cart!: Phaser.GameObjects.Container;
  private wheels: Phaser.GameObjects.Image[] = [];
  private landmarkImgs = new Map<string, Phaser.GameObjects.Image>();
  private dark!: Phaser.GameObjects.Image;
  private glow!: Phaser.GameObjects.Image;
  private fog: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private hud!: Phaser.GameObjects.Container;
  private topButtons: Phaser.GameObjects.Container[] = [];
  private hudText!: Record<string, Phaser.GameObjects.Text>;
  private composureBar!: Phaser.GameObjects.Rectangle;
  private paceBtn?: Phaser.GameObjects.Container;
  private lampBtn?: Phaser.GameObjects.Container;
  private card?: Phaser.GameObjects.Container;
  private apparition?: Phaser.GameObjects.GameObject;
  private audio!: TrailAudio;
  private walkT = 0;
  private hudFlicker = 0;

  constructor() {
    super('Trail');
  }

  preload() {
    TrailAudio.preload(this);
    // Kenney Particle Pack (CC0): soft smoke for the fog. Falls back to a drawn blob if missing.
    for (const n of ['smoke_04', 'smoke_07', 'smoke_10']) {
      if (!this.textures.exists(n)) this.load.image(n, `assets/trail/particles/${n}.png`);
    }
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, () => undefined);
  }

  create(data: { fresh?: boolean } = {}) {
    buildTrailTextures(this);
    this.layers = [];
    this.wheels = [];
    this.landmarkImgs.clear();
    this.card = undefined;
    this.apparition = undefined;

    if (data.fresh || !trail.load()) trail.reset();
    (window as unknown as { __trail: TrailState }).__trail = trail; // test hook (tools/shots-trail.ts)

    this.buildWorld();
    this.buildActors();
    this.buildLight();
    this.buildHud();
    this.audio = new TrailAudio(this);
    this.input.keyboard?.on('keydown-ESC', () => openPause(this, 'Trail'));
    this.input.keyboard?.on('keydown-L', () => this.mode === 'travel' && this.openLedger());

    if (trail.s.mile === 0 && trail.s.hours === 0) this.showOutfitter();
    else this.setMode('travel');
    this.cameras.main.fadeIn(dur(900), 0, 0, 0);
  }

  // ======================================================================== world
  private buildWorld() {
    this.add.image(0, 0, 'tr_sky').setOrigin(0).setDepth(DEPTH.world);
    this.add.image(1450, 170, 'tr_moon').setDepth(DEPTH.world).setAlpha(0.85);
    const layer = (key: string, y: number, speed: number, depth = DEPTH.world, alpha = 1) => {
      const tex = this.textures.get(key).getSourceImage();
      const s = this.add.tileSprite(0, y, W, tex.height, key).setOrigin(0, 1).setDepth(depth).setAlpha(alpha);
      this.layers.push({ sprite: s, speed });
      return s;
    };
    layer('tr_hills', 760, 0.08, DEPTH.world, 0.9);
    layer('tr_trees_far', 800, 0.2, DEPTH.world, 0.75);
    layer('tr_poles', 830, 0.45);
    this.add.image(0, GROUND_Y - 80, 'tr_road').setOrigin(0).setDepth(DEPTH.world);
    layer('tr_ruts', 1000, 1.0);
    layer('tr_trees_near', 1080, 1.5, DEPTH.fg);
    layer('tr_grass', 1090, 1.9, DEPTH.fg);

    // Fog: Kenney smoke sprites drifting against the direction of travel.
    const smokes = ['smoke_04', 'smoke_07', 'smoke_10'].filter((k) => this.textures.exists(k));
    const tex = smokes.length ? smokes : ['tr_fogblob'];
    ([[700, DEPTH.world, 0.18], [960, DEPTH.fg + 1, 0.12]] as const).forEach(([y, depth, alpha], i) => {
      const em = this.add.particles(0, 0, tex[i % tex.length], {
        x: { min: 0, max: W + 400 },
        y: { min: y - 120, max: y + 80 },
        lifespan: 14000,
        speedX: { min: -40, max: -15 },
        scale: { min: 1.6, max: 3.2 },
        alpha: { onEmit: () => 0, onUpdate: (_p: Phaser.GameObjects.Particles.Particle, _k: string, t: number) => Math.sin(t * Math.PI) * alpha },
        rotate: { min: 0, max: 360 },
        tint: 0x9fb3b8,
        frequency: 700,
        advance: 14000,
      });
      em.setDepth(depth);
      this.fog.push(em);
    });
  }

  private buildActors() {
    // The narrator: the same black outline that haunts every memory in the main game.
    this.elias = this.add.image(ELIAS_X, GROUND_Y, PH.figure).setOrigin(0.5, 1).setDepth(DEPTH.actors).setScale(0.62);
    // The handcart he pushes, ahead of him.
    this.cart = this.add.container(ELIAS_X + 210, GROUND_Y).setDepth(DEPTH.actors);
    const body = this.add.image(0, -70, 'tr_cart');
    const w1 = this.add.image(-60, -34, 'tr_wheel');
    const w2 = this.add.image(62, -34, 'tr_wheel');
    this.wheels = [w1, w2];
    this.cart.add([body, w1, w2]);
    // Nia walks beside the cart. Whether she is there is the whole question.
    this.nia = this.add.image(ELIAS_X + 400, GROUND_Y + 6, PH.nia).setOrigin(0.5, 1).setDepth(DEPTH.actors + 1).setScale(0.78);
    this.niaEcho = this.add.image(ELIAS_X + 470, GROUND_Y + 6, PH.nia).setOrigin(0.5, 1).setDepth(DEPTH.actors).setScale(0.78).setAlpha(0).setTint(0x9fd6d0);

    for (const lm of LANDMARKS) {
      const img = this.add.image(-9999, GROUND_Y - 40, LANDMARK_TEX[lm.id]).setOrigin(0.5, 1).setDepth(DEPTH.world + 1);
      this.landmarkImgs.set(lm.id, img);
    }
  }

  private buildLight() {
    // One big pre-drawn vignette (a hole of light in the dark) follows the lantern. Cheap to draw.
    this.dark = this.add.image(0, 0, 'tr_dark').setDepth(DEPTH.dark);
    this.glow = this.add.image(0, 0, 'tr_glow').setDepth(DEPTH.glow).setTint(COLORS.amber).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.32);
  }

  /** Lantern sits at the top of Elias's staff (right of his head in the figure art). */
  private lanternPos() {
    return { x: this.elias.x + 70, y: this.elias.y - this.elias.displayHeight * 0.92 };
  }

  // ======================================================================== HUD
  private buildHud() {
    const t = (x: number, y: number, s: string, size = 30, font: string = FONTS.narration) =>
      this.add.text(x, y, s, { fontFamily: `"${font}"`, fontSize: `${size}px`, color: COLORS.inkCss, resolution: TEXT_RESOLUTION });
    this.hud = this.add.container(0, 0).setDepth(DEPTH.hud);
    const panel = this.add.rectangle(24, 20, 900, 150, COLORS.paper).setOrigin(0).setStrokeStyle(5, COLORS.ink);
    const shadow = this.add.rectangle(32, 28, 900, 150, COLORS.ink).setOrigin(0);
    this.hudText = {
      night: t(44, 32, '', 34, FONTS.sfx),
      miles: t(44, 78, ''),
      oil: t(330, 32, ''),
      rations: t(330, 74, ''),
      tonic: t(330, 116, ''),
      coins: t(680, 32, ''),
      doubts: t(680, 74, ''),
    };
    const barBg = this.add.rectangle(44, 136, 260, 18, COLORS.charcoal).setOrigin(0, 0.5).setStrokeStyle(3, COLORS.ink);
    this.composureBar = this.add.rectangle(44, 136, 260, 18, COLORS.spiritTeal).setOrigin(0, 0.5);
    const capt = t(44, 112, 'COMPOSURE', 18, FONTS.sfx);
    this.hud.add([shadow, panel, barBg, this.composureBar, capt, ...Object.values(this.hudText)]);

    const ledger = button(this, W - 470, 60, 'LEDGER', () => this.mode === 'travel' && this.openLedger(), { width: 200, fontSize: 30 });
    const camp = button(this, W - 250, 60, 'MAKE CAMP', () => this.mode === 'travel' && this.openCamp(), { width: 220, fontSize: 30 });
    const menu = button(this, W - 70, 60, '≡', () => openPause(this, 'Trail'), { width: 80, fontSize: 34 });
    this.paceBtn = button(this, 210, H - 60, '', () => this.cyclePace(), { width: 360, fontSize: 28 });
    this.lampBtn = button(this, 600, H - 60, '', () => this.toggleLamp(), { width: 360, fontSize: 28 });
    this.topButtons = [ledger, camp, menu];
    for (const b of [ledger, camp, menu, this.paceBtn, this.lampBtn]) b.setDepth(DEPTH.hud);
    this.refreshHud();
  }

  private setButtonLabel(b: Phaser.GameObjects.Container | undefined, s: string) {
    const txt = b?.getAll().flatMap((c) => (c instanceof Phaser.GameObjects.Container ? c.getAll() : [c])).find((c) => c instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text | undefined;
    txt?.setText(s);
  }

  private refreshHud() {
    const s = trail.s;
    const lie = trail.hallucinating;
    this.hudText.night.setText(`NIGHT ${trail.night}  ·  2:17`);
    this.hudText.miles.setText(`VEYRA: ${trail.shown('miles')} mi`);
    this.hudText.oil.setText(`OIL  ${trail.shown('oil')}`);
    this.hudText.rations.setText(`BREAD  ${trail.shown('rations')}  (for 2)`);
    this.hudText.tonic.setText(`TONIC  ${s.tonic}`);
    this.hudText.coins.setText(`COINS  ${s.coins}`);
    this.hudText.doubts.setText(`DOUBTS  ${'●'.repeat(s.doubts.length)}${'○'.repeat(Math.max(0, TUNING.doubtsForTruth - s.doubts.length))}`);
    this.composureBar.width = 260 * (s.composure / 100);
    this.composureBar.fillColor = s.composure < TUNING.severeBelow ? 0xc0392b : lie ? COLORS.amber : COLORS.spiritTeal;
    for (const k of ['oil', 'rations', 'miles'] as const) {
      const txt = this.hudText[k];
      txt.setColor(lie && this.hudFlicker > 0.5 ? '#8a1f1f' : COLORS.inkCss);
    }
    this.setButtonLabel(this.paceBtn, `PACE: ${s.pace.toUpperCase()}`);
    this.setButtonLabel(this.lampBtn, `LANTERN: ${trail.dark ? 'NO OIL' : s.lantern.toUpperCase()}`);
  }

  private cyclePace() {
    if (this.mode !== 'travel') return;
    const order = ['steady', 'strenuous', 'grueling'] as const;
    trail.s.pace = order[(order.indexOf(trail.s.pace) + 1) % order.length];
    this.audio.click();
    this.refreshHud();
  }
  private toggleLamp() {
    if (this.mode !== 'travel') return;
    trail.s.lantern = trail.s.lantern === 'dim' ? 'bright' : 'dim';
    this.audio.click();
    this.refreshHud();
  }

  // ======================================================================== loop
  update(_t: number, delta: number) {
    const moving = this.mode === 'travel';
    const speed = moving ? TUNING.milesPerHour[trail.s.pace] / 3 : 0;
    const px = speed * delta * 0.42;
    for (const l of this.layers) l.sprite.tilePositionX += px * l.speed;
    for (const w of this.wheels) w.rotation += px * 0.02;

    // Walk cycle: a paper-cutout bob and lean, synced to footsteps.
    if (moving) this.walkT += delta * 0.006 * Math.max(0.6, speed);
    const bob = moving ? Math.abs(Math.sin(this.walkT)) * 9 : 0;
    this.elias.y = GROUND_Y - bob;
    this.elias.rotation = moving ? Math.sin(this.walkT) * 0.025 + 0.04 : 0;
    this.cart.y = GROUND_Y - (moving ? Math.abs(Math.sin(this.walkT * 0.5)) * 3 : 0);
    this.nia.y = GROUND_Y + 6 - (moving ? Math.abs(Math.sin(this.walkT + 1.3)) * 8 : 0);
    if (moving && Math.floor(this.walkT / Math.PI) !== Math.floor((this.walkT - delta * 0.006 * Math.max(0.6, speed)) / Math.PI)) this.audio.step();

    // Nia: steady when you are, a flicker and an echo when you are not.
    const hall = trail.hallucinating;
    const flick = hall && !comicSettings.reduceFlashing ? (Math.random() < (trail.severe ? 0.12 : 0.04) ? 0.15 : 0.9) : 1;
    this.nia.setAlpha(this.mode === 'ending' ? this.nia.alpha : flick);
    this.niaEcho.setAlpha(hall ? 0.25 + Math.sin(this.time.now / 700) * 0.15 : 0);
    if (hall && !comicSettings.reduceMotion) this.cameras.main.setRotation(Math.sin(this.time.now / 1900) * (trail.severe ? 0.012 : 0.005));
    else this.cameras.main.setRotation(0);

    // Landmarks scroll in from the right as you get close.
    for (const lm of LANDMARKS) {
      const img = this.landmarkImgs.get(lm.id)!;
      img.x = ELIAS_X + 520 + (lm.mile - trail.s.mile) * PX_PER_MILE;
      img.setVisible(img.x > -800 && img.x < W + 800);
    }

    this.drawLight();
    this.hudFlicker = (this.hudFlicker + delta / 600) % 1;

    if (moving) {
      this.clock += delta;
      if (this.clock >= HOUR_MS) {
        this.clock -= HOUR_MS;
        this.tick();
      }
    }
  }

  private drawLight() {
    const { x, y } = this.lanternPos();
    const lvl = trail.lightLevel;
    const flick = comicSettings.reduceFlashing ? 1 : 0.96 + Math.random() * 0.06;
    const scale = (1 + lvl * 0.9) * flick;
    // The hole is centred between the lantern and the cart so both stay in the pool.
    this.dark.setPosition(x + 140, y + 220).setScale(scale);
    this.dark.setAlpha(trail.dark ? 1 : 0.92);
    this.glow.setPosition(x, y).setScale(scale * 0.9).setAlpha(trail.dark ? 0.05 : 0.18 + lvl * 0.16);
  }

  private tick() {
    const res = trail.travelHour();
    this.refreshHud();
    if (res.nightEnded) this.audio.creak();
    if (res.lost) return this.lost();
    if (res.landmark) return this.arrive(res.landmark);
    if (res.event) return this.showEvent(res.event);
  }

  private setMode(m: Mode) {
    this.mode = m;
    this.audio.walking(m === 'travel');
    this.paceBtn?.setVisible(m === 'travel');
    this.lampBtn?.setVisible(m === 'travel');
  }

  // ======================================================================== cards
  private showCard(title: string, body: string, choices: CardChoice[], opts: { art?: TrailEvent['art'] } = {}) {
    this.closeCard();
    this.setMode('card');
    this.showApparition(opts.art);
    const c = this.add.container(W / 2, 0).setDepth(DEPTH.card);
    const width = 1180;
    const bodyText = this.add
      .text(0, 0, body, {
        fontFamily: `"${FONTS.narration}"`,
        fontSize: '30px',
        color: COLORS.inkCss,
        wordWrap: { width: width - 90 },
        lineSpacing: 8,
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0);
    const titleText = label(this, 0, 0, title, 52).setOrigin(0.5, 0);
    const btnH = 74;
    const height = 60 + titleText.height + 20 + bodyText.height + 40 + choices.length * (btnH + 16) + 20;
    const top = Math.min(200, H - 40 - height); // high on screen, so whatever is on the road stays visible
    c.add(this.add.rectangle(10, top + 10, width, height, COLORS.ink).setOrigin(0.5, 0));
    c.add(this.add.rectangle(0, top, width, height, COLORS.paper).setOrigin(0.5, 0).setStrokeStyle(6, COLORS.ink));
    titleText.setY(top + 26);
    bodyText.setY(titleText.y + titleText.height + 18);
    c.add([titleText, bodyText]);
    let by = bodyText.y + bodyText.height + 40 + btnH / 2;
    for (const ch of choices) {
      const b = button(this, 0, by, ch.label, () => {
        if (ch.disabled) return;
        this.audio.click();
        ch.onPick();
      }, { width: 640, fontSize: 32, fill: ch.kind === 'dark' ? 0x3a3a42 : ch.kind === 'light' ? 0xffe6a3 : undefined });
      if (ch.disabled) b.setAlpha(0.4);
      c.add(b);
      by += btnH + 16;
    }
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: dur(220) });
    this.card = c;
  }

  private closeCard() {
    this.card?.destroy();
    this.card = undefined;
    this.clearApparition();
  }

  private result(title: string, text: string, then: () => void = () => this.resume()) {
    this.refreshHud();
    this.showCard(title, text, [{ label: 'CONTINUE', onPick: then }]);
  }

  private resume() {
    this.closeCard();
    this.refreshHud();
    this.setMode('travel');
  }

  /** Something standing in the road ahead while an event card is open. */
  private showApparition(art?: TrailEvent['art']) {
    this.clearApparition();
    const x = 1500, y = GROUND_Y + 10;
    let obj: Phaser.GameObjects.GameObject | undefined;
    if (art === 'figure') obj = this.add.image(x, y, PH.figure).setOrigin(0.5, 1).setScale(0.6).setFlipX(true).setAlpha(0.85);
    else if (art === 'woman') obj = this.add.image(x, y, this.textures.exists('ph_leela') ? 'ph_leela' : PH.mira).setOrigin(0.5, 1).setScale(0.65).setTint(0xb9c7cc).setAlpha(0.7);
    else if (art === 'child') obj = this.add.image(x, y, PH.nia).setOrigin(0.5, 1).setScale(0.8).setTint(0xdfe9ea).setAlpha(0.6);
    else if (art === 'crows') obj = this.add.image(x, 420, 'tr_crows').setAlpha(0.95);
    else if (art === 'lights') obj = this.add.image(x, y - 120, 'tr_glow').setTint(0xe8f0ff).setBlendMode(Phaser.BlendModes.ADD).setScale(1.2).setAlpha(0.5);
    if (obj) {
      (obj as Phaser.GameObjects.Image).setDepth(DEPTH.glow + 1);
      if (!comicSettings.reduceMotion) this.tweens.add({ targets: obj, alpha: { from: 0, to: (obj as Phaser.GameObjects.Image).alpha }, duration: dur(900) });
      this.apparition = obj;
    }
  }
  private clearApparition() {
    this.apparition?.destroy();
    this.apparition = undefined;
  }

  // ======================================================================== outfitter
  private showOutfitter() {
    this.setMode('outfit');
    const lm = LANDMARKS[0];
    const items = [
      { key: 'oil' as const, name: 'LAMP OIL', note: 'Light keeps you steady. Darkness does not.' },
      { key: 'rations' as const, name: 'BREAD', note: 'For two, the ledger says.' },
      { key: 'tonic' as const, name: "DR. HALE'S TONIC", note: 'Calms the nerves. Clouds the memory.' },
    ];
    const render = () => {
      this.closeCard();
      this.setMode('outfit');
      const c = this.add.container(0, 0).setDepth(DEPTH.card);
      const x0 = 420, y0 = 230, w = 1080, h = 640;
      c.add(this.add.rectangle(x0 + 10, y0 + 10, w, h, COLORS.ink).setOrigin(0));
      c.add(this.add.rectangle(x0, y0, w, h, COLORS.paper).setOrigin(0).setStrokeStyle(6, COLORS.ink));
      c.add(label(this, x0 + w / 2, y0 + 24, lm.name + ' — OUTFITTER', 54).setOrigin(0.5, 0));
      c.add(this.add.text(x0 + 50, y0 + 100, `${lm.arrive}\nNia: “${lm.nia}”`, { fontFamily: `"${FONTS.narration}"`, fontSize: '26px', color: COLORS.inkCss, wordWrap: { width: w - 100 }, resolution: TEXT_RESOLUTION }));
      items.forEach((it, i) => {
        const y = y0 + 250 + i * 95;
        const price = TUNING.prices[it.key];
        c.add(this.add.text(x0 + 50, y - 22, `${it.name}  ·  ${price}c`, { fontFamily: `"${FONTS.sfx}"`, fontSize: '36px', color: COLORS.inkCss, resolution: TEXT_RESOLUTION }));
        c.add(this.add.text(x0 + 50, y + 16, it.note, { fontFamily: `"${FONTS.hand}"`, fontSize: '28px', color: '#5b4a3a', resolution: TEXT_RESOLUTION }));
        c.add(button(this, x0 + 640, y, '−', () => { if (trail.sell(it.key)) { this.audio.click(); render(); } }, { width: 70, fontSize: 36 }));
        c.add(this.add.text(x0 + 740, y, String(trail.s[it.key]), { fontFamily: `"${FONTS.sfx}"`, fontSize: '44px', color: COLORS.inkCss, resolution: TEXT_RESOLUTION }).setOrigin(0.5));
        c.add(button(this, x0 + 840, y, '+', () => { if (trail.buy(it.key)) { this.audio.click(); render(); } }, { width: 70, fontSize: 36 }));
        c.add(button(this, x0 + 950, y, '+5', () => { if (trail.buy(it.key, 5)) { this.audio.click(); render(); } }, { width: 90, fontSize: 30 }));
      });
      c.add(this.add.text(x0 + 50, y0 + h - 80, `COINS LEFT: ${trail.s.coins}   (the river ferry costs ${CROSSING.ferry.cost})`, { fontFamily: `"${FONTS.sfx}"`, fontSize: '34px', color: COLORS.inkCss, resolution: TEXT_RESOLUTION }));
      c.add(button(this, x0 + w - 170, y0 + h - 60, 'SET OUT ▸', () => {
        if (trail.s.oil === 0 && !this.registry.get('trail_warned_oil')) {
          this.registry.set('trail_warned_oil', true);
          this.result('NO OIL?', 'Nia tugs your sleeve. “Eli. You can’t see the road without light.”', () => render());
          return;
        }
        trail.s.nextEventMile = 6; // leaving the ferry
        trail.saveCheckpoint();
        this.closeCard();
        this.refreshHud();
        this.setMode('travel');
      }, { width: 280, fontSize: 36, fill: 0xffe6a3 }));
      this.card = c;
      this.refreshHud();
    };
    render();
  }

  // ======================================================================== events
  private showEvent(ev: TrailEvent) {
    this.audio.sting();
    const body = ev.phantom && trail.severe ? ev.text.replace(/\./g, '…') : ev.text;
    this.showCard(
      ev.title,
      body,
      ev.choices.map((ch, i) => ({
        label: ch.label,
        disabled: !trail.canChoose(ch),
        onPick: () => {
          const before = trail.s.doubts.length;
          const text = trail.choose(ev, i);
          const doubt = trail.s.doubts.length > before ? `\n\nDOUBT: ${DOUBT_TEXT[trail.s.doubts[trail.s.doubts.length - 1]]}` : '';
          this.result(ev.title, text + doubt);
        },
      })),
      { art: ev.art },
    );
  }

  private arrive(lm: Landmark) {
    this.audio.bell(lm.id === 'veyra');
    if (lm.id === 'veyra') return this.ending();
    const line = trail.hallucinating ? lm.niaGlitch : lm.nia;
    const choices: CardChoice[] = [];
    if (lm.crossing) choices.push({ label: 'CROSS THE RIVER', onPick: () => this.crossing(lm) });
    else {
      if (lm.search && !trail.s.flags[lm.search.once]) {
        choices.push({ label: 'SEARCH', onPick: () => this.result(lm.name, trail.search(lm) + this.newDoubtNote(), () => this.arrive(lm)) });
      }
      choices.push({ label: 'MAKE CAMP', onPick: () => this.openCamp(() => this.arrive(lm)) });
      choices.push({ label: 'MOVE ON', onPick: () => { trail.depart(); this.resume(); } });
    }
    this.showCard(lm.name, `${lm.arrive}\n\nNia: “${line}”`, choices);
  }

  private lastDoubtCount = 0;
  private newDoubtNote(): string {
    const n = trail.s.doubts.length;
    const note = n > this.lastDoubtCount ? `\n\nDOUBT: ${DOUBT_TEXT[trail.s.doubts[n - 1]]}` : '';
    this.lastDoubtCount = n;
    return note;
  }

  private crossing(lm: Landmark) {
    this.lastDoubtCount = trail.s.doubts.length;
    const go = (how: 'ford' | 'float' | 'ferry') => {
      const r = trail.cross(how);
      if (how === 'ferry' && !r.ok) return this.result(CROSSING.title, r.text, () => this.crossing(lm));
      this.result(CROSSING.title, r.text + this.newDoubtNote(), () => { trail.depart(); this.resume(); });
    };
    this.showCard(CROSSING.title, CROSSING.text, [
      { label: CROSSING.ford.label, onPick: () => go('ford') },
      { label: CROSSING.float.label, onPick: () => go('float') },
      { label: CROSSING.ferry.label, onPick: () => go('ferry'), disabled: trail.s.coins < CROSSING.ferry.cost },
    ], { art: 'figure' });
  }

  // ======================================================================== camp & ledger
  private openCamp(back: () => void = () => this.resume()) {
    this.lastDoubtCount = trail.s.doubts.length;
    this.showCard('CAMP', trail.hallucinating ? 'The fire won’t catch. Nia’s face is very still in the lantern light.' : 'You pull the cart off the road. Nia sits on the shaft and swings her feet.', [
      { label: `REST (−${TUNING.rest.rations} BREAD)`, onPick: () => this.result('CAMP', trail.rest(), () => this.openCamp(back)), disabled: trail.s.rations < TUNING.rest.rations },
      { label: `DRINK TONIC (${trail.s.tonic})`, kind: 'dark', onPick: () => this.result('TONIC', trail.drinkTonic(), () => this.openCamp(back)), disabled: trail.s.tonic <= 0 },
      { label: 'READ THE LEDGER', onPick: () => this.openLedger(() => this.openCamp(back)) },
      { label: 'BACK ON THE ROAD', onPick: back, kind: 'light' },
    ]);
  }

  private openLedger(back: () => void = () => this.resume()) {
    this.closeCard();
    this.setMode('card');
    this.audio.page();
    const c = this.add.container(0, 0).setDepth(DEPTH.card);
    const x0 = 260, y0 = 120, w = 1400, h = 860;
    c.add(this.add.rectangle(0, 0, W, H, COLORS.ink, 0.5).setOrigin(0).setInteractive());
    c.add(this.add.rectangle(x0 + 12, y0 + 12, w, h, COLORS.ink).setOrigin(0));
    c.add(this.add.rectangle(x0, y0, w, h, 0xefe3c4).setOrigin(0).setStrokeStyle(6, COLORS.ink));
    c.add(label(this, x0 + 40, y0 + 22, 'THE LEDGER', 54));
    c.add(this.add.text(x0 + 330, y0 + 40, 'in my own hand', { fontFamily: `"${FONTS.hand}"`, fontSize: '34px', color: '#5b4a3a', resolution: TEXT_RESOLUTION }));
    const entries = trail.s.ledger.map((l, i) => ({ l, i })).slice(-9);
    entries.forEach(({ l, i }, k) => {
      const y = y0 + 120 + k * 62;
      const txt = l.redacted ? '█████████████  ██████  ███████████' : l.text;
      const t = this.add.text(x0 + 40, y, txt, { fontFamily: `"${FONTS.hand}"`, fontSize: '32px', color: l.questioned ? '#8a1f1f' : COLORS.inkCss, wordWrap: { width: w - 380 }, resolution: TEXT_RESOLUTION });
      if (l.questioned) t.setText(`${txt}  ✗`);
      c.add(t);
      if (l.questionable && !l.questioned && !l.redacted) {
        c.add(button(this, x0 + w - 150, y + 18, 'QUESTION IT', () => {
          const before = trail.s.doubts.length;
          const msg = trail.questionEntry(i);
          const note = trail.s.doubts.length > before ? `\n\nDOUBT: ${DOUBT_TEXT[trail.s.doubts[trail.s.doubts.length - 1]]}` : '';
          c.destroy();
          this.result('THE LEDGER', msg + note, () => this.openLedger(back));
        }, { width: 230, fontSize: 26 }));
      }
    });
    const doubts = trail.s.doubts.length
      ? trail.s.doubts.map((d) => `• ${DOUBT_TEXT[d]}`).join('\n')
      : 'Nothing seems wrong. Nothing at all.';
    c.add(this.add.text(x0 + 40, y0 + h - 210, `WHAT DOESN’T ADD UP (${trail.s.doubts.length}/${TUNING.doubtsForTruth}):\n${doubts}`, { fontFamily: `"${FONTS.narration}"`, fontSize: '24px', color: '#3b2f25', wordWrap: { width: w - 320 }, resolution: TEXT_RESOLUTION }));
    c.add(button(this, x0 + w - 150, y0 + h - 60, 'CLOSE', () => { c.destroy(); this.card = undefined; back(); }, { width: 200, fontSize: 32 }));
    this.card = c;
  }

  // ======================================================================== lost & ending
  private lost() {
    this.audio.sting();
    const e = ENDINGS.lost;
    this.cameras.main.shake(dur(500), 0.004);
    this.showCard(e.title, e.lines.join('\n'), [
      { label: 'WAKE UP', onPick: () => { trail.restoreCheckpoint(); this.resume(); } },
    ]);
  }

  private ending() {
    this.setMode('ending');
    this.closeCard();
    this.hud.setVisible(false);
    this.topButtons.forEach((b) => b.setVisible(false));
    const kind = trail.ending;
    const e = ENDINGS[kind];
    const lines = this.add.container(0, 0).setDepth(DEPTH.card);
    const veil = this.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0).setDepth(DEPTH.card - 1);
    this.tweens.add({ targets: veil, fillAlpha: 0.55, duration: dur(1500) });
    if (kind === 'truth') {
      // The light finally reaches the cart: nobody is walking beside it.
      this.tweens.add({ targets: [this.nia, this.niaEcho], alpha: 0, duration: dur(2400), delay: dur(1200) });
      const clip = this.add.image(this.cart.x, GROUND_Y - 120, 'tr_hairclip').setDepth(DEPTH.glow + 1).setAlpha(0);
      this.tweens.add({ targets: clip, alpha: 1, duration: dur(800), delay: dur(3200) });
    } else {
      this.tweens.add({ targets: this.nia, x: W + 200, duration: dur(3500), ease: 'Sine.In', delay: dur(800) });
    }
    lines.add(label(this, W / 2, 140, e.title, 96).setOrigin(0.5));
    e.lines.forEach((ln, i) => {
      const t = this.add.text(W / 2, 290 + i * 70, ln, { fontFamily: `"${FONTS.narration}"`, fontSize: '38px', color: COLORS.paperCss, resolution: TEXT_RESOLUTION }).setOrigin(0.5).setAlpha(0);
      t.setShadow(3, 3, '#000', 0, true, true);
      lines.add(t);
      this.tweens.add({ targets: t, alpha: 1, duration: dur(900), delay: dur(1500 + i * 1400) });
    });
    const doubts = trail.s.doubts.length;
    const sub = this.add.text(W / 2, 600, `Doubts held: ${doubts}/${TUNING.doubtsForTruth}${kind === 'denial' ? '  ·  Some things on the road could have told you more.' : ''}`, { fontFamily: `"${FONTS.hand}"`, fontSize: '32px', color: COLORS.amberCss, resolution: TEXT_RESOLUTION }).setOrigin(0.5).setAlpha(0);
    lines.add(sub);
    this.tweens.add({ targets: sub, alpha: 1, duration: dur(800), delay: dur(1500 + e.lines.length * 1400) });
    this.time.delayedCall(dur(1800 + e.lines.length * 1400), () => {
      const next = hasScene(this, 'Opening') ? 'Opening' : 'Village';
      lines.add(button(this, W / 2 - 330, 720, 'ENTER VEYRA ▸', () => {
        TrailState.wipe();
        gameState.newGame();
        pageTurn(this, () => this.scene.start(next));
      }, { width: 380, fontSize: 38, fill: 0xffe6a3 }));
      lines.add(button(this, W / 2 + 90, 720, 'WALK IT AGAIN', () => { TrailState.wipe(); this.scene.restart({ fresh: true }); }, { width: 300, fontSize: 34 }));
      lines.add(button(this, W / 2 + 400, 720, 'TITLE', () => pageTurn(this, () => this.scene.start('Title')), { width: 200, fontSize: 34 }));
    });
  }
}
