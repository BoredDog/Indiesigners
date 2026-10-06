// Builds the Veyra map as plain data (no Phaser), Terraria-style: a solid block layer, a
// background-wall layer, water, props and named anchors the story script uses.
//
//   x:  0    4 ── cemetery ── 26 ── town (school · house · CLOCK TOWER · workshop) ── 150 ─ river + dock ─ 236
//   y:  sky … SURF (street level) … dirt … stone; under the well: shaft → tunnel → archive vault → deepest chamber
import { T, TILE } from './tiles';

export const WT = 240; // world width in tiles
export const HT = 110; // world height in tiles
export const SURF = 60; // street level (first solid row)

export interface Prop { key: string; x: number; y: number; depth?: number; id?: string; flip?: boolean; scale?: number }
export interface StaticLight { x: number; y: number; r: number; id?: string }
export interface FogZone { x: number; y: number; w: number; h: number; density?: number }
export interface World {
  fg: number[][];
  bg: number[][];
  water: boolean[][];
  props: Prop[];
  lights: StaticLight[];
  fog: FogZone[];
  anchors: Record<string, { x: number; y: number }>; // pixel coords (x centre, y = feet / floor)
}

const px = (tx: number) => tx * TILE;
const floorY = (row: number) => row * TILE; // top of a solid row = where feet stand

/** Tile x of key places (shared with the story script through anchors). */
export const X = {
  cemetery: 12, well: 40, school: 52, house: 67, towerL: 80, towerR: 88, workshop: 103, square: 125,
  dockStart: 160, dockEnd: 178, riverL: 156, riverR: 200,
  vault: 64, collapse: 92, chamber: 118,
  pitL: 75, pitR: 86, // the echo bridge's pit, between the vault and the collapse
};

export function generateWorld(): World {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647);
  const fg = Array.from({ length: HT }, () => new Array<number>(WT).fill(T.EMPTY));
  const bg = Array.from({ length: HT }, () => new Array<number>(WT).fill(T.EMPTY));
  const water = Array.from({ length: HT }, () => new Array<boolean>(WT).fill(false));
  const props: Prop[] = [];
  const lights: StaticLight[] = [];
  const fog: FogZone[] = [];
  const anchors: World['anchors'] = {};
  const set = (x: number, y: number, t: number) => { if (x >= 0 && x < WT && y >= 0 && y < HT) fg[y][x] = t; };
  const carve = (x0: number, y0: number, x1: number, y1: number) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, T.EMPTY); };

  // ---- ground: dirt band, then stone (2×2 block pattern), surface dressed below ----
  for (let y = SURF; y < HT; y++) {
    for (let x = 0; x < WT; x++) {
      const depth = y - SURF;
      if (depth < 9) fg[y][x] = [T.DIRT, T.DIRT2, T.DIRT3][Math.floor(rnd() * 3)];
      else fg[y][x] = (x % 2 ? (y % 2 ? T.STONE_BR : T.STONE_TR) : (y % 2 ? T.STONE_BL : T.STONE_TL));
      bg[y][x] = depth < 9 ? T.DIRT_BG : T.STONE_BG;
    }
  }
  // Surface: cemetery grass, town cobbles, grass riverbanks.
  for (let x = 0; x < WT; x++) {
    const town = x >= 26 && x < 150;
    const grass = [T.GRASS, T.GRASS2, T.GRASS3][Math.floor(rnd() * 3)];
    fg[SURF][x] = town ? (x % 2 ? T.COBBLE : T.COBBLE2) : grass;
    // The cemetery path turns into the street over a dozen tiles: grass, then the odd stone,
    // then mossy cobbles, then clean paving.
    if (x >= 20 && x < 34) {
      const t = (x - 20) / 14, r = rnd();
      fg[SURF][x] = r > t + 0.25 ? grass : r > t - 0.3 ? T.COBBLE_MOSS : x % 2 ? T.COBBLE : T.COBBLE2;
    }
  }
  // World edges: stone walls, except above ground at the east end past the river, where the
  // village fades into fog instead (StoryScene stops Elias inside it with an invisible wall).
  for (let y = 0; y < HT; y++) for (const x of [0, 1, 2, WT - 3, WT - 2, WT - 1]) if (x < 3 || y > SURF) set(x, y, T.STONE2);
  fog.push({ x: px(WT - 22), y: floorY(SURF) - 120, w: px(22), h: 120, density: 2.4 });
  fog.push({ x: px(WT - 12), y: floorY(SURF) - 200, w: px(12), h: 200, density: 3.2 });

  // ---- river + dock ----
  // In the present the river is dry: a shallow bed of cracked mud you can walk across and climb
  // out of. The water only comes back inside Luke's memory (StoryScene.setRiver).
  for (let x = X.riverL; x <= X.riverR; x++) {
    const d = Math.min(x - X.riverL, X.riverR - x, 3);
    for (let y = SURF; y < SURF + d; y++) {
      set(x, y, T.EMPTY);
      water[y][x] = true;
    }
    if (d > 0) set(x, SURF + d, T.MUD);
  }
  for (let x = X.dockStart; x <= X.dockEnd; x++) {
    set(x, SURF - 1, T.PLANK);
    if (x % 4 === 0) for (let y = SURF; y < SURF + 6; y++) if (fg[y][x] === T.EMPTY) bg[y][x] = T.WOODLEGS;
  }
  anchors.dock = { x: px(X.dockEnd - 1), y: floorY(SURF - 1) };
  anchors.river = { x: px(X.riverL - 3), y: floorY(SURF) };
  // The last boat, stranded on the riverbed (it floats again in Luke's memory).
  props.push({ key: 'w_boat', x: px(X.dockEnd + 3), y: floorY(SURF + 3) + 2, id: 'boat', depth: 4 });
  fog.push({ x: px(X.riverL), y: floorY(SURF) - 50, w: px(X.riverR - X.riverL), h: 60 });

  // ---- clock tower (built from blocks; climb the plank platforms inside) ----
  const top = SURF - 32;
  for (let y = top; y < SURF; y++) {
    set(X.towerL, y, y % 2 ? T.TOWNWALL : T.TOWNWALL2);
    set(X.towerR, y, y % 2 ? T.TOWNWALL : T.TOWNWALL2);
    for (let x = X.towerL + 1; x < X.towerR; x++) bg[y][x] = [T.BRICK_BG, T.BRICK_BG2, T.BRICK_BG3][(x + y) % 3];
  }
  for (let x = X.towerL - 1; x <= X.towerR + 1; x++) set(x, top - 1, T.STONE2);
  for (let x = X.towerL; x <= X.towerR; x++) set(x, top - 2, T.STONE2);
  // Doors on both sides, so the street runs through the tower.
  carve(X.towerL, SURF - 3, X.towerL, SURF - 1);
  carve(X.towerR, SURF - 3, X.towerR, SURF - 1);
  // Climbable: one-way planks every 3 blocks (a jump clears ~4), zig-zagging but overlapping in the
  // middle column so you can also just jump straight up through them.
  for (let i = 1; SURF - i * 3 > top + 3; i++) {
    const y = SURF - i * 3;
    const left = i % 2 === 1;
    for (let x = left ? X.towerL + 1 : X.towerL + 4; x <= (left ? X.towerL + 5 : X.towerR - 1); x++) set(x, y, T.PLANK);
  }
  for (let x = X.towerL + 1; x < X.towerR; x++) set(x, top + 2, T.PLANK); // bell floor
  anchors.towerDoor = { x: px(X.towerL) - 8, y: floorY(SURF) };
  anchors.bell = { x: px(X.towerL + 4) + 8, y: floorY(top + 2) };
  props.push({ key: 'pt_rope', x: px(X.towerL + 6), y: floorY(top + 2), scale: 0.35, id: 'rope', depth: 3 });
  // Spire + clock face on top, candle-lit arched windows and a candle on each landing inside.
  const towerMid = px(X.towerL + 4) + 8;
  props.push({ key: 'w_spire', x: towerMid, y: floorY(top - 2), depth: -0.5 });
  props.push({ key: 'w_clock', x: towerMid, y: floorY(top - 2) - 14, id: 'clock', depth: 6, scale: 1.4 });
  lights.push({ x: towerMid, y: floorY(top - 2) - 36, r: 6, id: 'towerclock' });
  for (const wy of [SURF - 6, SURF - 15, SURF - 24]) {
    props.push({ key: 'w_towerwin', x: towerMid, y: floorY(wy), depth: -0.5 });
    lights.push({ x: towerMid, y: floorY(wy) - 30, r: 5 });
  }
  for (let i = 1; SURF - i * 3 > top + 3; i += 2) {
    const ly = SURF - i * 3;
    props.push({ key: 'w_candle', x: px(X.towerL + 1) + 8, y: floorY(ly), depth: 2 });
  }
  anchors.clock = { x: towerMid, y: floorY(top - 2) - 36 };
  // Cobwebs: both top corners under the bell, and a few in the corners of the landings.
  props.push({ key: 'w_web', x: px(X.towerL + 1) + 10, y: floorY(top) + 20, depth: 1 });
  props.push({ key: 'w_web', x: px(X.towerR - 1) + 6, y: floorY(top) + 20, depth: 1, flip: true });
  for (const [wy, right] of [[SURF - 9, true], [SURF - 18, false], [SURF - 27, true]] as const) {
    props.push({ key: 'w_web', x: right ? px(X.towerR - 1) + 6 : px(X.towerL + 1) + 10, y: floorY(wy) + 20, depth: 1, flip: right });
  }
  // A cold cloud that clings to the spire and spills down the tower's shoulders.
  fog.push({ x: towerMid - 110, y: floorY(top - 11), w: 220, h: 110, density: 2.2 });
  fog.push({ x: towerMid - 160, y: floorY(top + 1), w: 320, h: 60, density: 1.3 });

  // ---- houses, well, lamps, clutter ----
  props.push({ key: 'w_cem_graveyard', x: px(X.cemetery), y: floorY(SURF), depth: -5 });
  fog.push({ x: px(3), y: floorY(SURF) - 70, w: px(26), h: 70 });
  props.push({ key: 'gv_house-a', x: px(X.school), y: floorY(SURF), id: 'school', depth: -2 });
  props.push({ key: 'gv_house-c', x: px(X.house), y: floorY(SURF), id: 'house', depth: -2 });
  props.push({ key: 'gv_house-b', x: px(X.workshop), y: floorY(SURF), depth: -2 });
  props.push({ key: 'gv_well', x: px(X.well) + 8, y: floorY(SURF), id: 'well', depth: 2 });
  props.push({ key: 'gv_wagon', x: px(116), y: floorY(SURF), depth: 1 });
  props.push({ key: 'gv_crate-stack', x: px(132), y: floorY(SURF), depth: 1 });
  props.push({ key: 'gv_barrel', x: px(136), y: floorY(SURF), depth: 1 });
  props.push({ key: 'gv_sign', x: px(30), y: floorY(SURF), depth: 1 });
  for (const lx of [34, 46, 76, 94, 112, 142, 154]) {
    props.push({ key: 'gv_street-lamp', x: px(lx), y: floorY(SURF), depth: 1 });
    lights.push({ x: px(lx), y: floorY(SURF) - 96, r: 7 });
  }
  lights.push({ x: px(X.school) - 30, y: floorY(SURF) - 70, r: 4 }, { x: px(X.house) + 40, y: floorY(SURF) - 90, r: 3 });
  anchors.school = { x: px(X.school), y: floorY(SURF) };
  anchors.house = { x: px(X.house), y: floorY(SURF) };
  anchors.well = { x: px(X.well) + 8, y: floorY(SURF) };
  anchors.footprints = { x: px(X.towerL - 6), y: floorY(SURF) };
  anchors.square = { x: px(X.square), y: floorY(SURF) };
  anchors.start = { x: px(6), y: floorY(SURF) };
  anchors.houseWindow = { x: px(X.house) + 40, y: floorY(SURF) - 104 };

  // ---- under the well: shaft (sealed until the key), rubble to dig, tunnel, vault, chamber ----
  const shaftBottom = SURF + 23;
  carve(X.well - 1, SURF + 1, X.well + 1, shaftBottom);
  for (let y = SURF + 3; y <= SURF + 6; y++) for (let x = X.well - 1; x <= X.well + 1; x++) set(x, y, T.RUBBLE);
  // Below the rubble the shaft opens into a wide drop. Planks zig-zag down it: the wooden ones
  // are real; the others (descentTiles) exist only in the lantern's light (src/story/descent.ts).
  // Every safe step down is four blocks, always onto the next plank (the teal ones need the
  // lantern). The wooden planks are eight apart and the last is six above the floor: deadly drops.
  carve(X.well - 6, SURF + 7, X.well + 6, shaftBottom);
  for (const [y, x0, x1] of [[SURF + 10, X.well - 2, X.well + 2], [SURF + 18, X.well - 3, X.well + 2]]) for (let x = x0; x <= x1; x++) set(x, y, T.PLANK);
  anchors.shaft = { x: px(X.well) + 8, y: floorY(shaftBottom + 1) };
  // Tunnel along the bottom of the shaft.
  carve(X.well - 1, shaftBottom - 3, 104, shaftBottom);
  // Archive vault (taller room) with lecterns and candles.
  carve(X.vault - 9, shaftBottom - 9, X.vault + 9, shaftBottom);
  for (let y = shaftBottom - 9; y <= shaftBottom; y++) for (let x = X.vault - 9; x <= X.vault + 9; x++) bg[y][x] = [T.BRICK_BG, T.BRICK_BG2, T.BRICK_BG3][(x * 7 + y) % 3];
  for (const [i, dx] of [-6, 0, 6].entries()) {
    props.push({ key: 'w_lectern', x: px(X.vault + dx) + 8, y: floorY(shaftBottom + 1), id: `lectern${i}`, depth: 2 });
    anchors[`lectern${i}`] = { x: px(X.vault + dx) + 8, y: floorY(shaftBottom + 1) };
  }
  for (const dx of [-8, -3, 3, 8]) {
    props.push({ key: 'w_candle', x: px(X.vault + dx) + 8, y: floorY(shaftBottom - 4), depth: 2 });
    lights.push({ x: px(X.vault + dx) + 8, y: floorY(shaftBottom - 4) - 6, r: 5 });
  }
  anchors.vault = { x: px(X.vault), y: floorY(shaftBottom + 1) };
  anchors.collapse = { x: px(X.collapse), y: floorY(shaftBottom + 1) };
  // Cobwebs in the vault's top corners.
  props.push({ key: 'w_web', x: px(X.vault - 9) + 10, y: floorY(shaftBottom - 9) + 20, depth: 1 });
  props.push({ key: 'w_web', x: px(X.vault + 9) + 6, y: floorY(shaftBottom - 9) + 20, depth: 1, flip: true });
  // The echo bridge: a pit too wide to jump, under a taller cavern. Its bridge only exists in the
  // lantern's light (src/story/bridge.ts). A plank on the pit wall climbs back out.
  carve(X.pitL, shaftBottom - 6, X.pitR, shaftBottom);
  carve(X.pitL, shaftBottom + 1, X.pitR, shaftBottom + 5);
  set(X.pitL, shaftBottom + 3, T.PLANK);
  set(X.pitL + 1, shaftBottom + 3, T.PLANK);
  anchors.pit = { x: px(X.pitL), y: floorY(shaftBottom + 1) };
  fog.push({ x: px(X.pitL), y: floorY(shaftBottom + 1), w: px(X.pitR - X.pitL + 1), h: 70, density: 1.6 });
  // Drop into the deepest chamber.
  const chamberFloor = SURF + 36;
  carve(100, shaftBottom - 3, 106, chamberFloor - 1);
  carve(X.chamber - 12, chamberFloor - 12, X.chamber + 12, chamberFloor - 1);
  for (let y = chamberFloor - 12; y < chamberFloor; y++) for (let x = X.chamber - 12; x <= X.chamber + 12; x++) bg[y][x] = [T.BRICK_BG, T.BRICK_BG2, T.BRICK_BG3][(x + y * 3) % 3];
  for (let i = 0; i < 4; i++) set(101 + (i % 2) * 4, shaftBottom + 3 + i * 3, T.PLANK);
  props.push({ key: 'w_pedestal', x: px(X.chamber) + 8, y: floorY(chamberFloor), id: 'pedestal', depth: 2 });
  props.push({ key: 'pt_lantern', x: px(X.chamber) + 8, y: floorY(chamberFloor) - 17, id: 'echo', depth: 3, scale: 0.4 });
  props.push({ key: 'gv_column', x: px(X.chamber - 9), y: floorY(chamberFloor), depth: -1, scale: 0.8 });
  props.push({ key: 'gv_column', x: px(X.chamber + 9), y: floorY(chamberFloor), depth: -1, scale: 0.8, flip: true });
  anchors.chamber = { x: px(X.chamber), y: floorY(chamberFloor) };
  props.push({ key: 'w_web', x: px(X.chamber - 12) + 10, y: floorY(chamberFloor - 12) + 20, depth: 1 });
  props.push({ key: 'w_web', x: px(X.chamber + 12) + 6, y: floorY(chamberFloor - 12) + 20, depth: 1, flip: true });
  fog.push({ x: px(X.chamber - 12), y: floorY(chamberFloor) - 40, w: px(24), h: 40, density: 0.8 });
  anchors.pedestal = { x: px(X.chamber) + 8, y: floorY(chamberFloor) - 22 };
  lights.push({ x: px(X.chamber) + 8, y: floorY(chamberFloor) - 22, r: 4 }); // the Echo Lantern smoulders even before it wakes
  anchors.shaftTop = { x: px(X.well) + 8, y: floorY(SURF + 1) };

  return { fg, bg, water, props, lights, fog, anchors };
}

/** Story hook: seal / open the well shaft (surface tiles over it). */
export function wellTiles(): [number, number][] {
  return [[X.well - 1, SURF], [X.well, SURF], [X.well + 1, SURF]];
}
/** Tiles that fall in when the tunnel collapses behind you. */
/** The well descent's echo planks (only solid in the lantern's light). */
export function descentTiles(): [number, number][] {
  const out: [number, number][] = [];
  for (const [y, x0, x1] of [[SURF + 14, X.well + 3, X.well + 6], [SURF + 22, X.well + 3, X.well + 6]]) for (let x = x0; x <= x1; x++) out.push([x, y]);
  return out;
}
/** The echo bridge's planks across the pit (two are missing even in the memory). */
export function bridgeTiles(): [number, number][] {
  const out: [number, number][] = [];
  for (let x = X.pitL; x <= X.pitR; x++) if (x !== X.pitL + 4 && x !== X.pitL + 8) out.push([x, SURF + 24]);
  return out;
}
export function collapseTiles(): [number, number][] {
  const out: [number, number][] = [];
  for (let y = SURF + 20; y <= SURF + 23; y++) for (let x = X.collapse - 3; x <= X.collapse - 2; x++) out.push([x, y]);
  return out;
}
