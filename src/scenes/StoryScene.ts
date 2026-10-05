import Phaser from 'phaser';
import { StoryAudio } from '../story/audio';
import { Director, type StorySave } from '../world/Director';
import { Lighting, type LightSource } from '../world/Lighting';
import { EPISODES } from '../world/script';
import { MINABLE, SOLID, T, TILE, ZOOM, buildWorldTextures, makeAnims, preloadWorld } from '../world/tiles';
import { HT, SURF, WT, generateWorld, type World } from '../world/worldgen';
import { H, W, openPause } from './coreUi';

const SAVE_KEY = 'echoes_story_v3';
const DEPTH = { sky: -20, wallLayer: -1, props: 0, fg: 5, actors: 8, water: 9, light: 20, glow: 21 };

export function loadStory(): StorySave | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as StorySave) : null;
  } catch {
    return null;
  }
}
function writeStory(s: StorySave) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    /* private mode */
  }
}

export interface Npc {
  sprite: Phaser.GameObjects.Sprite;
  base: 'woman' | 'bearded' | 'oldman' | 'figure' | 'elias' | 'ivy' | 'luke' | 'hanna'; // anim prefix or ghost sprite
  ghost: boolean;
  homeY: number;
}

/**
 * STORY MODE: Echoes of Sorrow as a Terraria-style side-view world (Gothicvania CC0 tiles and
 * sprites, per-tile lighting, a little digging) told the way Minecraft: Story Mode tells
 * stories — episodes, timed dialogue choices that characters remember, and quick-time events.
 * Script: src/world/script.ts. Dev: ?scene=Story&episode=3 (0-based), &fresh=1 wipes the save.
 */
export class StoryScene extends Phaser.Scene {
  world!: World;
  map!: Phaser.Tilemaps.Tilemap;
  fgLayer!: Phaser.Tilemaps.TilemapLayer;
  player!: Phaser.Physics.Arcade.Sprite;
  facing = 1;
  locked = true;
  lantern = 0.75; // lantern brightness 0..1 (scripts change it)
  extraLights: LightSource[] = [];
  props = new Map<string, Phaser.GameObjects.Image>();
  npcs: Npc[] = [];
  director!: Director;
  private lighting!: Lighting;
  private parallax: { img: Phaser.GameObjects.TileSprite; f: number }[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private mining?: { tx: number; ty: number; t: number; crack: Phaser.GameObjects.Image };
  private glow!: Phaser.GameObjects.Image;
  private dropUntil = 0;
  dug = 0;

  constructor() {
    super({ key: 'Story', physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } } });
  }

  preload() {
    preloadWorld(this);
    StoryAudio.preload(this);
  }

  create(data: { fresh?: boolean | string; episode?: string | number } = {}) {
    buildWorldTextures(this);
    makeAnims(this);
    this.props.clear();
    this.npcs = [];
    this.parallax = [];
    this.extraLights = [];
    this.world = generateWorld();
    this.buildBackdrop();
    this.buildMap();
    this.buildProps();
    this.buildPlayer();
    this.lighting = new Lighting(this, this.world.fg, DEPTH.light);
    this.glow = this.add.image(0, 0, 'w_glow').setDepth(DEPTH.glow).setBlendMode(Phaser.BlendModes.ADD).setTint(0x9fe8ff);

    const cam = this.cameras.main;
    cam.setZoom(ZOOM).setBounds(0, 0, WT * TILE, HT * TILE).setBackgroundColor(0x0b0a18);
    cam.startFollow(this.player, true, 0.12, 0.12, 0, 30);
    cam.roundPixels = true;

    const k = this.input.keyboard!;
    this.keys = k.addKeys('A,D,W,S,LEFT,RIGHT,UP,DOWN,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
    k.on('keydown-ESC', () => openPause(this, 'Story'));

    const save: StorySave = data.fresh ? { episode: 0, flags: {}, found: [], remembered: [] } : (loadStory() ?? { episode: 0, flags: {}, found: [], remembered: [] });
    if (data.episode !== undefined) save.episode = Number(data.episode);
    writeStory(save);
    this.scene.launch('StoryUI');
    const ui = this.scene.get('StoryUI');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop('StoryUI'));
    ui.events.once(Phaser.Scenes.Events.CREATE, () => {
      this.director = new Director(this, ui, save, writeStory);
      (window as unknown as { __story: Director }).__story = this.director; // test hook
      void this.director.run(EPISODES);
    });
  }

  // ------------------------------------------------------------------ building
  private buildBackdrop() {
    // Parallax (fixed to the camera, scrolled by hand): mountains, town skyline, middleground.
    const vw = W / ZOOM, vh = H / ZOOM;
    const layer = (key: string, f: number, tint: number, alpha = 1) => {
      const src = this.textures.get(key).getSourceImage();
      const img = this.add.tileSprite(W / 2, H / 2, vw, src.height, key).setScrollFactor(0).setDepth(DEPTH.sky + this.parallax.length).setTint(tint).setAlpha(alpha);
      this.parallax.push({ img, f });
    };
    layer('gv_cem_bg', 0.04, 0x6a6aa0);
    layer('gv_town_bg', 0.12, 0x7070a8);
    layer('gv_town_mid', 0.3, 0x8a86b8);
    void vh;
  }

  private buildMap() {
    const map = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: WT, height: HT });
    const ts = map.addTilesetImage('wtiles', 'wtiles', TILE, TILE, 0, 0)!;
    const bg = map.createBlankLayer('bg', ts)!.setDepth(DEPTH.wallLayer);
    const fg = map.createBlankLayer('fg', ts)!.setDepth(DEPTH.fg);
    const water = map.createBlankLayer('water', ts)!.setDepth(DEPTH.water).setAlpha(0.8);
    for (let y = 0; y < HT; y++) {
      for (let x = 0; x < WT; x++) {
        if (this.world.bg[y][x]) bg.putTileAt(this.world.bg[y][x], x, y);
        if (this.world.fg[y][x]) fg.putTileAt(this.world.fg[y][x], x, y);
        if (this.world.water[y][x]) water.putTileAt(T.WATER, x, y);
      }
    }
    fg.setCollision([...SOLID]);
    // Wooden planks: one-way platforms (collide on top only).
    fg.forEachTile((t) => {
      if (t.index === T.PLANK) t.setCollision(false, false, true, false);
    });
    this.map = map;
    this.fgLayer = fg;
  }

  private buildProps() {
    for (const p of this.world.props) {
      const img = this.add.image(p.x, p.y, p.key).setOrigin(0.5, 1).setDepth(DEPTH.props + (p.depth ?? 0)).setFlipX(!!p.flip);
      if (p.scale) img.setScale(p.scale);
      if (p.id) this.props.set(p.id, img);
    }
  }

  private buildPlayer() {
    const s = this.world.anchors.start;
    this.player = this.physics.add.sprite(s.x, s.y - 30, 'gv_hatman_idle').setDepth(DEPTH.actors).setOrigin(0.5, 1);
    this.player.play('elias_idle');
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(14, 40).setOffset(13, 12);
    body.setGravityY(900).setMaxVelocity(200, 600);
    this.physics.add.collider(this.player, this.fgLayer, undefined, () => this.time.now > this.dropUntil || !this.onPlank());
    this.physics.world.setBounds(0, 0, WT * TILE, HT * TILE);
    this.player.setCollideWorldBounds(true);
  }
  private onPlank() {
    const t = this.fgLayer.getTileAtWorldXY(this.player.x, this.player.y + 2);
    return t?.index === T.PLANK;
  }

  // ------------------------------------------------------------------ actors
  npc(base: Npc['base'], x: number, y: number, opts: { ghost?: boolean; flip?: boolean; tint?: number } = {}): Npc {
    // Ivy / Luke / Hanna use the team's pixel sprites (same faces as their portraits).
    const named = base === 'ivy' || base === 'luke' || base === 'hanna';
    const tex = named ? `gh_${base}` : { woman: 'gv_woman_idle', bearded: 'gv_bearded_idle', oldman: 'gv_oldman_idle', figure: 'gv_figure_idle', elias: 'gv_hatman_idle' }[base];
    const sprite = this.add.sprite(x, y, tex).setOrigin(0.5, 1).setDepth(DEPTH.actors - 1).setFlipX(!!opts.flip);
    if (!named) sprite.play(`${base}_idle`);
    if (opts.ghost) sprite.setTint(opts.tint ?? 0xaee8ff).setAlpha(0.85);
    else if (opts.tint) sprite.setTint(opts.tint);
    const n: Npc = { sprite, base, ghost: !!opts.ghost, homeY: y };
    this.npcs.push(n);
    return n;
  }
  removeNpc(n: Npc) {
    n.sprite.destroy();
    this.npcs = this.npcs.filter((m) => m !== n);
  }

  /** Remove a block (digging, or the script opening the well). */
  clearTile(tx: number, ty: number) {
    this.fgLayer.removeTileAt(tx, ty);
    this.world.fg[ty][tx] = T.EMPTY;
    this.lighting.recomputeSky();
  }
  placeTile(tx: number, ty: number, id: number) {
    const t = this.fgLayer.putTileAt(id, tx, ty);
    t.setCollision(true, true, true, true);
    this.world.fg[ty][tx] = id;
    this.lighting.recomputeSky();
  }

  /** Ending: night lifts, the sky and town warm up. */
  dawn(ms = 6000) {
    this.tweens.add({ targets: this.lighting, ambient: 0.95, duration: ms });
    for (const p of this.parallax) this.tweens.addCounter({ from: 0, to: 1, duration: ms, onUpdate: (tw) => {
      const v = tw.getValue() ?? 0;
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0x7070a8), Phaser.Display.Color.ValueToColor(0xffffff), 1, v);
      p.img.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
    } });
    this.cameras.main.setBackgroundColor(0x3a2a48);
  }
  setAmbient(v: number) {
    this.lighting.ambient = v;
  }

  lanternPos() {
    return { x: this.player.x + this.facing * 9, y: this.player.y - 18 };
  }

  // ------------------------------------------------------------------ frame
  update(_t: number, delta: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const k = this.keys;
    const d = this.director;
    const free = !this.locked && d && !d.busyUi;
    let move = 0;
    if (free) {
      if (k.A.isDown || k.LEFT.isDown) move -= 1;
      if (k.D.isDown || k.RIGHT.isDown) move += 1;
      if ((Phaser.Input.Keyboard.JustDown(k.W) || Phaser.Input.Keyboard.JustDown(k.UP) || Phaser.Input.Keyboard.JustDown(k.SPACE)) && body.blocked.down) body.setVelocityY(-360); // ≈ 4.5 blocks high
      if ((Phaser.Input.Keyboard.JustDown(k.S) || Phaser.Input.Keyboard.JustDown(k.DOWN)) && this.onPlank()) this.dropUntil = this.time.now + 250;
    }
    if (d?.autoWalk !== undefined) {
      const dist = d.autoWalk - this.player.x;
      move = Math.abs(dist) < 2 ? 0 : Math.sign(dist);
      if (!move) d.autoWalk = undefined;
    }
    body.setVelocityX(move * 95);
    if (move) this.facing = move;
    this.player.setFlipX(this.facing < 0);
    const anim = move && body.blocked.down ? 'elias_walk' : 'elias_idle';
    if (this.player.anims.currentAnim?.key !== anim) this.player.play(anim);
    if (move && body.blocked.down && Math.floor(this.time.now / 260) !== Math.floor((this.time.now - delta) / 260)) d?.audio.step();

    if (free) this.updateMining(delta);
    else if (this.mining) (this.mining.crack.destroy(), (this.mining = undefined));

    // Ghosts float and flicker.
    for (const n of this.npcs) if (n.ghost) {
      n.sprite.y = n.homeY - 2 + Math.sin(this.time.now / 600 + n.sprite.x) * 2;
      if (Math.random() < 0.005) n.sprite.setAlpha(0.35);
      else n.sprite.setAlpha(Math.min(0.85, n.sprite.alpha + 0.03));
    }

    // Parallax: anchored so the skyline sits on the street.
    const cam = this.cameras.main;
    const view = cam.worldView;
    for (const p of this.parallax) {
      p.img.tilePositionX = view.x * p.f;
      const vy = SURF * TILE - view.y; // street level in view pixels
      p.img.y = H / 2 - H / ZOOM / 2 + vy - p.img.height / 2 + 6 + (1 - p.f) * 4;
      p.img.setVisible(vy > -40);
    }

    // Lighting.
    const lp = this.lanternPos();
    const sources: LightSource[] = this.world.lights.map((l) => ({ ...l, strength: 0.85 }));
    if (this.player.visible && this.lantern > 0) sources.push({ x: lp.x, y: lp.y, r: Math.round(5 + this.lantern * 7), strength: 0.6 + this.lantern * 0.35 });
    for (const n of this.npcs) if (n.ghost) sources.push({ x: n.sprite.x, y: n.sprite.y - 20, r: 4, strength: 0.55 });
    sources.push(...this.extraLights);
    this.lighting.update(cam, sources);
    const flick = 0.95 + Math.random() * 0.08;
    this.glow.setPosition(lp.x, lp.y).setScale(0.35 + this.lantern * 0.3 * flick).setAlpha(this.player.visible ? 0.25 + this.lantern * 0.25 : 0);

    d?.update(delta);
  }

  private updateMining(delta: number) {
    const p = this.input.activePointer;
    if (!p.isDown || this.director.pointerOnUi) {
      if (this.mining) (this.mining.crack.destroy(), (this.mining = undefined));
      return;
    }
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    const tx = Math.floor(wp.x / TILE), ty = Math.floor(wp.y / TILE);
    if (tx < 0 || ty < 0 || tx >= WT || ty >= HT) return;
    const id = this.world.fg[ty][tx];
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y - 20, tx * TILE + 8, ty * TILE + 8);
    if (!MINABLE.has(id) || dist > 5 * TILE || ty <= SURF) { // the town itself can't be dug up
      if (this.mining) (this.mining.crack.destroy(), (this.mining = undefined));
      return;
    }
    if (!this.mining || this.mining.tx !== tx || this.mining.ty !== ty) {
      this.mining?.crack.destroy();
      this.mining = { tx, ty, t: 0, crack: this.add.image(tx * TILE, ty * TILE, 'w_crack').setOrigin(0).setDepth(DEPTH.fg + 1).setAlpha(0) };
    }
    this.mining.t += delta;
    this.mining.crack.setAlpha(Math.min(1, this.mining.t / 380));
    if (this.mining.t > 400) {
      this.clearTile(tx, ty);
      this.mining.crack.destroy();
      this.mining = undefined;
      this.dug++;
      this.director.audio.play('creak3', 0.25, 600 - Math.random() * 400);
      for (let i = 0; i < 6; i++) {
        const bit = this.add.rectangle(tx * TILE + 8, ty * TILE + 8, 2, 2, id === T.RUBBLE ? 0x5a4a3a : 0x4a3a2a).setDepth(DEPTH.fg + 1);
        this.tweens.add({ targets: bit, x: bit.x + (Math.random() - 0.5) * 20, y: bit.y + 10 + Math.random() * 10, alpha: 0, duration: 500, onComplete: () => bit.destroy() });
      }
    }
  }
}
