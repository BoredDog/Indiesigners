import Phaser from 'phaser';
import type { Dir } from '../../puzzle/types';

/**
 * V19: isometric "3D" view of the Echo Paths board (the Lara Croft GO look of the Godot diorama,
 * drawn in Phaser). Grid point (gc, gr) projects to the screen as a 2:1 diamond: +column runs
 * down-right, +row runs down-left. The flat top faces are the normal 2D drawing inside a container
 * rotated 45° and squashed to half height, so the board art and the ink stay identical to 2D.
 */
export class IsoGeom {
  /** Height of a floor slab's sides, of a pillar, and of a closed gate (screen px). */
  readonly slab: number;
  readonly pillar: number;
  readonly gate: number;
  readonly w: number;
  readonly h: number;
  /** Diamond width of one tile. */
  readonly tw: number;
  /** Screen position of grid corner (0, 0): the top corner of the board. */
  readonly x0: number;
  readonly y0: number;

  constructor(w: number, h: number, tw: number, x0: number, y0: number) {
    this.w = w;
    this.h = h;
    this.tw = tw;
    this.x0 = x0;
    this.y0 = y0;
    this.slab = Math.round(tw * 0.14);
    this.pillar = Math.round(tw * 0.5);
    this.gate = Math.round(tw * 0.3);
  }

  /** Diamond height of one tile. */
  get th(): number {
    return this.tw / 2;
  }

  /** Side of a flat tile before the 45° turn + half-height squash (the 2D drawing's tile size). */
  get flat(): number {
    return this.tw / Math.SQRT2;
  }

  /** Grid point (continuous column, row) → screen. */
  pt(gc: number, gr: number): { x: number; y: number } {
    return { x: this.x0 + ((gc - gr) * this.tw) / 2, y: this.y0 + ((gc + gr) * this.th) / 2 };
  }

  /** Screen centre of tile i's top face. */
  centre(i: number): { x: number; y: number } {
    return this.pt((i % this.w) + 0.5, Math.floor(i / this.w) + 0.5);
  }

  /** Screen → tile column/row (may be outside the board). */
  tileAt(x: number, y: number): [number, number] {
    const u = (x - this.x0) / (this.tw / 2);
    const v = (y - this.y0) / (this.th / 2);
    return [Math.floor((u + v) / 2), Math.floor((v - u) / 2)];
  }

  /** Unit screen vector for a grid direction (N = row - 1 → up-right). */
  dir(d: Dir): [number, number] {
    const [gc, gr] = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[d];
    const x = ((gc - gr) * this.tw) / 2;
    const y = ((gc + gr) * this.th) / 2;
    const len = Math.hypot(x, y);
    return [x / len, y / len];
  }

  /** Screen rectangle around the whole board (top faces only). */
  bounds(): { x: number; y: number; w: number; h: number } {
    const left = this.x0 - (this.h * this.tw) / 2;
    return { x: left, y: this.y0, w: ((this.w + this.h) * this.tw) / 2, h: ((this.w + this.h) * this.th) / 2 };
  }

  /**
   * Painter's order: anything standing on screen row y draws over things further back. Tiles on
   * the same diagonal never overlap, so (column + row) is enough. Range 30..~30.5 fits between
   * the goal word (20) and the light glyph (45) of the 2D layering.
   */
  depthAt(y: number): number {
    return 30 + ((y - this.y0) / (this.th / 2)) * 0.01;
  }

  /** Fit a w×h board into a screen box centred on (cx, cy). */
  static fit(w: number, h: number, box: { cx: number; cy: number; w: number; h: number }): IsoGeom {
    const n = w + h;
    // Total height = diamond (n·tw/4) + slab below + pillar above.
    const tw = Math.floor(Math.min(250, (box.w * 2) / n, box.h / (n / 4 + 0.64)));
    const x0 = box.cx - ((w - h) * tw) / 4;
    const y0 = box.cy - ((n * tw) / 4 + tw * 0.14 - tw * 0.5) / 2;
    return new IsoGeom(w, h, tw, Math.round(x0), Math.round(y0));
  }
}

export interface PrismColours {
  top?: number;
  left: number;
  right: number;
  stroke?: number;
}

/**
 * A box standing on tile (c, r), inset on every side, from height `bottom` to `top` (screen px
 * above the floor; negative = below). Draws the two faces the camera sees, plus the top if given.
 */
export function prism(
  g: Phaser.GameObjects.Graphics,
  iso: IsoGeom,
  c: number,
  r: number,
  inset: number,
  bottom: number,
  top: number,
  col: PrismColours,
) {
  const p = (gc: number, gr: number, hgt: number) => {
    const q = iso.pt(gc, gr);
    return new Phaser.Math.Vector2(q.x, q.y - hgt);
  };
  const a = c + inset;
  const b = c + 1 - inset;
  const ra = r + inset;
  const rb = r + 1 - inset;
  const stroke = col.stroke ?? 0x111114;
  const left = [p(a, rb, top), p(b, rb, top), p(b, rb, bottom), p(a, rb, bottom)];
  const right = [p(b, rb, top), p(b, ra, top), p(b, ra, bottom), p(b, rb, bottom)];
  g.fillStyle(col.left, 1).fillPoints(left, true);
  g.fillStyle(col.right, 1).fillPoints(right, true);
  g.lineStyle(3, stroke, 1).strokePoints(left, true).strokePoints(right, true);
  if (col.top !== undefined) {
    const lid = [p(a, ra, top), p(b, ra, top), p(b, rb, top), p(a, rb, top)];
    g.fillStyle(col.top, 1).fillPoints(lid, true);
    g.lineStyle(3, stroke, 1).strokePoints(lid, true);
  }
}
