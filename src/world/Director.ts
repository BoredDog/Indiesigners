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
import { ECHO_FIRST, ECHO_NOTE, Tuner } from '../story/tuner';
import { EchoGrid, IVY_GRID, LUKE_GRID } from '../story/grid';
import { Candles, IVY_CANDLES } from '../story/candles';
import { comicSettings } from '../comic';
import { H, W, label } from '../scenes/coreUi';
import { playCaseFile } from '../story/caseFile';
import { Guide } from './guide';
import { PANEL, panel, pbutton, ptext } from './ui';
import { NODES, openBoard } from './board';

/** Speakers who are ghosts: their lines get a faint shimmer (StoryAudio.tone('whisper')). */
const GHOST_VOICES = new Set(['Ivy', 'Luke', 'Hanna', 'Nia', 'The woman']);

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
  Elias: 'pt_elias_hatman', 'Young Elias': 'pt_elias_hatman', Ivy: 'pt_ivy', Luke: 'pt_luke', Hanna: 'pt_hanna', 'The woman': 'pt_hanna', Nia: 'pt_nia',
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

/** Puzzles that `?try=` can open on their own, for testing. */
const TRY_OUT: Record<string, (d: Director) => Promise<void>> = {
  tune1: (d) => d.tuner.tune(ECHO_FIRST),
  tune2: (d) => d.tuner.tune(ECHO_NOTE),
  candles: (d) => d.candles.play(IVY_CANDLES),
  grid1: (d) => d.grid.play(IVY_GRID),
  grid2: (d) => d.grid.play(LUKE_GRID),
};

export class Director {
  world: StoryScene;
  scene: Phaser.Scene; // UI scene (QTEs draw here)
  audio: StoryAudio;
  qte: Qte;
  tuner: Tuner;
  grid: EchoGrid;
  candles: Candles;
  save: StorySave;
  lastDt = 16;
  alive = true;
  autoWalk?: number;
  busyUi = false;
  /**
   * True while the mouse is over any clickable UI (buttons, the prompt, the board). Checked
   * live: a hover flag can get stuck when a button is covered before its pointerout fires,
   * which used to switch digging off for good.
   */
  get pointerOnUi() {
    const ui = this.scene;
    return this.boardOpen || ui.input.hitTestPointer(ui.input.activePointer).some((o) => (o as unknown as { visible?: boolean }).visible !== false);
  }
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
  /**
   * Echo sight: hold F (or the right mouse button) to raise the lantern. Hidden traces near
   * Elias surface in its light and unlock clues that are otherwise invisible.
   */
  sight = 0; // 0..1, eased toward 1 while the lantern is raised
  traces: { id: string; img: Phaser.GameObjects.Image; revealed: boolean; onReveal?: () => void }[] = [];
  private sightFx!: Phaser.GameObjects.Image;
  private sightHint!: Phaser.GameObjects.Text;
  private pingAt = 0;
  /** True while an unrevealed echo trace is close by (the lantern hint shows only then). */
  nearTrace = false;
  guide!: Guide;
  private objTarget?: { x: number; y: number; label: string };
  private lines = 0; // dialogue lines shown so far (the first few show how to continue)

  constructor(world: StoryScene, ui: Phaser.Scene, save: StorySave, onSave: (s: StorySave) => void) {
    this.world = world;
    this.scene = ui;
    this.save = save;
    this.onSave = onSave;
    this.audio = new StoryAudio(world);
    this.qte = new Qte(this);
    this.tuner = new Tuner(this);
    this.grid = new EchoGrid(this);
    this.candles = new Candles(this);
    world.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (this.alive = false));

    this.promptText = ptext(ui, 0, 0, '', 34, '#ffe08a').setOrigin(0.5);
    const bg = ui.add.graphics();
    this.prompt = ui.add.container(0, 0, [bg, this.promptText]).setVisible(false).setDepth(10);
    this.prompt.setData('bg', bg);
    this.objectiveBox = ui.add.container(30, 30).setDepth(10);
    // Echo sight overlay: a teal vignette that closes in while the lantern is raised.
    if (!ui.textures.exists('w_sight')) {
      const t = ui.textures.createCanvas('w_sight', 256, 144)!;
      const c = t.getContext(), g = c.createRadialGradient(128, 72, 30, 128, 72, 150);
      g.addColorStop(0, 'rgba(127,224,212,0)');
      g.addColorStop(0.6, 'rgba(20,60,70,0.25)');
      g.addColorStop(1, 'rgba(4,14,20,0.85)');
      c.fillStyle = g;
      c.fillRect(0, 0, 256, 144);
      t.refresh();
    }
    this.sightFx = ui.add.image(W / 2, H / 2, 'w_sight').setDisplaySize(W, H).setAlpha(0).setDepth(1);
    this.sightHint = ptext(ui, 40, H - 36, 'HOLD [F] OR RIGHT MOUSE  Raise the lantern', 28, '#7fe0d4').setOrigin(0, 1).setDepth(9).setAlpha(0.85).setVisible(false);
    this.guide = new Guide(this);

    pbutton(ui, W - 190, 50, 320, 64, 'EVIDENCE BOARD [C]', () => this.openCasebook(), 32).setDepth(10);
    this.badge = ptext(ui, W - 40, 22, '', 30, '#ffe08a').setOrigin(1, 0).setDepth(11);
    ui.input.keyboard?.on('keydown-C', () => (this.boardOpen ? this.closeBoard?.() : this.openCasebook()));
    ui.input.keyboard?.on('keydown-E', () => this.tryInteract());
    this.prompt.setSize(300, 60).setInteractive({ useHandCursor: true }).on('pointerup', () => this.tryInteract());
    world.events.on(Phaser.Scenes.Events.PAUSE, () => ui.scene.pause());
    world.events.on(Phaser.Scenes.Events.RESUME, () => ui.scene.resume());
  }

  // ---------------------------------------------------------------- running
  async run(episodes: Episode[], tryOut?: string) {
    this.setBed();
    try {
      // Dev: ?scene=Story&try=tune1 opens one puzzle straight away, then the story carries on.
      if (tryOut && TRY_OUT[tryOut]) await TRY_OUT[tryOut](this);
      while (this.save.episode < episodes.length) {
        const ep = episodes[this.save.episode];
        this.lock();
        await this.episodeCard(ep.n, ep.title);
        await ep.run(this);
        this.memory(false);
        this.clearTraces();
        this.save.episode++;
        this.onSave(this.save);
      }
      await this.summary();
    } catch (e) {
      if (!(e instanceof Abort)) throw e;
    }
  }

  update(dt: number) {
    // A little either side of the line, so climbing around in the well shaft doesn't flip it back and forth.
    const y = this.player.y, line = (60 + 4) * 16;
    if (!this.inMemory && this.deep !== undefined && (this.deep ? y < line - 24 : y > line + 24)) this.setBed();
    this.lastDt = dt;
    this.waiters = this.waiters.filter((w) => !w());
    this.updateSight(dt);
    this.guide.update();
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

  /** Places a hidden echo trace: invisible until the raised lantern's light reaches it. */
  trace(id: string, x: number, y: number, key: string, opts: { scale?: number; angle?: number; onReveal?: () => void } = {}) {
    const img = this.world.add.image(x, y, key).setOrigin(0.5, 1).setDepth(21.5).setScale(opts.scale ?? 1).setAngle(opts.angle ?? 0)
      .setTint(0x7fe0d4).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.traces.push({ id, img, revealed: false, onReveal: opts.onReveal });
    return img;
  }
  revealed(id: string) {
    return this.traces.some((t) => t.id === id && t.revealed);
  }
  clearTraces() {
    this.traces.forEach((t) => t.img.destroy());
    this.traces = [];
  }

  private updateSight(dt: number) {
    const free = this.isFree();
    const raised = free && this.world.lanternRaised;
    this.sight = Phaser.Math.Clamp(this.sight + (raised ? dt / 260 : -dt / 200), 0, 1);
    this.world.lanternBoost = this.sight * 0.7;
    this.sightFx.setAlpha(this.sight * 0.9);
    // Only where it's needed: near something hidden, once the tutorial card has taught it.
    this.sightHint.setVisible(free && this.nearTrace && !!this.save.flags.tut_lantern);
    if (raised && this.sight > 0.5) this.audio.hum(true);
    else this.audio.hum(false);
    const px = this.player.x, py = this.player.y - 20, reach = 9 * 16 * this.sight;
    let near = false;
    for (const t of this.traces) {
      const dist = Phaser.Math.Distance.Between(px, py, t.img.x, t.img.y - t.img.displayHeight / 2);
      if (!t.revealed && dist < 9 * 16) near = true;
      const lit = dist < reach;
      if (lit && !t.revealed && this.sight > 0.8) {
        t.revealed = true;
        this.audio.tone('chime');
        // A burst of light where it surfaced, so the eye goes straight to it.
        const cx = t.img.x, cy = t.img.y - t.img.displayHeight / 2;
        for (let i = 0; i < 2; i++) {
          const g = this.world.add.graphics().setDepth(21.6).setBlendMode(Phaser.BlendModes.ADD);
          const o = { r: 2, a: 0.9 };
          this.world.tweens.add({ targets: o, r: 26 + i * 14, a: 0, delay: i * 160, duration: 700, ease: 'Sine.Out', onUpdate: () => g.clear().lineStyle(1.5, 0x7fe0d4, o.a).strokeCircle(cx, cy, o.r), onComplete: () => g.destroy() });
        }
        t.onReveal?.();
      }
      // Lit traces shimmer; revealed ones stay faintly visible so you can find them again.
      const shimmer = 0.8 + 0.2 * Math.sin(this.world.time.now / 180);
      const want = lit ? 0.95 * shimmer : t.revealed ? 0.3 + 0.4 * this.sight : 0;
      t.img.setAlpha(t.img.alpha + (want - t.img.alpha) * Math.min(1, dt / 120));
    }
    this.nearTrace = near;
    // The instinct: when something hidden is close and the lantern is down, it stirs.
    if (near && free && this.sight < 0.1 && this.world.time.now > this.pingAt) {
      this.pingAt = this.world.time.now + 2600;
      const lp = this.world.lanternPos();
      const g = this.world.add.graphics().setDepth(21).setBlendMode(Phaser.BlendModes.ADD);
      const o = { r: 4, a: 0.5 };
      this.world.tweens.add({ targets: o, r: 34, a: 0, duration: 900, ease: 'Sine.Out', onUpdate: () => g.clear().lineStyle(1.5, 0x7fe0d4, o.a).strokeCircle(lp.x, lp.y, o.r), onComplete: () => g.destroy() });
    }
  }

  /** The player can walk around and act (not in dialogue, a cutscene or the board). */
  isFree() {
    return !!this.exploring && !this.exploring.busy && !this.busyUi && !this.boardOpen && !this.world.locked;
  }
  /** Where the objective arrows point: every open "!" spot (nearest first), or a set target. */
  objectiveTargets(): { x: number; y: number; label: string }[] {
    const p = this.player;
    const open = this.spots.filter((s) => !s.when || s.when()).map((s) => ({ x: s.x, y: s.y, label: s.label }));
    if (this.objTarget) open.push(this.objTarget);
    return open.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));
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
  /**
   * Hands the camera back to Elias. It eases over to him first, so coming back from a pan or a
   * watched NPC is one smooth move instead of a snap.
   */
  async follow(ms = 900) {
    const cam = this.world.cameras.main;
    cam.stopFollow();
    const tx = this.player.x, ty = this.player.y - 30;
    if (ms > 0 && Math.hypot(cam.midPoint.x - tx, cam.midPoint.y - ty) > 8) {
      cam.pan(tx, ty, ms, 'Sine.easeInOut');
      await this.wait(ms + 30);
    }
    cam.startFollow(this.player, true, 0.12, 0.12, 0, 30);
  }
  /** The camera drifts after an NPC (people running in a memory stay in frame). */
  watch(n: Npc) {
    this.world.cameras.main.startFollow(n.sprite, true, 0.05, 0.05, 0, 30);
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
  /**
   * A bell toll you can see: pale rings swell out from (x, y) in the world, and the camera
   * shudders once. Used instead of a comic sound word.
   */
  /** The bell strikes: the sound and the rings start on the same frame. */
  async toll(x: number, y: number, rings = 3, sound = true) {
    const w = this.world;
    if (sound) this.audio.play('bell', 0.7, -900);
    w.cameras.main.shake(260, 0.0025);
    for (let i = 0; i < rings; i++) {
      const g = w.add.graphics().setDepth(21).setBlendMode(Phaser.BlendModes.ADD);
      const o = { r: 6, a: 0.55 };
      w.tweens.add({
        targets: o, r: 90, a: 0, duration: 1500, delay: i * 220, ease: 'Sine.Out',
        onUpdate: () => g.clear().lineStyle(2, 0xcfe6ff, o.a).strokeCircle(x, y, o.r),
        onComplete: () => g.destroy(),
      });
    }
    await this.wait(900);
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
    }
    this.inMemory = on;
    this.setBed();
  }

  private inMemory = false;
  private deep?: boolean;
  /** Pick the ambience and score for where Elias is: a memory, under Veyra, or the village. */
  private setBed() {
    const deep = this.player.y > (60 + 4) * 16;
    this.deep = deep;
    const zone = this.inMemory ? 'memory' : deep ? 'under' : 'night';
    this.audio.ambience(zone);
    // The finale and endings set their own music; leave it alone until the next episode.
    if (!this.scoreLocked) this.audio.music(zone);
  }
  /** Set by the finale so climbing or memories don't swap its music back. */
  scoreLocked = false;
  /** Called by the script for the finale and the endings. */
  score(mood: 'finale' | 'dawn' | 'none') {
    this.scoreLocked = true;
    this.audio.music(mood);
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
    // The first few lines say how to continue, for anyone who skipped HOW TO PLAY.
    if (this.lines++ < 6) {
      const how = ptext(ui, x + w - 70, y + h - 46, 'SPACE OR CLICK', 26, '#aab8d8').setOrigin(1, 0);
      c.add(how);
      ui.tweens.add({ targets: how, alpha: 0.4, yoyo: true, repeat: -1, duration: 700 });
    }
    ui.tweens.add({ targets: arrow, y: arrow.y + 6, yoyo: true, repeat: -1, duration: 400 });
    return { c, body, arrow, full: opts.narration ? text : text };
  }

  /** A character speaks (portrait + typewriter). Click / Space / E to continue. */
  async say(name: string, text: string, opts: { narration?: boolean; keep?: boolean } = {}) {
    this.busyUi = true;
    if (GHOST_VOICES.has(name)) this.audio.tone('whisper');
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
    // Laid out from the bottom up: buttons, then the timer bar, then the prompt, with even gaps.
    const cols = options.length > 2 ? 2 : options.length;
    const bw = 720, bh = 84, gap = 24;
    const total = cols * bw + (cols - 1) * gap;
    const rows = Math.ceil(options.length / cols);
    const top = H - 70 - rows * bh - (rows - 1) * gap;
    if (opts.prompt) {
      const pt = ptext(ui, W / 2, 0, opts.prompt, 40, '#d8d0e8', total - 80).setOrigin(0.5, 0).setAlign('center');
      const ph = pt.height + 44;
      const py = top - (opts.timer ? 48 : 28) - ph;
      pt.setY(py + 22);
      c.add([panel(ui, W / 2 - total / 2, py, total, ph, 0.92), pt]);
    }
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
          bar!.clear().fillStyle(0x000000, 0.5).fillRect(W / 2 - total / 2, top - 30, total, 10).fillStyle(k > 0.3 ? 0xffe08a : 0xe07070, 1).fillRect(W / 2 - total / 2, top - 30, total * k, 10);
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
    // Second toast row (the evidence toast uses the first), so the two never overlap.
    const c = ui.add.container(0, 0).setDepth(30).setAlpha(0);
    const t = ptext(ui, 0, 0, `${who} ${what}`, 34, '#ffe08a');
    const w = t.width + 48;
    t.setPosition(W - 40 - w + 24, 214);
    c.add([panel(ui, W - 40 - w, 202, w, 60, 0.92), t]);
    ui.tweens.add({ targets: c, alpha: 1, duration: 300 });
    ui.tweens.add({ targets: c, alpha: 0, delay: 2600, duration: 600, onComplete: () => c.destroy() });
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

  /** Sets the objective line. `target` adds an arrow for objectives that have no "!" spot. */
  objective(text: string | null, target?: { x: number; y: number; label: string }) {
    this.objectiveBox.removeAll(true);
    this.objTarget = text ? target : undefined;
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
    const c = ui.add.container(W + 20, 126).setDepth(30);
    const t = ptext(ui, 24, 12, `NEW EVIDENCE: ${node?.title ?? id}`, 34, '#bfefff');
    c.add([panel(ui, 0, 0, t.width + 48, 60, 0.92), t]);
    ui.tweens.add({ targets: c, x: W - 40 - (t.width + 48), duration: 300, ease: 'Back.Out' });
    ui.tweens.add({ targets: c, x: W + 20, delay: 2800, duration: 300, onComplete: () => c.destroy() });
  }
  /** Big lower-third the first time we meet someone. */
  async nameCard(name: string, role: string) {
    const ui = this.scene;
    // Sized to its text: 36px padding, a gold accent bar, the role under the name with a clear gap.
    const pad = 36;
    const title = label(ui, pad + 14, pad - 8, name, 64).setOrigin(0, 0);
    const sub = ptext(ui, pad + 16, pad - 8 + title.height + 4, role, 32, '#bfefff');
    const w = Math.max(title.width, sub.width) + pad * 2 + 14;
    const h = sub.y + sub.height + pad - 6;
    const c = ui.add.container(-w - 40, H * 0.58).setDepth(30);
    const bar = ui.add.rectangle(pad - 6, pad - 4, 6, h - pad * 2 + 8, 0xffe08a).setOrigin(0);
    c.add([panel(ui, 0, 0, w, h, 0.96), bar, title, sub]);
    ui.tweens.add({ targets: c, x: 60, duration: 400, ease: 'Back.Out' });
    await this.wait(1900);
    ui.tweens.add({ targets: c, x: -w - 40, duration: 300, onComplete: () => c.destroy() });
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
    this.guide.boardOpened = true;
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
    this.guide.interacted = true;
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
    // The case, retold as Elias's detective comic, before the results screen.
    await playCaseFile(ui, { ending: this.save.flags.ending === 'light' ? 'light' : 'dark', flags: this.save.flags });
    const c = ui.add.container(0, 0).setDepth(60);
    c.add(ui.add.rectangle(0, 0, W, H, 0x05040a, 0.96).setOrigin(0));
    c.add(label(ui, W / 2, 130, 'THE END', 90).setOrigin(0.5));
    const ending = this.save.flags.ending === 'light' ? '2:18. You remembered.' : 'Come home, Eli. You forgot again.';
    c.add(ptext(ui, W / 2, 220, `Ending: ${ending}`, 46, '#7fe0d4').setOrigin(0.5));
    // Two equal cards, centred with a 40px gutter; consistent 32px inner padding.
    const cw = 600, ch = 330, top = 290, pad = 32;
    const card = (x: number, head: string, body: string) => {
      c.add(panel(ui, x, top, cw, ch, 0.9));
      c.add(ptext(ui, x + pad, top + pad - 6, head, 38, '#ffe08a'));
      c.add(ptext(ui, x + pad, top + pad + 50, body, 34, '#ffffff', cw - pad * 2).setLineSpacing(10));
    };
    const f = this.save.flags;
    card(W / 2 - 20 - cw, 'THEY REMEMBERED', this.save.remembered.join('\n') || 'Nobody. You kept quiet.');
    card(W / 2 + 20, 'WHAT YOU SAW', [
      `${f.sawLanternIvy ? '●' : '○'} The lantern in Ivy’s crowd`,
      `${f.sawCarried ? '●' : '○'} What the figure carried`,
      `${f.heardHanna ? '●' : '○'} Hanna almost said your name`,
      `${f.pushedBoat ? '●' : '○'} You helped push Luke’s boat`,
      `Evidence found: ${this.save.found.length}`,
    ].join('\n'));
    c.add(ptext(ui, W / 2, top + ch + 70, 'Some memories could have gone another way.', 38, '#d8d0e8').setOrigin(0.5));
    c.add(pbutton(ui, W / 2 - 200, H - 150, 360, 80, 'PLAY AGAIN', () => this.world.scene.restart({ fresh: true, episode: undefined })));
    c.add(pbutton(ui, W / 2 + 200, H - 150, 360, 80, 'TITLE SCREEN', () => this.world.scene.start('Title', {})));
  }
}
