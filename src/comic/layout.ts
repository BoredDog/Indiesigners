import type { Rect } from './types';

export interface RowSpec {
  h: number; // relative row height
  cols: number[]; // relative column widths
}

/**
 * Splits `bounds` into comic panel frames, row by row, with `gutter` px between panels.
 * Example: Blueprint H2 "2×3 grid, P6 wide bottom" →
 *   gridFrames(b, [{h:1, cols:[1,1.2]}, {h:1.2, cols:[1,1]}, {h:1, cols:[0.7,1.3]}])
 */
export function gridFrames(bounds: Rect, rows: RowSpec[], gutter = 22, margin = 28): Rect[] {
  const inner = {
    x: bounds.x + margin,
    y: bounds.y + margin,
    w: bounds.w - margin * 2,
    h: bounds.h - margin * 2,
  };
  const totalH = rows.reduce((s, r) => s + r.h, 0);
  const usableH = inner.h - gutter * (rows.length - 1);
  const frames: Rect[] = [];
  let y = inner.y;
  for (const row of rows) {
    const rh = Math.round((row.h / totalH) * usableH);
    const totalW = row.cols.reduce((s, c) => s + c, 0);
    const usableW = inner.w - gutter * (row.cols.length - 1);
    let x = inner.x;
    for (const c of row.cols) {
      const cw = Math.round((c / totalW) * usableW);
      frames.push({ x, y, w: cw, h: rh });
      x += cw + gutter;
    }
    y += rh + gutter;
  }
  return frames;
}
