// Ivy's classroom candles: a "lights out" puzzle. Every candle you light (or snuff) also flips the
// candles beside it, above and below. Light them all and her memory shows. Drawn with the story
// kit: the school's desk planks, the world's candle sprite and its warm halo, the overlay layout of
// the other puzzles. Click a candle, or move the gold cursor with the arrows / WASD and press
// Space. UNDO, RESET, a HINT after 12 presses, and BACK to leave (the story waits for it).
//
//   await d.candles.play(IVY_CANDLES);
import Phaser from 'phaser';
import { TEXT_RESOLUTION, comicSettings } from '../comic';
import { H, W, label } from '../scenes/coreUi';
import type { Director } from '../world/Director';
import { PIX, panel, pbutton, ptext } from '../world/ui';
import { T } from '../world/tiles';
import { backButton } from './back';

export interface CandleSpec {
  title: string;
  how: string;
  size: number; // candles per side
  /** Presses that light every candle from the start (the start is built from them). */
  solution: number[];
  done?: string; // shown when every candle is lit
}

const DEPTH = 68;
const CELL = 112;
const HINT_AFTER = 12;

export class Candles {
  private d: Director;
  /** For tools/autoplay-story.ts: `auto()` presses the remaining solution. */
  state: { solved: boolean; auto: () => void } | null = null;

  constructor(d: Director) {
    this.d = d;
  }

  /** Resolves true when every candle is lit, or false if the player goes BACK. */
  async play(spec: CandleSpec): Promise<boolean> {
    const d = this.d, s = d.scene, n = spec.size;
    const tex = s.textures.get('wtiles');
    if (!tex.has('t1')) for (let id = 1; id < 28; id++) tex.add(`t${id}`, 0, id * 16, 0, 16, 16);
    d.busyUi = true;

    // Pressing a candle flips it and its four neighbours.
    const cross = (i: number) => {
      const x = i % n, y = Math.floor(i / n);
      return [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n).map(([a, b]) => b * n + a);
    };
    const start = new Array<boolean>(n * n).fill(true);
    for (const p of spec.solution) for (const c of cross(p)) start[c] = !start[c];
    let lit = [...start];
    // Presses commute and cancel in pairs, so what's still needed is the solution XOR what's pressed.
    let pressed = new Set<number>();
    const history: Set<number>[] = [];
    let presses = 0, won = false, cursor = Math.floor((n * n) / 2);

    const bw = n * CELL, bx = W / 2 - bw / 2, by = 320;
    const layer = s.add.container(0, 0).setDepth(DEPTH).setAlpha(0);
    layer.add(s.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setInteractive());
    layer.add(label(s, W / 2, 140, spec.title, 72, { color: '#e8fbff', strokeThickness: 12 }).setOrigin(0.5));
    layer.add(s.add.text(W / 2, 214, spec.how, { fontFamily: PIX, fontSize: '36px', color: '#cfe6ee', resolution: TEXT_RESOLUTION }).setOrigin(0.5));
    const note = ptext(s, W / 2, 268, '', 30, '#ffe08a').setOrigin(0.5);
    layer.add([note, panel(s, bx - 28, by - 28, bw + 56, bw + 56, 0.95)]);
    const count = ptext(s, bx + bw + 60, by, '', 30, '#aab8d8');
    layer.add(count);

    // The desks (planks) stay put; candles, halos and the cursor are redrawn.
    const still = comicSettings.reduceMotion;
    const cx = (i: number) => bx + (i % n) * CELL + CELL / 2, cy = (i: number) => by + Math.floor(i / n) * CELL + CELL / 2;
    for (let i = 0; i < n * n; i++) {
      layer.add(s.add.image(cx(i), cy(i), 'wtiles', `t${T.PLANK}`).setDisplaySize(CELL - 6, CELL - 6).setTint(0x8a7a6a));
    }
    const halos: Phaser.GameObjects.Image[] = [], wax: Phaser.GameObjects.Image[] = [], flames: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < n * n; i++) {
      halos.push(s.add.image(cx(i), cy(i) - 10, 'w_glow').setTint(0xffb860).setBlendMode(Phaser.BlendModes.ADD));
      // The world's candle sprite (4×8: flame on top, wax below), drawn at ×8.
      wax.push(s.add.image(cx(i), cy(i) + 34, 'w_candle').setOrigin(0.5, 1).setScale(8).setCrop(0, 3, 4, 5));
      flames.push(s.add.image(cx(i), cy(i) + 34, 'w_candle').setOrigin(0.5, 1).setScale(8).setCrop(0, 0, 4, 3));
    }
    layer.add([...halos, ...wax, ...flames]);
    const fx = s.add.graphics();
    layer.add(fx);
    for (const im of [...wax, ...flames]) im.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    let hover = -1, hintAt = -1;
    const draw = () => {
      for (let i = 0; i < n * n; i++) {
        flames[i].setVisible(lit[i]);
        wax[i].setTint(lit[i] ? 0xffffff : 0x6a6478);
        halos[i].setScale(lit[i] ? 1.1 : 0.01).setAlpha(lit[i] ? 0.55 : 0);
      }
      fx.clear();
      // Which candles the next press would flip (under the mouse, or the keyboard cursor).
      const at = hover >= 0 ? hover : cursor;
      for (const c of cross(at)) fx.lineStyle(3, 0xffe08a, c === at ? 1 : 0.45).strokeRoundedRect(cx(c) - CELL / 2 + 6, cy(c) - CELL / 2 + 6, CELL - 12, CELL - 12, 8);
      if (hintAt >= 0) fx.lineStyle(6, 0x7fe0d4, 1).strokeCircle(cx(hintAt), cy(hintAt), CELL / 2 - 4);
      count.setText(`LIT ${lit.filter(Boolean).length} OF ${n * n}\nPRESSES ${presses}`);
      hintBtn.setVisible(presses >= HINT_AFTER && !won);
      const shown = btns.filter((b) => b.visible);
      shown.forEach((b, k) => b.setX(W / 2 + (k - (shown.length - 1) / 2) * 220));
    };

    let resolveWin: () => void = () => undefined;
    const winP = new Promise<void>((r) => (resolveWin = r));
    const press = (i: number) => {
      if (won) return;
      history.push(new Set(pressed));
      if (pressed.has(i)) pressed.delete(i);
      else pressed.add(i);
      for (const c of cross(i)) lit[c] = !lit[c];
      presses++;
      hintAt = -1;
      note.setText('');
      d.audio.play('click', 0.3, lit[i] ? 300 : -500);
      if (!still) for (const c of cross(i)) if (lit[c]) s.tweens.add({ targets: halos[c], scale: 1.5, yoyo: true, duration: 160 });
      draw();
      if (lit.every(Boolean)) (won = true), resolveWin();
    };
    const replay = (set: Set<number>) => {
      pressed = set;
      lit = [...start];
      for (const p of pressed) for (const c of cross(p)) lit[c] = !lit[c];
      hintAt = -1;
      draw();
    };
    const undo = () => !won && history.length && replay(history.pop()!);
    const reset = () => {
      if (won) return;
      history.length = 0;
      replay(new Set());
    };
    const needed = () => [...Array(n * n).keys()].filter((i) => spec.solution.includes(i) !== pressed.has(i));
    const hint = () => {
      hintAt = needed()[0] ?? -1;
      note.setText('The lantern leans toward the candle circled in teal.');
      draw();
    };

    const row = by + bw + 90;
    const btns = [
      pbutton(s, 0, row, 200, 64, 'UNDO [Z]', undo, 30),
      pbutton(s, 0, row, 200, 64, 'RESET [R]', reset, 30),
      pbutton(s, 0, row, 200, 64, 'HINT', hint, 30),
    ];
    const [, , hintBtn] = btns;
    let resolveBack: () => void = () => undefined;
    const backP = new Promise<void>((r) => (resolveBack = r));
    const offBack = backButton(s, layer, () => !won && resolveBack());
    layer.add(btns);
    layer.add(ptext(s, W / 2, row + 62, 'Click a candle, or move with the arrow keys or WASD and press Space.', 28, '#aab8d8').setOrigin(0.5));

    const cellAt = (p: Phaser.Input.Pointer) => {
      const gx = Math.floor((p.x - bx) / CELL), gy = Math.floor((p.y - by) / CELL);
      return gx >= 0 && gy >= 0 && gx < n && gy < n ? gy * n + gx : -1;
    };
    const onMove = (p: Phaser.Input.Pointer) => {
      const c = cellAt(p);
      if (c !== hover) (hover = c), draw();
    };
    const onUp = (p: Phaser.Input.Pointer) => {
      const c = cellAt(p);
      if (c >= 0) press(c);
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const x = cursor % n, y = Math.floor(cursor / n);
      const mv: Record<string, [number, number]> = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };
      if (mv[k]) {
        hover = -1;
        cursor = Phaser.Math.Clamp(y + mv[k][1], 0, n - 1) * n + Phaser.Math.Clamp(x + mv[k][0], 0, n - 1);
        draw();
      } else if (k === ' ' || k === 'enter' || k === 'e') press(cursor);
      else if (k === 'z') undo();
      else if (k === 'r') reset();
    };
    s.input.on('pointermove', onMove);
    s.input.on('pointerup', onUp);
    s.input.keyboard?.on('keydown', onKey);

    const state = { solved: false, auto: () => needed().forEach((c, k) => s.time.delayedCall(150 * (k + 1), () => press(c))) };
    this.state = state;
    draw();
    s.tweens.add({ targets: layer, alpha: 1, duration: 200 });
    try {
      const back = await Promise.race([winP.then(() => false), backP.then(() => true), d.until(() => !d.alive).then(() => false)]);
      if (back) return false;
      state.solved = true;
      d.audio.tone('chime');
      for (const h of halos) s.tweens.add({ targets: h, scale: 2.2, alpha: 0.8, duration: 500 });
      layer.add(label(s, W / 2, by + bw / 2, spec.done ?? 'MEMORY FOUND', 90, { color: '#7fe0d4', strokeThickness: 14 }).setOrigin(0.5));
      await d.wait(1100);
      return true;
    } finally {
      offBack();
      s.input.off('pointermove', onMove);
      s.input.off('pointerup', onUp);
      s.input.keyboard?.off('keydown', onKey);
      this.state = null;
      s.tweens.add({ targets: layer, alpha: 0, duration: 250, onComplete: () => layer.destroy() });
      d.busyUi = false;
    }
  }
}

/** Episode 2: Ivy's classroom. 4×4 candles, six presses to light them all. */
export const IVY_CANDLES: CandleSpec = {
  title: 'LIGHT THE CLASSROOM',
  how: 'Every candle you light also flips the ones beside it. Light them all.',
  size: 4,
  solution: [0, 6, 9, 11, 12, 15],
  done: 'SOMEONE IS HERE',
};
