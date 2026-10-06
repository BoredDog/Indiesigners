// Tiles, sprites and animations for the side-view world. Art: ansimuz's Gothicvania Town /
// Cemetery / Church packs (CC0) in public/assets/gv, plus the team pixel portraits.
// 16×16 tiles are copied out of the source tilesets into one generated tileset ('wtiles').
import Phaser from 'phaser';
import { loadCaseFileArt } from '../story/caseFile';

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
  COBBLE_MOSS: 26, // where the cemetery path meets the street
  MUD: 27, // the dried riverbed
} as const;
const COUNT = 28;

export const SOLID = new Set<number>([T.GRASS, T.GRASS2, T.GRASS3, T.DIRT, T.DIRT2, T.DIRT3, T.DEEP, T.STONE_TL, T.STONE_TR, T.STONE_BL, T.STONE_BR, T.STONE2, T.RUBBLE, T.TOWNWALL, T.TOWNWALL2, T.COBBLE, T.COBBLE2, T.COBBLE_MOSS, T.MUD]);
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
  // Painted backgrounds for the closing case-file comic.
  loadCaseFileArt(scene);
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
    // Mossy cobble: the paving with grass growing up through the joints and over the top.
    put(T.COBBLE_MOSS, 'gv_church_tiles', 1, 7);
    for (let x = 0; x < TILE; x++) {
      const h = [3, 5, 2, 4, 6, 3, 1, 4, 5, 2, 3, 6, 4, 2, 5, 3][x];
      c.drawImage(src('gv_cem_tiles'), 5 * TILE + x, 4 * TILE, 1, h, T.COBBLE_MOSS * TILE + x, 0, 1, h);
    }
    // Dried riverbed: pale, cracked mud. The river was drained in a single night.
    put(T.MUD, 'gv_cem_tiles', 5, 5);
    c.fillStyle = 'rgba(176,138,96,0.55)';
    c.fillRect(T.MUD * TILE, 0, TILE, TILE);
    c.fillStyle = 'rgba(214,180,136,0.75)';
    c.fillRect(T.MUD * TILE, 0, TILE, 3);
    c.fillStyle = 'rgba(30,20,20,0.75)';
    for (const [x, y, w, h] of [[0, 3, 5, 1], [4, 3, 1, 5], [4, 7, 6, 1], [9, 2, 1, 5], [9, 2, 7, 1], [12, 8, 1, 6], [1, 11, 8, 1], [12, 13, 4, 1]]) c.fillRect(T.MUD * TILE + x, y, w, h);
    // Rubble: dirt with cracks — diggable, blocks the well shaft.
    put(T.RUBBLE, 'gv_cem_tiles', 6, 5);
    c.fillStyle = 'rgba(10,6,14,0.85)';
    const rx = T.RUBBLE * TILE;
    for (const [x, y, w, h] of [[2, 3, 6, 1], [7, 4, 1, 4], [3, 9, 8, 1], [10, 9, 1, 4], [12, 2, 2, 1]]) c.fillRect(rx + x, y, w, h);
    // Loose grey stones, so rubble reads as rubble and not as plain dirt.
    for (const [x, y, w, h, col] of [[1, 1, 4, 3, '#6e6772'], [9, 1, 5, 3, '#5d5762'], [5, 6, 4, 3, '#77707c'], [11, 6, 4, 2, '#615a66'], [1, 11, 5, 3, '#6a636e'], [8, 11, 4, 4, '#58525d'], [13, 12, 3, 3, '#726b76']] as const) {
      c.fillStyle = col; c.fillRect(rx + x, y, w, h);
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(rx + x, y, w, 1);
    }
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
  // Ghosts, rebuilt from the full-size character art (not the muddy 50 px copies): smooth-scaled,
  // and fading out below the knees into mist, which reads as a ghost and hides the stiff legs.
  for (const n of ['ivy', 'luke', 'hanna']) {
    const key = `ghx_${n}`;
    if (scene.textures.exists(key) || !scene.textures.exists(`pt_${n}`)) continue;
    const img = scene.textures.get(`pt_${n}`).getSourceImage() as HTMLImageElement;
    canvasTex(scene, key, img.width, img.height, (c) => {
      c.drawImage(img, 0, 0);
      c.globalCompositeOperation = 'destination-out';
      const g = c.createLinearGradient(0, img.height * 0.6, 0, img.height);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,1)');
      c.fillStyle = g;
      c.fillRect(0, 0, img.width, img.height);
      c.globalCompositeOperation = 'source-over';
    });
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  // The graveyard hedge, faded out on its right so it melts into the street instead of
  // ending in a hard edge.
  canvasTex(scene, 'w_cem_graveyard', scene.textures.get('gv_cem_graveyard').getSourceImage().width, scene.textures.get('gv_cem_graveyard').getSourceImage().height, (c) => {
    const img = src('gv_cem_graveyard');
    const w = c.canvas.width, h = c.canvas.height;
    c.drawImage(img, 0, 0);
    c.globalCompositeOperation = 'destination-out';
    const g = c.createLinearGradient(w * 0.62, 0, w, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'source-over';
  });
  for (const k of ['wtiles', 'w_cem_graveyard', 'gv_town_bg', 'gv_town_mid', 'gv_cem_bg', 'gv_cem_mountains', 'gv_cem_graveyard', 'gv_church_bg']) scene.textures.get(k)?.setFilter(Phaser.Textures.FilterMode.NEAREST);

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
  // Echo traces (drawn white; the game tints them teal and adds them as light).
  canvasTex(scene, 'w_echo_steps', 72, 4, (c) => {
    // Several walkers' prints, heading right (toward the tower), each trail ending mid-stride.
    for (const [x0, n, row] of [[0, 9, 0], [6, 8, 2], [14, 6, 1]] as const) {
      for (let i = 0; i < n; i++) { c.fillStyle = `rgba(255,255,255,${0.55 + 0.45 * (i / n)})`; c.fillRect(x0 + i * 7, row + (i % 2), 3, 1); }
    }
  });
  canvasTex(scene, 'w_echo_prints', 56, 3, (c) => {
    // One heavy walker: the left print pressed deeper, as if carrying something in his arms.
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? 'rgba(255,255,255,0.6)' : '#ffffff'; c.fillRect(i * 7, i % 2 ? 0 : 1, i % 2 ? 3 : 4, i % 2 ? 1 : 2); }
  });
  canvasTex(scene, 'w_runes', 26, 12, (c) => {
    c.fillStyle = '#ffffff';
    // Five carved marks: a circle, a hand, a flame, a bell and a crossed line.
    c.fillRect(1, 3, 1, 5); c.fillRect(5, 3, 1, 5); c.fillRect(2, 2, 3, 1); c.fillRect(2, 8, 3, 1);
    c.fillRect(8, 5, 1, 4); c.fillRect(9, 3, 1, 6); c.fillRect(10, 2, 1, 7); c.fillRect(11, 4, 1, 5);
    c.fillRect(15, 2, 1, 1); c.fillRect(14, 3, 3, 2); c.fillRect(13, 5, 5, 3); c.fillRect(14, 8, 3, 1);
    c.fillRect(20, 2, 2, 1); c.fillRect(19, 3, 4, 4); c.fillRect(18, 7, 6, 1); c.fillRect(20, 8, 2, 1);
    c.fillRect(24, 1, 1, 9); c.fillRect(23, 5, 3, 1);
  });
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
  // Nia's dialogue portrait, drawn to sit with the others (head and shoulders, 3x in the box):
  // a little girl in her crimson dress and bonnet, with the same white flower.
  canvasTex(scene, 'pt_nia', 36, 54, (c) => {
    // One character per pixel; drawn at the same density as the other portraits.
    // Same costume as her sprite in the world: crimson dress, cream apron and bonnet.
    const MAP = [
      '......bBBBBBBb..W.....',
      '.....bBBBBBBBBbWYW....',
      '....bBBBBBBBBBBbW.....',
      '....BBRRRRRRRRBB......',
      '...bBOOoOOOOoOOBb.....',
      '...bBOOSSSSSSOOBb.....',
      '....BOSSSSSSSSOB......',
      '....bOSwESSSSwESOb....',
      '....bOSEESSSSEESOb....',
      '.....OsSSSSSSSSsO.....',
      '.....OsCSSSSSSCsO.....',
      '.....oOsSSMMSSsOo.....',
      '......oOssSSssOo......',
      '.....bBB.ssss.BBb.....',
      '......RRAAAAAARR......',
      '.....RRRAAAAAARRR.....',
      '....qRRRRAAAARRRRr....',
      '....qRRRRRAARRRRRr....',
      '...qRRRRRRRRRRRRRRr...',
      '...qRRRRRRRRRRRRRRr...',
      '...qRRRrRRRRRRrRRRr...',
      '...qRRRAAAAAAAaRRRr...',
      '..qRRRAAAAAAAAaRRRr...',
      '..qRRRAAAAAAAaaRRRr...',
      '..SRRRAAAAAAAaaRRRS...',
      '..SRRRAAAAAAAaaRRRS...',
      '..qRRRAAAAAAAaaRRRr...',
      '..qRRRAAAAAAAaaRRRr...',
      '..qRRRAAAAAAAaaRRRr...',
      '..qRRRAAAAAAAaaRRRr...',
      '..qRRRAAAAAAAaaRRRr...',
      '..qRRRAAAAAAAaaRRRr...',
      '..qRRRAAAAAAAaaRRRr...',
      '..qRRRAAAAAAAaaRRRr...',
      '..qRRRAAAAAAAaaRRRr...',
      '..qRRRAAAAAAAaaRRRr...',
      '..qRRRAAAAAAAaaRRRr...',
      '..qRRRAAAAAAAaaRRRr...',
      '.qRRRRAAAAAAAaaRRRRr..',
      '.qRRRRAAAAAAAaaRRRRr..',
      '.qRRRRAAAAAAAaaRRRRr..',
      '.qRRRRAAAAAAAaaRRRRr..',
      '.qRRRRAAAAAAAaaRRRRr..',
      '.qRRRRAAAAAAAaaRRRRr..',
      '.qRRRRAAAAAAAaaRRRRr..',
      '.qRRRRAAAAAAAaaRRRRr..',
      '.qRRRRAAAAAAAaaRRRRr..',
      '.qRRRRAAAAAAAaaRRRRr..',
    ];
    const PAL: Record<string, string> = {
      B: '#d9cbb4', b: '#9d8d76', R: '#741430', r: '#440a1c', q: '#982c48', A: '#d6c2a8', a: '#9e8a72',
      O: '#b56834', o: '#7a401c', S: '#d2bcae', s: '#9f8780', E: '#16121a', w: '#ffffff', C: '#c99494', M: '#7e4652',
      W: '#f4f0ff', Y: '#ffd860',
    };
    MAP.forEach((row, y) => [...row].forEach((ch, x) => { if (PAL[ch]) { c.fillStyle = PAL[ch]; c.fillRect(x + 7, y + 6, 1, 1); } }));
    // Painted-style shading: the gown darkens toward the hem and away from the light (top left).
    for (let y = 26; y < 54; y++) { c.fillStyle = `rgba(20,18,30,${Math.min(0.45, (y - 26) * 0.018)})`; c.fillRect(8, y, 21, 1); }
    c.fillStyle = 'rgba(20,18,30,0.22)'; c.fillRect(19, 24, 9, 30);
    c.fillStyle = 'rgba(255,255,255,0.10)'; c.fillRect(10, 24, 4, 20);
    // Grit: hollow, tired eyes, grime on the hem and cuffs, then grain over everything, so she
    // reads as weathered as the others rather than clean and new.
    c.fillStyle = 'rgba(40,30,50,0.35)'; c.fillRect(14, 15, 2, 1); c.fillRect(20, 15, 2, 1);
    c.fillStyle = 'rgba(30,24,20,0.35)';
    for (const [x, y, w, h] of [[10, 47, 3, 2], [15, 50, 4, 2], [23, 46, 2, 3], [26, 51, 2, 2], [9, 38, 2, 1], [25, 39, 2, 1], [18, 42, 1, 3]]) c.fillRect(x, y, w, h);
    const g = c.getImageData(0, 0, 36, 54);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < g.data.length; i += 4) {
      if (!g.data[i + 3]) continue;
      const k = 0.8 + rnd() * 0.28;
      g.data[i] *= k; g.data[i + 1] *= k; g.data[i + 2] *= k;
    }
    c.putImageData(g, 0, 0);
    // 1px dark outline around the whole silhouette, like the other portraits.
    const d = c.getImageData(0, 0, 36, 54).data;
    const ring = (data: Uint8ClampedArray, col: string) => {
      const on = (x: number, y: number) => x >= 0 && y >= 0 && x < 36 && y < 54 && data[(y * 36 + x) * 4 + 3] > 0;
      c.fillStyle = col;
      for (let y = 0; y < 54; y++) for (let x = 0; x < 36; x++) if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) c.fillRect(x, y, 1, 1);
    };
    ring(d, '#120e16');
    // The pale rim the other ghosts' portraits have.
    ring(c.getImageData(0, 0, 36, 54).data, '#8fb2d4');
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
