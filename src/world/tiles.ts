// Tiles, sprites and animations for the side-view world. Art: ansimuz's Gothicvania Town /
// Cemetery / Church packs (CC0) in public/assets/gv, plus the team pixel portraits.
// 16×16 tiles are copied out of the source tilesets into one generated tileset ('wtiles').
import Phaser from 'phaser';

export const TILE = 16;
export const ZOOM = 3; // world camera zoom (16 px tiles → 48 px on a 1080p screen)

/** Tile ids in the generated tileset. 0 = empty. */
export const T = {
  EMPTY: 0,
  GRASS: 1, GRASS2: 2, GRASS3: 3,
  DIRT: 4, DIRT2: 5, DIRT3: 6,
  DEEP: 7,
  STONE_TL: 8, STONE_TR: 9, STONE_BL: 10, STONE_BR: 11, STONE2: 12,
  RUBBLE: 13,
  PLANK: 14, // one-way wooden platform
  TOWNWALL: 15, TOWNWALL2: 16,
  COBBLE: 17, COBBLE2: 18,
  BRICK_BG: 19, BRICK_BG2: 20, BRICK_BG3: 21, // background walls (not solid)
  DIRT_BG: 22, STONE_BG: 23,
  WATER: 24,
  WOODLEGS: 25,
} as const;
const COUNT = 26;

export const SOLID = new Set<number>([T.GRASS, T.GRASS2, T.GRASS3, T.DIRT, T.DIRT2, T.DIRT3, T.DEEP, T.STONE_TL, T.STONE_TR, T.STONE_BL, T.STONE_BR, T.STONE2, T.RUBBLE, T.TOWNWALL, T.TOWNWALL2, T.COBBLE, T.COBBLE2]);
/** Tiles the player can dig with the mouse (Terraria-style). */
export const MINABLE = new Set<number>([T.GRASS, T.GRASS2, T.GRASS3, T.DIRT, T.DIRT2, T.DIRT3, T.RUBBLE, T.DEEP]);

const GV = 'assets/gv/';
export const SPR = {
  elias: 'gv_hatman', ghostWoman: 'gv_woman', ghostBearded: 'gv_bearded', ghostOld: 'gv_oldman', figure: 'gv_figure',
};

export function preloadWorld(scene: Phaser.Scene) {
  const img = (k: string, f: string) => !scene.textures.exists(k) && scene.load.image(k, GV + f);
  const sheet = (k: string, f: string, w: number, h: number) => !scene.textures.exists(k) && scene.load.spritesheet(k, GV + f, { frameWidth: w, frameHeight: h });
  img('gv_cem_tiles', 'cem-tiles.png');
  img('gv_church_tiles', 'church-tiles.png');
  img('gv_t_wall', 't-wall.png');
  img('gv_t_wallb', 't-wall-b.png');
  img('gv_t_wood', 't-top-wood.png');
  img('gv_t_legs', 't-wood-legs.png');
  for (const p of ['house-a', 'house-b', 'house-c', 'well', 'street-lamp', 'crate', 'crate-stack', 'barrel', 'wagon', 'sign', 'column']) img(`gv_${p}`, `${p}.png`);
  img('gv_town_bg', 'town-bg.png');
  img('gv_town_mid', 'town-mid.png');
  img('gv_cem_bg', 'cem-bg.png');
  img('gv_cem_mountains', 'cem-mountains.png');
  img('gv_cem_graveyard', 'cem-graveyard.png');
  img('gv_church_bg', 'church-bg.png');
  sheet('gv_hatman_idle', 'hat-man-idle.png', 39, 52);
  sheet('gv_hatman_walk', 'hat-man-walk.png', 39, 52);
  sheet('gv_woman_idle', 'woman-idle.png', 37, 46);
  sheet('gv_woman_walk', 'woman-walk.png', 37, 46);
  sheet('gv_bearded_idle', 'bearded-idle.png', 40, 47);
  sheet('gv_bearded_walk', 'bearded-walk.png', 40, 47);
  sheet('gv_oldman_idle', 'oldman-idle.png', 34, 42);
  sheet('gv_oldman_walk', 'oldman-walk.png', 34, 42);
  sheet('gv_figure_idle', 'figure.png', 37, 65);
  // Team pixel portraits for the dialogue box.
  for (const p of ['elias_hatman', 'ivy', 'luke', 'hanna']) if (!scene.textures.exists(`pt_${p}`)) scene.load.image(`pt_${p}`, `assets/pixel/sprites/${p}.png`);
  // The same three ghosts at world scale, so in-game sprite and dialogue portrait match.
  for (const p of ['ivy', 'luke', 'hanna']) if (!scene.textures.exists(`gh_${p}`)) scene.load.image(`gh_${p}`, `assets/pixel/sprites/${p}_small.png`);
  if (!scene.textures.exists('pt_lantern')) scene.load.image('pt_lantern', 'assets/pixel/props/lantern_EV.png');
  if (!scene.textures.exists('pt_watch')) scene.load.image('pt_watch', 'assets/pixel/props/pocket_watch.png');
  if (!scene.textures.exists('pt_rope')) scene.load.image('pt_rope', 'assets/pixel/props/bell_rope.png');
  // Kenney Particle Pack (CC0) smoke for drifting fog.
  for (const n of ['smoke_04', 'smoke_07', 'smoke_10']) if (!scene.textures.exists(n)) scene.load.image(n, `assets/story/particles/${n}.png`);
}

function canvasTex(scene: Phaser.Scene, key: string, w: number, h: number, paint: (c: CanvasRenderingContext2D) => void) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h)!;
  const c = tex.getContext();
  c.imageSmoothingEnabled = false;
  paint(c);
  tex.refresh();
}

export function buildWorldTextures(scene: Phaser.Scene) {
  const src = (k: string) => scene.textures.get(k).getSourceImage() as CanvasImageSource;
  canvasTex(scene, 'wtiles', COUNT * TILE, TILE, (c) => {
    const put = (id: number, key: string, col: number, row: number) => c.drawImage(src(key), col * TILE, row * TILE, TILE, TILE, id * TILE, 0, TILE, TILE);
    const whole = (id: number, key: string, sx = 0, sy = 0) => c.drawImage(src(key), sx, sy, TILE, TILE, id * TILE, 0, TILE, TILE);
    put(T.GRASS, 'gv_cem_tiles', 5, 4); put(T.GRASS2, 'gv_cem_tiles', 6, 4); put(T.GRASS3, 'gv_cem_tiles', 4, 4);
    put(T.DIRT, 'gv_cem_tiles', 5, 5); put(T.DIRT2, 'gv_cem_tiles', 6, 5); put(T.DIRT3, 'gv_cem_tiles', 4, 5);
    put(T.DEEP, 'gv_cem_tiles', 2, 6);
    put(T.STONE_TL, 'gv_church_tiles', 1, 7); put(T.STONE_TR, 'gv_church_tiles', 2, 7);
    put(T.STONE_BL, 'gv_church_tiles', 1, 8); put(T.STONE_BR, 'gv_church_tiles', 2, 8);
    put(T.STONE2, 'gv_church_tiles', 4, 8);
    put(T.BRICK_BG, 'gv_church_tiles', 10, 1); put(T.BRICK_BG2, 'gv_church_tiles', 10, 2); put(T.BRICK_BG3, 'gv_church_tiles', 10, 3);
    whole(T.PLANK, 'gv_t_wood');
    whole(T.TOWNWALL, 'gv_t_wall'); whole(T.TOWNWALL2, 'gv_t_wallb');
    whole(T.WOODLEGS, 'gv_t_legs');
    // Cobbled street: dirt with a stone-paved top.
    put(T.COBBLE, 'gv_church_tiles', 1, 7);
    put(T.COBBLE2, 'gv_church_tiles', 2, 7);
    // Rubble: dirt with cracks — diggable, blocks the well shaft.
    put(T.RUBBLE, 'gv_cem_tiles', 6, 5);
    c.fillStyle = 'rgba(10,6,14,0.85)';
    const rx = T.RUBBLE * TILE;
    for (const [x, y, w, h] of [[2, 3, 6, 1], [7, 4, 1, 4], [3, 9, 8, 1], [10, 9, 1, 4], [12, 2, 2, 1]]) c.fillRect(rx + x, y, w, h);
    // Background walls: darkened copies of the solid tiles (Terraria "walls").
    for (const [id, from] of [[T.DIRT_BG, T.DIRT], [T.STONE_BG, T.STONE2]] as const) {
      c.drawImage(c.canvas, from * TILE, 0, TILE, TILE, id * TILE, 0, TILE, TILE);
      c.fillStyle = 'rgba(5,4,10,0.62)';
      c.fillRect(id * TILE, 0, TILE, TILE);
    }
    c.fillStyle = 'rgba(70,110,150,0.55)';
    c.fillRect(T.WATER * TILE, 0, TILE, TILE);
    c.fillStyle = 'rgba(160,200,230,0.35)';
    c.fillRect(T.WATER * TILE, 0, TILE, 2);
  });
  for (const k of ['wtiles', 'gv_town_bg', 'gv_town_mid', 'gv_cem_bg', 'gv_cem_mountains', 'gv_cem_graveyard', 'gv_church_bg']) scene.textures.get(k)?.setFilter(Phaser.Textures.FilterMode.NEAREST);

  // Small generated props.
  canvasTex(scene, 'w_glow', 128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  });
  canvasTex(scene, 'w_lantern', 6, 9, (c) => {
    c.fillStyle = '#2a2622'; c.fillRect(1, 0, 4, 2); c.fillRect(0, 8, 6, 1);
    c.fillStyle = '#bfefff'; c.fillRect(1, 2, 4, 6);
    c.fillStyle = '#ffffff'; c.fillRect(2, 3, 2, 3);
  });
  // Clock faces with hands computed from the time, so the tower always reads exactly 2:17 (2:18 at the end).
  canvasTex(scene, 'w_clock', 32, 32, (c) => drawClock(c, 2, 17, '#d8d0b0'));
  canvasTex(scene, 'w_clock218', 32, 32, (c) => drawClock(c, 2, 18, '#fff4d0'));
  // Tower spire (slate cone with a lit finial), 9 blocks wide.
  canvasTex(scene, 'w_spire', 160, 112, (c) => {
    for (let y = 0; y < 104; y++) {
      const half = Math.round(4 + (y / 104) * 76);
      c.fillStyle = y % 6 < 3 ? '#2a2638' : '#322d44';
      c.fillRect(80 - half, 8 + y, half * 2, 1);
      c.fillStyle = '#463e5e';
      c.fillRect(80 - half, 8 + y, 2, 1);
      c.fillStyle = '#15121e';
      c.fillRect(80 + half - 2, 8 + y, 2, 1);
    }
    c.fillStyle = '#1a1622';
    for (let y = 20; y < 104; y += 12) c.fillRect(80 - 1, 8 + y, 2, 6);
    c.fillStyle = '#c8a040'; c.fillRect(79, 0, 2, 10); c.fillRect(76, 3, 8, 2);
  });
  // Candle-lit arched window, cut from the church tileset (2×4 blocks).
  canvasTex(scene, 'w_towerwin', 32, 64, (c) => c.drawImage(src('gv_church_tiles'), 12 * TILE, 1 * TILE, 32, 64, 0, 0, 32, 64));
  canvasTex(scene, 'w_key', 8, 4, (c) => { c.fillStyle = '#b8a060'; c.fillRect(0, 0, 3, 3); c.fillRect(3, 1, 5, 1); c.fillRect(6, 2, 1, 2); c.fillStyle = '#6a1010'; c.fillRect(4, 1, 1, 1); });
  canvasTex(scene, 'w_steps', 24, 3, (c) => { c.fillStyle = 'rgba(10,6,10,0.8)'; for (let i = 0; i < 6; i++) c.fillRect(i * 4, i % 2 ? 0 : 2, 3, 1); });
  canvasTex(scene, 'w_boat', 40, 10, (c) => {
    c.fillStyle = '#3a2416'; c.fillRect(0, 2, 40, 5); c.fillRect(3, 7, 34, 2);
    c.fillStyle = '#5a3a22'; c.fillRect(0, 2, 40, 1);
    c.fillStyle = '#1a1008'; c.fillRect(10, 0, 2, 3); c.fillRect(28, 0, 2, 3);
  });
  canvasTex(scene, 'w_lectern', 12, 16, (c) => {
    c.fillStyle = '#3a2416'; c.fillRect(5, 6, 2, 10); c.fillRect(2, 15, 8, 1);
    c.fillStyle = '#5a3a22'; c.fillRect(0, 3, 12, 4);
    c.fillStyle = '#e8dcc0'; c.fillRect(1, 2, 10, 2);
  });
  canvasTex(scene, 'w_pedestal', 20, 18, (c) => {
    c.fillStyle = '#2a2236'; c.fillRect(4, 4, 12, 14); c.fillRect(1, 0, 18, 4); c.fillRect(0, 16, 20, 2);
    c.fillStyle = '#4a3e5e'; c.fillRect(1, 0, 18, 1);
  });
  canvasTex(scene, 'w_drawing', 16, 12, (c) => {
    c.fillStyle = '#efe6cf'; c.fillRect(0, 0, 16, 12);
    c.fillStyle = '#2a2a6a'; c.fillRect(3, 4, 2, 5); c.fillRect(3, 2, 2, 2); // boy
    c.fillStyle = '#bfefff'; c.fillRect(1, 5, 2, 2); // lantern
    c.fillStyle = '#c84a6a'; c.fillRect(10, 5, 2, 4); c.fillRect(10, 3, 2, 2); // girl
    c.fillStyle = '#2a2a6a'; c.fillRect(5, 6, 5, 1); // holding hands
  });
  // Nia's toy: a little wooden horse on a wheeled board (facing right).
  canvasTex(scene, 'w_horse', 14, 12, (c) => {
    c.fillStyle = '#7a4a24'; c.fillRect(3, 3, 7, 4); c.fillRect(9, 1, 3, 3); c.fillRect(11, 2, 2, 2); // body, neck, head
    c.fillStyle = '#5a3418'; c.fillRect(4, 7, 1, 2); c.fillRect(8, 7, 1, 2); c.fillRect(2, 3, 1, 2); c.fillRect(9, 0, 1, 2); // legs, tail, ear
    c.fillStyle = '#b8783c'; c.fillRect(3, 3, 7, 1); c.fillRect(9, 1, 3, 1);
    c.fillStyle = '#c03030'; c.fillRect(5, 2, 3, 1); // red saddle
    c.fillStyle = '#4a3020'; c.fillRect(1, 9, 12, 1);
    c.fillStyle = '#2a1a10'; c.fillRect(2, 10, 2, 2); c.fillRect(10, 10, 2, 2); // wheels
    c.fillStyle = '#111'; c.fillRect(12, 2, 1, 1); // eye
  });
  // A small white flower Nia wears in her hair.
  // Tiny on purpose: a few pixels of white tucked into her hair, not a hat.
  canvasTex(scene, 'w_flower', 3, 3, (c) => {
    c.fillStyle = '#f4f0ff'; c.fillRect(1, 0, 1, 1); c.fillRect(0, 1, 1, 1); c.fillRect(2, 1, 1, 1); c.fillRect(1, 2, 1, 1);
    c.fillStyle = '#ffd860'; c.fillRect(1, 1, 1, 1);
  });
  canvasTex(scene, 'w_photo', 18, 14, (c) => {
    c.fillStyle = '#d8ccb0'; c.fillRect(0, 0, 18, 14);
    c.fillStyle = '#3a3028';
    for (const x of [2, 6, 10]) { c.fillRect(x, 4, 2, 7); c.fillRect(x, 2, 2, 2); }
    c.fillStyle = '#111'; c.fillRect(14, 2, 3, 9);
    c.fillStyle = '#6a3a14'; c.fillRect(15, 0, 3, 4); c.fillRect(0, 11, 4, 3);
  });
  canvasTex(scene, 'w_candle', 4, 8, (c) => { c.fillStyle = '#e8dcc0'; c.fillRect(1, 3, 2, 5); c.fillStyle = '#ffb040'; c.fillRect(1, 0, 2, 3); });
  canvasTex(scene, 'w_crack', 16, 16, (c) => {
    c.fillStyle = 'rgba(0,0,0,0.75)';
    for (const [x, y, w, h] of [[3, 3, 1, 5], [3, 7, 5, 1], [8, 2, 1, 7], [9, 9, 4, 1], [12, 9, 1, 4], [5, 11, 4, 1]]) c.fillRect(x, y, w, h);
  });
}

/** Clock face: 12 ticks and hour/minute hands drawn from the real angles. */
function drawClock(c: CanvasRenderingContext2D, h: number, m: number, face: string) {
  const R = 16;
  c.fillStyle = '#1a1420'; c.beginPath(); c.arc(R, R, R, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#8a6a30'; c.beginPath(); c.arc(R, R, R - 1, 0, Math.PI * 2); c.fill();
  c.fillStyle = face; c.beginPath(); c.arc(R, R, R - 3, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#2a2030';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const len = i % 3 === 0 ? 3 : 2;
    for (let r = R - 4 - len + 1; r <= R - 4; r++) c.fillRect(Math.round(R + Math.sin(a) * r - 0.5), Math.round(R - Math.cos(a) * r - 0.5), 1, 1);
  }
  const hand = (angle: number, len: number, w: number, color: string) => {
    c.fillStyle = color;
    for (let r = 0; r <= len; r += 0.5) {
      const x = R + Math.sin(angle) * r, y = R - Math.cos(angle) * r;
      c.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), w, w);
    }
  };
  const minuteA = (m / 60) * Math.PI * 2;
  const hourA = ((h % 12) / 12 + m / 720) * Math.PI * 2;
  hand(hourA, 7, 2, '#1a1420');
  hand(minuteA, 11, 1, '#1a1420');
  c.fillStyle = '#8a1a1a'; c.fillRect(R - 1, R - 1, 2, 2);
}

export function makeAnims(scene: Phaser.Scene) {
  const a = (key: string, tex: string, rate: number, repeat = -1) => {
    if (!scene.anims.exists(key)) scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(tex), frameRate: rate, repeat });
  };
  a('elias_idle', 'gv_hatman_idle', 5);
  a('elias_walk', 'gv_hatman_walk', 10);
  a('woman_idle', 'gv_woman_idle', 6);
  a('woman_walk', 'gv_woman_walk', 10);
  a('bearded_idle', 'gv_bearded_idle', 6);
  a('bearded_walk', 'gv_bearded_walk', 10);
  a('oldman_idle', 'gv_oldman_idle', 6);
  a('oldman_walk', 'gv_oldman_walk', 12);
  a('figure_idle', 'gv_figure_idle', 5);
}
