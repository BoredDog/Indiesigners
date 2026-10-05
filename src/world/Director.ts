// Runs the story-mode script against the side-view world. Episodes are plain async functions:
//   await d.say('Ivy', 'Someone rang the bell.');
//   const i = await d.choice(['Who are you?', 'I can help.', '...'], { timer: 8 });   // timed, MCSM-style
//   d.remember('Ivy');                                                            // "Ivy will remember that."
//   const ok = await d.qte.mash('PUSH THE BOAT OFF');                             // quick-time event
//   await d.explore([spot, spot], () => done);                                    // free roam until done
import Phaser from 'phaser';
import type { StoryScene, Npc } from '../scenes/StoryScene';
import { ZOOM } from './tiles';
import { StoryAudio, type SoundKey } from '../story/audio';
import { Qte } from '../story/qte';
import { comicSettings } from '../comic';
import { H, W, label } from '../scenes/coreUi';
import { PANEL, panel, pbutton, ptext } from './ui';
import { NODES, openBoard } from './board';

export interface StorySave {
  episode: number;
  flags: Record<string, number | boolean | string>;
  found: string[]; // evidence-board node ids
  remembered: string[];
}
export class Abort extends Error {}

export interface Spot {
  id: string;
  x: number; // world px
  y: number; // world px (feet level)
  label: string;
  when?: () => boolean;
  run: () => Promise<void | 'done'>;
}
export interface Episode {
  n: string;
  title: string;
  run: (d: Director) => Promise<void>;
}

const PORTRAIT: Record<string, string> = {
  Elias: 'pt_elias_hatman', 'Young Elias': 'pt_elias_hatman', Ivy: 'pt_ivy', Luke: 'pt_luke', Hanna: 'pt_hanna', 'The woman': 'pt_hanna',
};

/** UI lives in its own unzoomed scene, above the zoomed pixel world. */
export class StoryUIScene extends Phaser.Scene {
  constructor() {
    super('StoryUI');
  }
  create() {
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
  }
}

export class Director {
  world: StoryScene;
  scene: Phaser.Scene; // UI scene (QTEs draw here)
  audio: StoryAudio;
  qte: Qte;
  save: StorySave;
  lastDt = 16;
  alive = true;
  autoWalk?: number;
  busyUi = false;
  pointerOnUi = false;
  private onSave: (s: StorySave) => void;
  private waiters: (() => boolean)[] = [];
  private spots: Spot[] = [];
  private exploring?: { done: () => boolean; finish: (id: string) => void; busy: boolean };
  private prompt: Phaser.GameObjects.Container;
  private promptText: Phaser.GameObjects.Text;
  private objectiveBox: Phaser.GameObjects.Container;
  private memoryFx: Phaser.GameObjects.GameObject[] = [];
  private badge!: Phaser.GameObjects.Text;
  private unseen = 0;
  private marks: Phaser.GameObjects.Text[] = [];
  private boardOpen = false;
  private closeBoard?: () => void;

  constructor(world: StoryScene, ui: Phaser.Scene, save: StorySave, onSave: (s: StorySave) => void) {
    this.world = world;
    this.scene = ui;
    this.save = save;
    this.onSave = onSave;
    this.audio = new StoryAudio(world);
    this.qte = new Qte(this);
    world.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (this.alive = false));

    this.promptText = ptext(ui, 0, 0, '', 34, '#ffe08a').setOrigin(0.5);
    const bg = ui.add.graphics();
    this.prompt = ui.add.container(0, 0, [bg, this.promptText]).setVisible(false).setDepth(10);
    this.prompt.setData('bg', bg);
    this.objectiveBox = ui.add.container(30, 30).setDepth(10);

    const cb = pbutton(ui, W - 190, 50, 320, 64, 'EVIDENCE BOARD [C]', () => this.openCasebook(), 32).setDepth(10);
    cb.on('pointerover', () => (this.pointerOnUi = true)).on('pointerout', () => (this.pointerOnUi = false));
    this.badge = ptext(ui, W - 40, 22, '', 30, '#ffe08a').setOrigin(1, 0).setDepth(11);
    ui.input.keyboard?.on('keydown-C', () => (this.boardOpen ? this.closeBoard?.() : this.openCasebook()));
    ui.input.keyboard?.on('keydown-E', () => this.tryInteract());
    this.prompt.setSize(300, 60).setInteractive({ useHandCursor: true }).on('pointerup', () => this.tryInteract());
    this.prompt.on('pointerover', () => (this.pointerOnUi = true)).on('pointerout', () => (this.pointerOnUi = false));
    world.events.on(Phaser.Scenes.Events.PAUSE, () => ui.scene.pause());
    world.events.on(Phaser.Scenes.Events.RESUME, () => ui.scene.resume());
  }

  // ---------------------------------------------------------------- running
  async run(episodes: Episode[]) {
    try {
      while (this.save.episode < episodes.length) {
        const ep = episodes[this.save.episode];
        this.lock();
        await this.episodeCard(ep.n, ep.title);
        await ep.run(this);
        this.memory(false);
        this.save.episode++;
        this.onSave(this.save);
      }
      await this.summary();
    } catch (e) {
      if (!(e instanceof Abort)) throw e;
    }
  }

  update(dt: number) {
    this.lastDt = dt;
    this.waiters = this.waiters.filter((w) => !w());
    // Interaction prompt over the nearest usable spot.
    const s = this.nearestSpot();
    if (s && this.exploring && !this.exploring.busy && !this.busyUi) {
      const p = this.toScreen(s.x, s.y - 62);
      this.promptText.setText(`[E] ${s.label}`);
      const g = this.prompt.getData('bg') as Phaser.GameObjects.Graphics;
      const w = this.promptText.width + 30;
      g.clear().fillStyle(PANEL.fill, 0.85).fillRoundedRect(-w / 2, -26, w, 52, 8).lineStyle(2, 0xffe08a, 1).strokeRoundedRect(-w / 2, -26, w, 52, 8);
      this.prompt.setPosition(p.x, p.y).setVisible(true).setSize(w, 52);
    } else this.prompt.setVisible(false);
    // "!" over everything still worth checking (Terraria quest-marker style).
    const open = this.exploring && !this.exploring.busy && !this.busyUi ? this.spots.filter((sp) => (!sp.when || sp.when()) && sp !== s) : [];
    while (this.marks.length < open.length) this.marks.push(ptext(this.scene, 0, 0, '!', 54, '#ffe08a').setOrigin(0.5).setDepth(9));
    this.marks.forEach((m, i) => {
      const sp = open[i];
      if (!sp) return void m.setVisible(false);
      const p = this.toScreen(sp.x, sp.y - 70);
      m.setPosition(p.x, p.y + Math.sin(this.world.time.now / 250 + i) * 6).setVisible(p.x > 0 && p.x < W && p.y > 0 && p.y < H);
    });
  }

  until(test: () => boolean): Promise<void> {
    return new Promise((res, rej) =>
      this.waiters.push(() => {
        if (!this.alive) return rej(new Abort()), true;
        return test() ? (res(), true) : false;
      }),
    );
  }
  wait(ms: number): Promise<void> {
    const speed = comicSettings.reduceMotion ? 0.5 : 1;
    return new Promise((res, rej) => this.world.time.delayedCall(Math.max(1, ms * speed), () => (this.alive ? res() : rej(new Abort()))));
  }

  // ---------------------------------------------------------------- world helpers
  toScreen(x: number, y: number) {
    const v = this.world.cameras.main.worldView;
    return { x: (x - v.x) * ZOOM, y: (y - v.y) * ZOOM };
  }
  lock() {
    this.world.locked = true;
  }
  unlock() {
    this.world.locked = false;
  }
  get player() {
    return this.world.player;
  }
  get a() {
    return this.world.world.anchors;
  }
  /** Elias walks to a world x (he keeps physics, so he follows the ground). */
  async walkTo(x: number) {
    this.autoWalk = x;
    await this.until(() => this.autoWalk === undefined);
  }
  face(dir: 1 | -1) {
    this.world.facing = dir;
  }
  teleport(x: number, y: number) {
    this.player.setPosition(x, y - 2);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.world.cameras.main.centerOn(x, y - 40);
  }
  npc(base: Npc['base'], x: number, y: number, opts: { ghost?: boolean; flip?: boolean; tint?: number } = {}) {
    return this.world.npc(base, x, y, opts);
  }
  /** Walk an NPC to x at `speed` px/s (plays its walk cycle). */
  npcWalk(n: Npc, x: number, speed = 60): Promise<void> {
    const dist = Math.abs(x - n.sprite.x);
    const animated = !['figure', 'ivy', 'luke', 'hanna'].includes(n.base);
    if (animated) n.sprite.play(`${n.base}_walk`);
    n.sprite.setFlipX(x < n.sprite.x);
    return new Promise((res) =>
      this.world.tweens.add({
        targets: n.sprite, x, duration: (dist / speed) * 1000,
        onComplete: () => { if (n.sprite.active && animated) n.sprite.play(`${n.base}_idle`); res(); },
      }),
    );
  }
  fadeNpc(n: Npc, to = 0, ms = 1400): Promise<void> {
    return new Promise((res) => this.world.tweens.add({ targets: n.sprite, alpha: to, duration: ms, onComplete: () => res() }));
  }
  async pan(x: number, y: number, ms = 1200) {
    const cam = this.world.cameras.main;
    cam.stopFollow();
    cam.pan(x, y, ms, 'Sine.easeInOut');
    await this.wait(ms + 50);
  }
  follow() {
    this.world.cameras.main.startFollow(this.player, true, 0.12, 0.12, 0, 30);
  }
  flag(k: string, v: number | boolean | string = true) {
    this.save.flags[k] = v;
    this.onSave(this.save);
  }
  has(k: string) {
    return !!this.save.flags[k];
  }
  sfx(k: SoundKey, v = 0.5, detune = 0) {
    this.audio.play(k, v, detune);
  }
  shake(ms = 300, k = 0.006) {
    if (!comicSettings.reduceMotion) this.world.cameras.main.shake(ms, k);
  }
  flash(ms = 400, r = 255, g = 255, b = 255) {
    if (!comicSettings.reduceFlashing) this.world.cameras.main.flash(ms, r, g, b);
  }
  async glitch(times = 2) {
    this.audio.tone('glitch');
    for (let i = 0; i < times; i++) {
      this.shake(140, 0.01);
      this.flash(90, 120, 220, 255);
      await this.wait(180);
    }
  }
  async fadeOut(ms = 700) {
    this.world.cameras.main.fadeOut(ms, 0, 0, 0);
    await this.wait(ms + 50);
  }
  async fadeIn(ms = 700) {
    this.world.cameras.main.fadeIn(ms, 0, 0, 0);
    await this.wait(ms / 2);
  }
  /** Comic SFX lettering at a world position. */
  async sfxWord(text: string, x?: number, y?: number) {
    const p = x !== undefined && y !== undefined ? this.toScreen(x, y) : { x: W / 2, y: H * 0.3 };
    const t = label(this.scene, p.x, Phaser.Math.Clamp(p.y, 120, H - 300), text, 110, { color: '#e8fbff', strokeThickness: 16 }).setOrigin(0.5).setAngle(-6).setScale(0.6).setDepth(30);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.Out' });
    this.scene.tweens.add({ targets: t, alpha: 0, delay: 900, duration: 500, onComplete: () => t.destroy() });
    await this.wait(450);
  }
  /** Memory echo: teal-tinted dark, scanlines, desaturated. */
  memory(on: boolean) {
    this.memoryFx.forEach((o) => o.destroy());
    this.memoryFx = [];
    const cam = this.world.cameras.main;
    cam.postFX?.clear();
    if (on) {
      cam.postFX?.addColorMatrix().saturate(-0.6);
      cam.postFX?.addVignette(0.5, 0.5, 0.8, 0.4);
      const tint = this.scene.add.rectangle(0, 0, W, H, 0x5fb8d8, 0.07).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(1);
      const lines = this.scene.add.graphics().setDepth(2);
      lines.fillStyle(0xa0e6ff, 0.06);
      for (let y = 0; y < H; y += 6) lines.fillRect(0, y, W, 2);
      this.memoryFx.push(tint, lines);
      this.audio.ambience('memory');
    } else this.audio.ambience(this.player.y > (60 + 4) * 16 ? 'under' : 'night');
  }

  // ---------------------------------------------------------------- dialogue
  private advance(): Promise<void> {
    return new Promise((res, rej) => {
      const start = this.world.time.now;
      let done = false;
      const finish = () => {
        if (done || this.world.time.now - start < 150) return;
        done = true;
        this.scene.input.off('pointerup', onPtr);
        this.scene.input.keyboard?.off('keydown', onKey);
        this.alive ? res() : rej(new Abort());
      };
      const onPtr = (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => !over.length && finish();
      const onKey = (e: KeyboardEvent) => [' ', 'Enter', 'e', 'E'].includes(e.key) && finish();
      this.scene.input.on('pointerup', onPtr);
      this.scene.input.keyboard?.on('keydown', onKey);
      this.waiters.push(() => (!this.alive ? (rej(new Abort()), true) : done));
    });
  }

  private dialogueBox(name: string | null, text: string, opts: { narration?: boolean } = {}) {
    const ui = this.scene;
    const c = ui.add.container(0, 0).setDepth(20);
    const x = 240, y = H - 250, w = W - 480, h = 210;
    const portrait = name && PORTRAIT[name] ? PORTRAIT[name] : null;
    c.add(panel(ui, x, y, w, h, opts.narration ? 0.75 : PANEL.alpha));
    let tx = x + 40;
    if (portrait) {
      // Head-and-shoulders crop of the pixel portrait.
      c.add(panel(ui, x + 20, y + 18, 176, 174, 1));
      const img = ui.add.image(x + 108, y + 24, portrait).setOrigin(0.5, 0);
      img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      img.setScale(3).setCrop(0, 0, img.width, 54);
      c.add(img);
      tx = x + 250;
    }
    if (name) {
      c.add(panel(ui, x + 20, y - 52, Math.max(160, name.length * 22 + 40), 56, 1));
      c.add(ptext(ui, x + 40, y - 46, name.toUpperCase(), 40, name === 'Elias' ? '#ffe08a' : '#bfefff'));
    }
    const body = ptext(ui, tx, y + 26, '', 40, opts.narration ? '#d8d0e8' : '#ffffff', x + w - tx - 40);
    c.add(body);
    const arrow = ptext(ui, x + w - 50, y + h - 52, '▼', 34, '#ffe08a').setVisible(false);
    c.add(arrow);
    ui.tweens.add({ targets: arrow, y: arrow.y + 6, yoyo: true, repeat: -1, duration: 400 });
    return { c, body, arrow, full: opts.narration ? text : text };
  }

  /** A character speaks (portrait + typewriter). Click / Space / E to continue. */
  async say(name: string, text: string, opts: { narration?: boolean; keep?: boolean } = {}) {
    this.busyUi = true;
    const box = this.dialogueBox(name, text, opts);
    const cps = comicSettings.reduceMotion ? 999 : 55;
    let shown = 0, skipped = false;
    const typing = this.until(() => {
      if (skipped) shown = text.length;
      shown = Math.min(text.length, shown + (this.lastDt / 1000) * cps);
      box.body.setText(text.slice(0, Math.floor(shown)));
      if (Math.floor(shown) % 3 === 0 && shown < text.length) this.audio.play('click', 0.04, 1200);
      return shown >= text.length;
    });
    const skipOnClick = this.advance().then(() => (skipped = true));
    await Promise.race([typing, skipOnClick]);
    skipped = true;
    await typing;
    box.arrow.setVisible(true);
    await this.advance();
    if (!opts.keep) box.c.destroy();
    this.busyUi = false;
    return box.c;
  }
  /** Elias's inner narration (no portrait). */
  narr(text: string) {
    return this.say('', text, { narration: true });
  }

  /**
   * Dialogue choice. With `timer` (seconds) a bar drains; when it runs out, `silent` is picked
   * (defaults to the last option, which should be "..."). Keys 1–4 also choose.
   */
  async choice(options: string[], opts: { timer?: number; silent?: number; prompt?: string } = {}): Promise<number> {
    this.busyUi = true;
    const ui = this.scene;
    const c = ui.add.container(0, 0).setDepth(25);
    if (opts.prompt) {
      c.add(panel(ui, 200, H - 300, W - 400, 120, 0.8));
      c.add(ptext(ui, W / 2, H - 240, opts.prompt, 40, '#d8d0e8', W - 500).setOrigin(0.5));
    }
    const cols = options.length > 2 ? 2 : options.length;
    const bw = 700, bh = 84, gap = 22;
    const total = cols * bw + (cols - 1) * gap;
    const top = H - 170 - Math.ceil(options.length / cols) * (bh + gap) + (opts.prompt ? 0 : 60);
    let picked = -1;
    options.forEach((o, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const b = pbutton(ui, W / 2 - total / 2 + bw / 2 + col * (bw + gap), top + row * (bh + gap) + bh / 2, bw, bh, `${i + 1}. ${o}`, () => (picked = i), 36);
      c.add(b);
    });
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) picked = n - 1;
    };
    ui.input.keyboard?.on('keydown', onKey);
    let bar: Phaser.GameObjects.Graphics | undefined;
    const limit = (opts.timer ?? 0) * 1000 * (comicSettings.reduceMotion ? 1.8 : 1);
    let t = 0;
    if (limit) {
      bar = ui.add.graphics();
      c.add(bar);
    }
    try {
      await this.until(() => {
        if (limit) {
          t += this.lastDt;
          const k = Math.max(0, 1 - t / limit);
          bar!.clear().fillStyle(0x000000, 0.5).fillRect(W / 2 - total / 2, top - 30, total, 12).fillStyle(k > 0.3 ? 0xffe08a : 0xe07070, 1).fillRect(W / 2 - total / 2, top - 30, total * k, 12);
          if (t >= limit && picked < 0) picked = opts.silent ?? options.length - 1;
        }
        return picked >= 0;
      });
    } finally {
      ui.input.keyboard?.off('keydown', onKey);
      c.destroy();
      this.busyUi = false;
    }
    this.audio.play('click', 0.4);
    return picked;
  }

  /** Minecraft: Story Mode-style consequence note. */
  remember(who: string, what = 'will remember that.') {
    if (!this.save.remembered.includes(`${who}: ${what}`)) this.save.remembered.push(`${who} ${what}`);
    this.onSave(this.save);
    const ui = this.scene;
    const t = ptext(ui, W - 40, 130, `${who} ${what}`, 38, '#ffe08a').setOrigin(1, 0).setAlpha(0).setDepth(30);
    ui.tweens.add({ targets: t, alpha: 1, x: W - 60, duration: 300 });
    ui.tweens.add({ targets: t, alpha: 0, delay: 2600, duration: 600, onComplete: () => t.destroy() });
    this.audio.tone('chime');
  }

  async banner(text: string, color = '#7fe0d4', ms = 1600) {
    const t = label(this.scene, W / 2, H * 0.28, text, 100, { color, strokeThickness: 16 }).setOrigin(0.5).setDepth(30).setAlpha(0);
    this.scene.tweens.add({ targets: t, alpha: 1, duration: 250 });
    await this.wait(ms);
    this.scene.tweens.add({ targets: t, alpha: 0, duration: 350, onComplete: () => t.destroy() });
    await this.wait(300);
  }

  async episodeCard(n: string, title: string) {
    const ui = this.scene;
    const bg = ui.add.rectangle(0, 0, W, H, 0x05040a, 1).setOrigin(0).setDepth(40);
    const a = ptext(ui, W / 2, H / 2 - 90, n, 48, '#7fe0d4').setOrigin(0.5).setDepth(41);
    const b = label(ui, W / 2, H / 2, title, 120).setOrigin(0.5).setDepth(41);
    const c = ptext(ui, W / 2, H / 2 + 100, 'ECHOES OF SORROW', 36, '#8a86b8').setOrigin(0.5).setDepth(41);
    await this.wait(2200);
    ui.tweens.add({ targets: [bg, a, b, c], alpha: 0, duration: 800, onComplete: () => [bg, a, b, c].forEach((o) => o.destroy()) });
    await this.wait(500);
  }

  objective(text: string | null) {
    this.objectiveBox.removeAll(true);
    if (!text) return;
    const t = ptext(this.scene, 24, 16, `▶ ${text}`, 36, '#ffe08a');
    this.objectiveBox.add([panel(this.scene, 0, 0, t.width + 48, 66, 0.8), t]);
  }

  /** Put a node on the evidence board (toast + badge). */
  found(id: string) {
    if (this.save.found.includes(id)) return;
    this.save.found.push(id);
    this.onSave(this.save);
    this.audio.play('page', 0.5);
    this.unseen++;
    this.badge.setText(`+${this.unseen}`);
    const node = NODES.find((n) => n.id === id);
    const ui = this.scene;
    const c = ui.add.container(W + 20, 130).setDepth(30);
    const t = ptext(ui, 20, 12, `NEW ON THE BOARD:  ${node?.title ?? id}`, 34, '#bfefff');
    c.add([panel(ui, 0, 0, t.width + 40, 60, 0.9), t]);
    ui.tweens.add({ targets: c, x: W - t.width - 70, duration: 300, ease: 'Back.Out' });
    ui.tweens.add({ targets: c, x: W + 20, delay: 2800, duration: 300, onComplete: () => c.destroy() });
  }
  /** Big lower-third the first time we meet someone. */
  async nameCard(name: string, role: string) {
    const ui = this.scene;
    const c = ui.add.container(-700, H * 0.62).setDepth(30);
    c.add(panel(ui, 0, 0, 640, 120, 0.95));
    c.add(label(ui, 30, 14, name, 64));
    c.add(ptext(ui, 32, 80, role, 32, '#bfefff'));
    ui.tweens.add({ targets: c, x: 60, duration: 400, ease: 'Back.Out' });
    await this.wait(1900);
    ui.tweens.add({ targets: c, x: -700, duration: 300, onComplete: () => c.destroy() });
  }
  /** Open the board on a question; resolves once the player links the right clue. */
  deduce(id: string): Promise<void> {
    this.busyUi = true;
    this.boardOpen = true;
    return new Promise((res, rej) => {
      const b = openBoard(this.scene, { found: this.save.found, flags: this.save.flags }, {
        deduce: id,
        sfx: (k) => this.boardSfx(k),
        onSolved: () => this.onSave(this.save),
        onClose: () => {
          this.boardOpen = false;
          this.busyUi = false;
          this.alive ? res() : rej(new Abort());
        },
      });
      this.closeBoard = () => b.close();
    });
  }
  private boardSfx(k: 'page' | 'click' | 'right' | 'wrong') {
    if (k === 'page') this.audio.play('page', 0.5);
    else if (k === 'click') this.audio.play('click', 0.3);
    else if (k === 'right') this.audio.tone('chime');
    else this.audio.play('slam', 0.3, -600);
  }

  private openCasebook() {
    if (this.boardOpen || this.busyUi) return;
    this.boardOpen = true;
    this.busyUi = true;
    this.unseen = 0;
    this.badge.setText('');
    const b = openBoard(this.scene, { found: this.save.found, flags: this.save.flags }, {
      sfx: (k) => this.boardSfx(k),
      onSolved: () => this.onSave(this.save),
      onClose: () => {
        this.boardOpen = false;
        this.busyUi = false;
      },
    });
    this.closeBoard = () => b.close();
  }

  // ---------------------------------------------------------------- exploring
  private nearestSpot(): Spot | undefined {
    const p = this.player;
    let best: Spot | undefined, bd = Infinity;
    for (const s of this.spots) {
      if (s.when && !s.when()) continue;
      const dx = Math.abs(s.x - p.x), dy = Math.abs(s.y - p.y);
      if (dx < 26 && dy < 50 && dx < bd) (best = s), (bd = dx);
    }
    return best;
  }
  private async tryInteract() {
    const ex = this.exploring;
    if (!ex || ex.busy || this.busyUi || this.boardOpen) return;
    const s = this.nearestSpot();
    if (!s) return;
    ex.busy = true;
    this.lock();
    let r: void | 'done';
    try {
      r = await s.run();
    } catch (e) {
      if (e instanceof Abort) return;
      throw e;
    }
    ex.busy = false;
    if (!this.exploring) return;
    this.unlock();
    if (r === 'done' || ex.done()) ex.finish(s.id);
  }
  /** Free roam: walk, jump, dig; E on a spot runs it. Resolves when `done()` turns true. */
  explore(spots: Spot[], done: () => boolean = () => false): Promise<string> {
    this.spots = spots;
    this.unlock();
    return new Promise((res, rej) => {
      this.exploring = {
        done,
        busy: false,
        finish: (id) => {
          this.exploring = undefined;
          this.spots = [];
          this.lock();
          this.alive ? res(id) : rej(new Abort());
        },
      };
      // Some objectives complete by walking/digging rather than a spot.
      this.waiters.push(() => {
        if (!this.alive) return rej(new Abort()), true;
        if (this.exploring && !this.exploring.busy && done()) {
          this.exploring.finish('');
          return true;
        }
        return !this.exploring;
      });
    });
  }

  // ---------------------------------------------------------------- end
  private async summary() {
    const ui = this.scene;
    this.objective(null);
    const c = ui.add.container(0, 0).setDepth(60);
    c.add(ui.add.rectangle(0, 0, W, H, 0x05040a, 0.96).setOrigin(0));
    c.add(label(ui, W / 2, 130, 'INVESTIGATION COMPLETE', 90).setOrigin(0.5));
    const ending = this.save.flags.ending === 'light' ? 'The clock moved.' : 'The loop.';
    c.add(ptext(ui, W / 2, 220, `Ending: ${ending}`, 46, '#7fe0d4').setOrigin(0.5));
    c.add(ptext(ui, W / 2 - 600, 300, 'THEY REMEMBERED', 40, '#ffe08a'));
    c.add(ptext(ui, W / 2 - 600, 350, this.save.remembered.join('\n') || '—', 34, '#ffffff', 560));
    c.add(ptext(ui, W / 2 + 60, 300, 'WHAT YOU SAW', 40, '#ffe08a'));
    const f = this.save.flags;
    const seen = [
      `${f.sawLanternIvy ? '●' : '○'} The lantern in Ivy's crowd`,
      `${f.sawCarried ? '●' : '○'} What the figure carried`,
      `${f.heardHanna ? '●' : '○'} Hanna almost said his name`,
      `${f.pushedBoat ? '●' : '○'} Luke's boat got away`,
      `Evidence found: ${this.save.found.length}`,
    ];
    c.add(ptext(ui, W / 2 + 60, 350, seen.join('\n'), 34, '#ffffff', 560));
    c.add(ptext(ui, W / 2, H - 260, 'Some memories could have gone another way.', 40, '#d8d0e8').setOrigin(0.5));
    c.add(pbutton(ui, W / 2 - 320, H - 150, 380, 80, 'PLAY AGAIN', () => this.world.scene.restart({ fresh: true })));
    c.add(pbutton(ui, W / 2 + 120, H - 150, 300, 80, 'TITLE', () => this.world.scene.start('Title')));
  }
}
