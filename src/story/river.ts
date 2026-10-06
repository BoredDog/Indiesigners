// Luke's river: turn the river back. The dry riverbed is a grid of channel pieces (straight, bend,
// fork); click one to turn it. Water runs live from the river (left) through every channel that
// meets the next one, and the river reaches the dock (right) when a path is complete. The catch:
// no spills. Any open end the water reaches that doesn't meet another channel pours into the mud,
// and the boat won't float until nothing spills. Drawn with the story kit: the riverbed mud and
// water tiles, stone for rocks, the stranded boat at the dock, the usual overlay and blue panel.
//
//   await d.river.play(LUKE_RIVER);
import Phaser from 'phaser';
import { TEXT_RESOLUTION, comicSettings } from '../comic';
import { H, W, label } from '../scenes/coreUi';
import type { Director } from '../world/Director';
import { PIX, panel, pbutton, ptext } from '../world/ui';
import { T } from '../world/tiles';

// Openings as bits: N 1, E 2, S 4, W 8. Turning clockwise moves each bit one place.
const N = 1, E = 2, S = 4, Wb = 8;
const turn = (m: number, k = 1) => {
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) m = ((m << 1) | (m >> 3)) & 15;
  return m;
};
const STEP: [number, number, number, number][] = [[N, 0, -1, S], [E, 1, 0, Wb], [S, 0, 1, N], [Wb, -1, 0, E]]; // bit, dx, dy, opposite

export interface RiverSpec {
  title: string;
  how: string;
  w: number;
  h: number;
  /** One char per cell: '|' straight, 'L' bend, 'T' fork, '+' cross, '#' rock, '.' bare mud. */
  pieces: string[];
  /** The solved openings per cell (only the path matters; others may be anything). */
  solved: Record<string, number>; // "x,y" -> mask
  /** Quarter turns applied to every piece at the start (one digit per cell). */
  scramble: string[];
  source: number; // row where the river enters on the left
  dock: number; // row where the dock is on the right
  done?: string;
}

const DEPTH = 68;
const BASE: Record<string, number> = { '|': N | S, L: N | E, T: N | E | S, '+': 15, '#': 0, '.': 0 };
const HINT_AFTER = 15, SKIP_AFTER = 45;

export class River {
  private d: Director;
  /** For tools/autoplay-story.ts: `auto()` turns every piece to its solved position. */
  state: { solved: boolean; auto: () => void } | null = null;

  constructor(d: Director) {
    this.d = d;
  }

  async play(spec: RiverSpec): Promise<void> {
    const d = this.d, s = d.scene, { w, h } = spec;
    const tex = s.textures.get('wtiles');
    if (!tex.has('t1')) for (let id = 1; id < 28; id++) tex.add(`t${id}`, 0, id * 16, 0, 16, 16);
    d.busyUi = true;

    const kind = (i: number) => spec.pieces[Math.floor(i / w)][i % w];
    const turnable = (i: number) => BASE[kind(i)] !== 0 && kind(i) !== '+';
    const start = Array.from({ length: w * h }, (_, i) => turn(BASE[kind(i)], Number(spec.scramble[Math.floor(i / w)][i % w])));
    let mask = [...start];
    const history: number[][] = [];
    let turns = 0, won = false, cursor = spec.source * w;

    const CELL = Math.min(96, Math.floor(560 / Math.max(w, h)));
    const bw = w * CELL, bh = h * CELL, bx = W / 2 - bw / 2, by = 330;
    const cx = (i: number) => bx + (i % w) * CELL + CELL / 2, cy = (i: number) => by + Math.floor(i / w) * CELL + CELL / 2;

    const layer = s.add.container(0, 0).setDepth(DEPTH).setAlpha(0);
    layer.add(s.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setInteractive());
    layer.add(label(s, W / 2, 140, spec.title, 72, { color: '#e8fbff', strokeThickness: 12 }).setOrigin(0.5));
    layer.add(s.add.text(W / 2, 214, spec.how, { fontFamily: PIX, fontSize: '36px', color: '#cfe6ee', resolution: TEXT_RESOLUTION }).setOrigin(0.5));
    const note = ptext(s, W / 2, 268, '', 30, '#ffe08a').setOrigin(0.5);
    layer.add([note, panel(s, bx - 120, by - 28, bw + 240, bh + 56, 0.95)]);
    const count = ptext(s, bx + bw + 140, by, '', 30, '#aab8d8');
    layer.add(count);

    // The riverbed (cracked mud), the river coming in on the left, the boat waiting on the right.
    for (let i = 0; i < w * h; i++) {
      layer.add(s.add.rectangle(cx(i), cy(i), CELL, CELL, 0x2a2018).setStrokeStyle(1, 0x05040a, 0.8));
      layer.add(s.add.image(cx(i), cy(i), 'wtiles', `t${T.MUD}`).setDisplaySize(CELL, CELL).setAlpha(0.18));
      if (kind(i) === '#') {
        layer.add(s.add.rectangle(cx(i) + 3, cy(i) + 5, CELL - 14, CELL - 14, 0x05040a, 0.6));
        layer.add(s.add.image(cx(i), cy(i), 'wtiles', `t${T.STONE2}`).setDisplaySize(CELL - 14, CELL - 14).setTint(0xfff4e0));
      }
    }
    const inY = by + spec.source * CELL + CELL / 2, outY = by + spec.dock * CELL + CELL / 2;
    layer.add(s.add.rectangle(bx - 46, inY, 80, Math.round(CELL * 0.4), 0x5fa8d8).setStrokeStyle(4, 0xb88a4a));
    layer.add(ptext(s, bx - 46, inY - CELL / 2 - 4, 'RIVER', 24, '#bfefff').setOrigin(0.5, 1));
    const boat = s.add.image(bx + bw + 60, outY + 18, 'w_boat').setScale(2.4).setAngle(8);
    boat.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    layer.add([boat, ptext(s, bx + bw + 60, outY - CELL / 2 - 4, 'DOCK', 24, '#bfefff').setOrigin(0.5, 1)]);
    const pipes = s.add.graphics();
    const fx = s.add.graphics();
    layer.add([pipes, fx]);

    /** Water from the river: every cell it reaches, which openings spill, and whether the dock is reached. */
    const flow = () => {
      const wet = new Set<number>(), spills: [number, number][] = [];
      let reached = false;
      const first = spec.source * w;
      if (!(mask[first] & Wb)) return { wet, spills, reached };
      const q = [first];
      wet.add(first);
      while (q.length) {
        const i = q.shift()!, x = i % w, y = Math.floor(i / w);
        for (const [bit, dx, dy, opp] of STEP) {
          if (!(mask[i] & bit)) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 && ny === spec.source) continue; // the river itself
          if (nx >= w && ny === spec.dock) { reached = true; continue; }
          const j = ny * w + nx;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || !(mask[j] & opp)) { spills.push([i, bit]); continue; }
          if (!wet.has(j)) (wet.add(j), q.push(j));
        }
      }
      return { wet, spills, reached };
    };

    let hover = -1, hintAt = -1;
    const still = comicSettings.reduceMotion;
    const draw = () => {
      const { wet, spills, reached } = flow();
      pipes.clear();
      const arm = CELL / 2, half = Math.round(CELL * 0.18);
      for (let i = 0; i < w * h; i++) {
        const m = mask[i];
        if (!m) continue;
        const x = cx(i), y = cy(i);
        const water = wet.has(i);
        // A plank-lined channel: all the wood edges first, then the trench (water when it's wet) on top.
        const arms = STEP.filter(([bit]) => m & bit).map(([, dx, dy]) => ({
          x: dx ? (dx > 0 ? x : x - arm) : x - half, y: dy ? (dy > 0 ? y : y - arm) : y - half, w: dx ? arm : half * 2, h: dy ? arm : half * 2, dx, dy,
        }));
        pipes.fillStyle(0xb88a4a, 1).fillRect(x - half - 5, y - half - 5, half * 2 + 10, half * 2 + 10);
        for (const r of arms) pipes.fillRect(r.x - (r.dx ? 0 : 5), r.y - (r.dy ? 0 : 5), r.w + (r.dx ? 0 : 10), r.h + (r.dy ? 0 : 10));
        pipes.fillStyle(water ? 0x5fa8d8 : 0x0c0a08, 1).fillRect(x - half, y - half, half * 2, half * 2);
        for (const r of arms) pipes.fillRect(r.x, r.y, r.w, r.h);
        if (water) pipes.fillStyle(0xbfe4ff, 0.55).fillRect(x - half + 3, y - half + 3, 6, 6);
      }
      // Spills: the water pours into the mud there.
      fx.clear();
      for (const [i, bit] of spills) {
        const [, dx, dy] = STEP.find(([b]) => b === bit)!;
        const ex = cx(i) + (dx * CELL) / 2, ey = cy(i) + (dy * CELL) / 2;
        fx.fillStyle(0x5fa8d8, 0.85).fillCircle(ex, ey, 12).fillStyle(0xe07070, 1).fillCircle(ex, ey, 5);
      }
      const at = hover >= 0 ? hover : cursor;
      if (at >= 0 && turnable(at)) fx.lineStyle(4, 0xffe08a, 1).strokeRoundedRect(cx(at) - CELL / 2 + 3, cy(at) - CELL / 2 + 3, CELL - 6, CELL - 6, 8);
      if (hintAt >= 0) fx.lineStyle(6, 0x7fe0d4, 1).strokeCircle(cx(hintAt), cy(hintAt), CELL / 2 - 4);
      count.setText(`TURNS ${turns}\nSPILLS ${spills.length}`);
      hintBtn.setVisible(turns >= HINT_AFTER && !won);
      skipBtn.setVisible(turns >= SKIP_AFTER && !won);
      const shown = btns.filter((b) => b.visible);
      shown.forEach((b, k) => b.setX(W / 2 + (k - (shown.length - 1) / 2) * 220));
      if (!won && reached && spills.length === 0) (won = true), resolveWin();
      else if (reached && spills.length) note.setText('The river reaches the dock, but it’s spilling into the mud. Close every open end.');
      return reached;
    };

    let resolveWin: () => void = () => undefined;
    const winP = new Promise<void>((r) => (resolveWin = r));
    const rotate = (i: number, k = 1) => {
      if (won || i < 0 || !turnable(i)) return;
      history.push([...mask]);
      mask[i] = turn(mask[i], k);
      turns++;
      hintAt = -1;
      note.setText('');
      d.audio.play('creak3', 0.25, 400 - k * 200);
      draw();
    };
    const undo = () => {
      if (won || !history.length) return;
      mask = history.pop()!;
      hintAt = -1;
      draw();
    };
    const reset = () => {
      if (won) return;
      history.length = 0;
      mask = [...start];
      hintAt = -1;
      note.setText('');
      draw();
    };
    const wrong = () => Object.entries(spec.solved).map(([k, m]) => [Number(k.split(',')[1]) * w + Number(k.split(',')[0]), m] as const).filter(([i, m]) => mask[i] !== m);
    const hint = () => {
      hintAt = wrong()[0]?.[0] ?? -1;
      note.setText('The lantern leans toward the piece circled in teal. Turn it.');
      draw();
    };

    const row = by + bh + 90;
    const btns = [
      pbutton(s, 0, row, 200, 64, 'UNDO [Z]', undo, 30),
      pbutton(s, 0, row, 200, 64, 'RESET [R]', reset, 30),
      pbutton(s, 0, row, 200, 64, 'HINT', hint, 30),
      pbutton(s, 0, row, 200, 64, 'SKIP', () => ((won = true), resolveWin()), 30),
    ];
    const [, , hintBtn, skipBtn] = btns;
    layer.add(btns);
    layer.add(ptext(s, W / 2, row + 62, 'Click a piece to turn it (right click turns it back), or move with the arrow keys and press Space.', 28, '#aab8d8').setOrigin(0.5));

    const cellAt = (p: Phaser.Input.Pointer) => {
      const gx = Math.floor((p.x - bx) / CELL), gy = Math.floor((p.y - by) / CELL);
      return gx >= 0 && gy >= 0 && gx < w && gy < h ? gy * w + gx : -1;
    };
    const onMove = (p: Phaser.Input.Pointer) => {
      const c = cellAt(p);
      if (c !== hover) (hover = c), draw();
    };
    const onUp = (p: Phaser.Input.Pointer) => rotate(cellAt(p), p.rightButtonReleased() ? -1 : 1);
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const x = cursor % w, y = Math.floor(cursor / w);
      const mv: Record<string, [number, number]> = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };
      if (mv[k]) {
        hover = -1;
        cursor = Phaser.Math.Clamp(y + mv[k][1], 0, h - 1) * w + Phaser.Math.Clamp(x + mv[k][0], 0, w - 1);
        draw();
      } else if (k === ' ' || k === 'enter' || k === 'e') rotate(cursor, e.shiftKey ? -1 : 1);
      else if (k === 'z') undo();
      else if (k === 'r') reset();
    };
    s.input.on('pointermove', onMove);
    s.input.on('pointerup', onUp);
    s.input.keyboard?.on('keydown', onKey);

    const state = {
      solved: false,
      auto: () => wrong().forEach(([i, m], k) => s.time.delayedCall(120 * (k + 1), () => {
        let n = 0;
        while (mask[i] !== m && n++ < 4) rotate(i);
      })),
    };
    this.state = state;
    draw();
    s.tweens.add({ targets: layer, alpha: 1, duration: 200 });
    if (!still) s.tweens.add({ targets: boat, y: boat.y - 3, yoyo: true, repeat: -1, duration: 900 });
    try {
      await Promise.race([winP, d.until(() => !d.alive)]);
      state.solved = true;
      d.audio.tone('chime');
      d.audio.water(true);
      s.tweens.add({ targets: boat, angle: 0, y: outY + 6, duration: 700, ease: 'Sine.Out' });
      layer.add(label(s, W / 2, by + bh / 2, spec.done ?? 'THE RIVER RUNS', 90, { color: '#7fe0d4', strokeThickness: 14 }).setOrigin(0.5));
      await d.wait(1200);
    } finally {
      s.input.off('pointermove', onMove);
      s.input.off('pointerup', onUp);
      s.input.keyboard?.off('keydown', onKey);
      this.state = null;
      s.tweens.add({ targets: layer, alpha: 0, duration: 250, onComplete: () => layer.destroy() });
      d.busyUi = false;
    }
  }
}

/**
 * Episode 3: Luke's river. 6×5. The path winds 14 pieces from the river (row 1) to the dock
 * (row 3); forks and stray bends around it tempt you into spills.
 *   path: (0,1)→(1,1)→(1,0)→(2,0)→(3,0)→(3,1)→(3,2)→(2,2)→(2,3)→(3,3)→(4,3)→(4,4)→(5,4)→(5,3)→dock
 */
export const LUKE_RIVER: RiverSpec = {
  title: 'TURN THE RIVER BACK',
  how: 'Turn the channels so the river reaches the dock, without a single spill.',
  w: 6,
  h: 5,
  pieces: [
    'TL|LT.',
    '|L#|LL',
    'TTLL#|',
    'LLL|LL',
    '.T#LLL',
  ],
  solved: {
    '0,1': E | Wb, '1,1': Wb | N, '1,0': S | E, '2,0': Wb | E, '3,0': Wb | S, '3,1': N | S, '3,2': N | Wb,
    '2,2': E | S, '2,3': N | E, '3,3': Wb | E, '4,3': Wb | S, '4,4': N | E, '5,4': Wb | N, '5,3': S | E,
  },
  scramble: ['213021', '013122', '301200', '230113', '012302'],
  source: 1,
  dock: 3,
};
