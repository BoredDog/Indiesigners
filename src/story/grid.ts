// The memory grid: an Echo Paths board (src/puzzle, same rules and solver) drawn with the story
// mode's own kit, so it looks like part of Veyra: town cobbles for floor, tower wall for pillars,
// the bell rope, the tower clock as the dial, the town's crate, river water and mud, and the
// lantern itself as the light you move. Shadow is ink, erased memory: you can't step into it.
// Laid out like the other overlays (title, one line of instructions, a blue panel). It can't
// get you stuck: UNDO and RESET always, a HINT after 3 slips and SKIP after 6.
//
//   await d.grid.play(IVY_GRID);   // resolves once the memory is reached
import Phaser from 'phaser';
import { TEXT_RESOLUTION, comicSettings } from '../comic';
import { H, W, label } from '../scenes/coreUi';
import type { Director } from '../world/Director';
import { PIX, panel, pbutton, ptext } from '../world/ui';
import { T } from '../world/tiles';
import { getLevel } from '../puzzle/levels';
import { initialState, inkTiles, gateOpen, waterDry, sentinelAt, step } from '../puzzle/Rules';
import { solve } from '../puzzle/Solver';
import { DIR_ORDER, DIRS, type Dir, type State } from '../puzzle/types';

export interface GridSpec {
  id: string; // content/puzzles/<id>.json
  title: string; // CAPS
  how: string; // one sentence
}

const DEPTH = 68;
const MAX_CELL = 88;
const GROUP = [0xffe08a, 0x7fe0d4, 0xe07070];
const GROUP_MARK = ['I', 'II', 'III'];
const KEYS: Record<string, Dir> = { arrowup: 'N', w: 'N', arrowright: 'E', d: 'E', arrowdown: 'S', s: 'S', arrowleft: 'W', a: 'W' };
/** Said once per board, the first time a move is blocked for that reason. */
const BLOCKED: Record<string, string> = {
  ink: 'That tile is in shadow. Move the light to move the shadows.',
  gate: 'A closed gate. Its rope opens it.',
  water: 'Flooded. The wheel drains this channel.',
  crate: 'The crate won’t move that way.',
};

/** Frames 't<id>' on the generated world tileset, so single tiles can be drawn as images. */
function tileFrames(s: Phaser.Scene) {
  const tex = s.textures.get('wtiles');
  if (!tex.has('t1')) for (let id = 1; id < 28; id++) tex.add(`t${id}`, 0, id * 16, 0, 16, 16);
}

export class EchoGrid {
  private d: Director;
  /** What's on screen (read by tools/autoplay-story.ts, which calls `auto()` to solve it). */
  state: { solved: boolean; auto: () => void } | null = null;

  constructor(d: Director) {
    this.d = d;
  }

  async play(spec: GridSpec): Promise<void> {
    const d = this.d, s = d.scene;
    const level = getLevel(spec.id);
    if (!level) return; // no level file: the story simply carries on
    tileFrames(s);
    d.busyUi = true;

    const CELL = Math.min(MAX_CELL, Math.floor(480 / Math.max(level.w, level.h)));
    const bw = level.w * CELL, bh = level.h * CELL;
    const bx = W / 2 - bw / 2, by = 360;
    const cx = (i: number) => bx + (i % level.w) * CELL + CELL / 2;
    const cy = (i: number) => by + Math.floor(i / level.w) * CELL + CELL / 2;

    const layer = s.add.container(0, 0).setDepth(DEPTH).setAlpha(0);
    layer.add(s.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setInteractive());
    layer.add(label(s, W / 2, 140, spec.title, 72, { color: '#e8fbff', strokeThickness: 12 }).setOrigin(0.5));
    layer.add(s.add.text(W / 2, 214, spec.how, { fontFamily: PIX, fontSize: '36px', color: '#cfe6ee', resolution: TEXT_RESOLUTION }).setOrigin(0.5));
    const note = ptext(s, W / 2, 268, '', 30, '#ffe08a').setOrigin(0.5);
    layer.add(note);
    layer.add(panel(s, bx - 28, by - 28, bw + 56, bh + 56, 0.95));
    const board = s.add.container(0, 0);
    layer.add(board);
    const moves = ptext(s, bx + bw + 60, by, '', 30, '#aab8d8');
    layer.add(moves);

    // The light: the lantern hangs on the side the light comes from.
    const lightGlow = s.add.image(0, 0, 'w_glow').setTint(0x9fe8ff).setBlendMode(Phaser.BlendModes.ADD).setScale(1.6).setAlpha(0.7);
    const lightLamp = s.add.image(0, 0, 'pt_lantern').setScale(1);
    lightLamp.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    layer.add([lightGlow, lightLamp]);
    const lampAt = (light: number) => {
      const [dx, dy] = DIRS[DIR_ORDER[light]];
      return { x: W / 2 + dx * (bw / 2 + 90), y: by + bh / 2 + dy * (bh / 2 + 64) };
    };

    // The wisp: a glowing blue orb of the lantern's light (the teal of the echo traces).
    const wispGlow = s.add.image(0, 0, 'w_glow').setTint(0x7fe0d4).setBlendMode(Phaser.BlendModes.ADD).setScale(CELL / 70);
    const wisp = s.add.image(0, 0, 'w_glow').setTint(0xd8fbff).setBlendMode(Phaser.BlendModes.ADD).setScale(CELL / 230);
    const hintLayer = s.add.container(0, 0);
    layer.add([hintLayer, wispGlow, wisp]);

    let st: State = initialState(level);
    const history: State[] = [];
    let slips = 0, won = false, busy = false;
    const said = new Set<string>();
    const still = comicSettings.reduceMotion;

    const say = (text: string, color = '#ffe08a') => note.setText(text).setColor(color);

    const draw = () => {
      board.removeAll(true);
      const ink = inkTiles(level, st);
      level.cells.forEach((c, i) => {
        const x = cx(i), y = cy(i), x0 = x - CELL / 2, y0 = y - CELL / 2;
        const tile = (id: number, tint = 0x9a92b4) => board.add(s.add.image(x, y, 'wtiles', `t${id}`).setDisplaySize(CELL, CELL).setTint(tint));
        const gx = (i % level.w) + Math.floor(i / level.w);
        const floor = () => tile(gx % 2 ? T.COBBLE : T.COBBLE2);
        const mark = (g: number) => board.add(ptext(s, x0 + 8, y0 + 4, GROUP_MARK[g] ?? '', 22, '#' + GROUP[g % 3].toString(16)).setStroke('#05040a', 5));
        if (st.collapsed.includes(i) || c.k === 'void') {
          board.add(s.add.rectangle(x, y, CELL, CELL, 0x05040a));
          return;
        }
        if (c.k === 'pillar') {
          floor();
          board.add(s.add.rectangle(x + 4, y + 6, CELL - 10, CELL - 10, 0x05040a, 0.7));
          board.add(s.add.image(x, y - 4, 'wtiles', `t${T.STONE2}`).setDisplaySize(CELL - 12, CELL - 12).setTint(0xfff4e0));
          board.add(s.add.rectangle(x, y0 + 8, CELL - 12, 8, 0xffffff, 0.25));
          board.add(s.add.rectangle(x - CELL / 2 + 6, y - 4, CELL - 12, CELL - 12).setOrigin(0, 0.5).setStrokeStyle(3, 0x05040a, 1));
          return;
        }
        if (c.k === 'water') {
          tile(waterDry(c, st) ? T.MUD : T.WATER, waterDry(c, st) ? 0x9a92b4 : 0xbfe4ff);
          mark(c.group);
        } else floor();
        if (c.k === 'collapse') board.add(s.add.image(x, y, 'w_crack').setDisplaySize(CELL, CELL));
        if (c.k === 'dial') board.add(s.add.image(x, y, 'w_clock').setScale((CELL - 12) / 32));
        if (c.k === 'goal') {
          const ring = s.add.circle(x, y, 30).setStrokeStyle(6, 0xffe08a, 1);
          board.add([s.add.image(x, y, 'w_glow').setTint(0xffe08a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.8).setAlpha(0.6), ring]);
          if (!still) s.tweens.add({ targets: ring, scale: 1.15, yoyo: true, repeat: -1, duration: 600 });
        }
        if (c.k === 'gate') {
          const open = gateOpen(c, st);
          const g = s.add.graphics();
          if (open) g.lineStyle(4, GROUP[c.group % 3], 0.8).strokeRect(x0 + 8, y0 + 8, CELL - 16, CELL - 16);
          else {
            board.add(s.add.image(x, y, 'wtiles', `t${T.PLANK}`).setDisplaySize(CELL, CELL));
            for (let k = 0; k < 4; k++) g.fillStyle(0x3a2a1a, 1).fillRect(x0 + 10 + k * 20, y0 + 6, 8, CELL - 12);
            g.lineStyle(4, GROUP[c.group % 3], 1).strokeRect(x0 + 4, y0 + 4, CELL - 8, CELL - 8);
          }
          board.add(g);
          mark(c.group);
        }
        if (c.k === 'switch') {
          if (c.kind === 'lever' || c.kind === 'node') board.add(s.add.image(x, y + 4, 'pt_rope').setScale(0.75));
          else {
            // The sluice wheel.
            const g = s.add.graphics();
            g.lineStyle(6, 0x6a4a2a, 1).strokeCircle(x, y, 26);
            for (let k = 0; k < 4; k++) g.lineBetween(x + Math.cos((k * Math.PI) / 4) * 26, y + Math.sin((k * Math.PI) / 4) * 26, x - Math.cos((k * Math.PI) / 4) * 26, y - Math.sin((k * Math.PI) / 4) * 26);
            g.fillStyle(0xb88a4a, 1).fillCircle(x, y, 8);
            board.add(g);
          }
          c.groups.forEach((g, k) => board.add(ptext(s, x0 + 8 + k * 30, y0 + 4, GROUP_MARK[g] ?? '', 22, '#' + GROUP[g % 3].toString(16)).setStroke('#05040a', 5)));
        }
        // Ink: erased memory. Dark, with hatching so it reads without colour too.
        if (ink.has(i)) {
          board.add(s.add.rectangle(x, y, CELL, CELL, 0x05040a, 0.88));
          const h = s.add.graphics().lineStyle(2, 0x4a3a7a, 1);
          for (let k = -CELL; k < CELL; k += 16) h.lineBetween(x0 + Math.max(0, k), y0 + Math.max(0, -k), x0 + Math.min(CELL, CELL + k), y0 + Math.min(CELL, CELL - k));
          board.add(h);
        }
      });
      for (const c of st.crates) board.add(s.add.image(cx(c), cy(c) + 6, 'gv_crate').setScale((CELL - 8) / 39));
      level.sentinels.forEach((_, n) => {
        const a = sentinelAt(level, n, st.t);
        if (a.facing >= 0) board.add(s.add.rectangle(cx(a.facing), cy(a.facing), CELL - 10, CELL - 10).setStrokeStyle(4, 0xe05050, 0.9));
        board.add(s.add.image(cx(a.pos), cy(a.pos) + CELL / 2 - 4, 'gv_woman_idle', 0).setOrigin(0.5, 1).setScale(1.6).setTint(0xd8f4ff).setAlpha(0.85));
      });
      board.add(s.add.rectangle(W / 2, by + bh / 2, bw, bh).setStrokeStyle(3, 0x05040a, 1));
      moves.setText(`MOVES ${history.length}\nPAR ${level.par}`);
      const lp = lampAt(st.light);
      lightLamp.setPosition(lp.x, lp.y);
      lightGlow.setPosition(lp.x, lp.y);
    };

    const placeWisp = (animate: boolean) => {
      const x = cx(st.pos), y = cy(st.pos);
      if (animate && !still) s.tweens.add({ targets: [wisp, wispGlow], x, y, duration: 120, ease: 'Sine.Out' });
      else wisp.setPosition(x, y), wispGlow.setPosition(x, y);
    };

    const showHint = () => {
      hintLayer.removeAll(true);
      const sol = solve(level, st);
      if (!sol) return say('No path from here. RESET the memory.', '#ff9090');
      let p = st;
      sol.moves.slice(0, 3).forEach((m, k) => {
        p = step(level, p, m).state;
        hintLayer.add(s.add.circle(cx(p.pos), cy(p.pos), 16, 0xffe08a, 0.9).setStrokeStyle(3, 0x05040a));
        hintLayer.add(ptext(s, cx(p.pos), cy(p.pos), String(k + 1), 24, '#05040a').setStroke('#05040a', 0).setOrigin(0.5));
      });
      say('The lantern shows the next steps.');
    };

    let resolveWin: () => void = () => undefined;
    const winP = new Promise<void>((r) => (resolveWin = r));

    const move = (dir: Dir) => {
      if (won || busy) return;
      const r = step(level, st, dir);
      if (r.event === 'blocked') {
        const why = r.reason && BLOCKED[r.reason];
        if (why && !said.has(r.reason!)) (said.add(r.reason!), say(why, '#aab8d8'));
        return;
      }
      hintLayer.removeAll(true);
      if (r.event === 'slip' || r.event === 'caught') {
        // Show the step, then rewind it.
        slips++;
        busy = true;
        const prev = st;
        st = r.state;
        draw();
        placeWisp(true);
        d.audio.tone('glitch');
        say(r.event === 'slip' ? 'The memory slips. The shadow took that step.' : 'The echo saw you. The memory rewinds.', '#ff9090');
        s.time.delayedCall(still ? 200 : 520, () => {
          st = prev;
          busy = false;
          draw();
          placeWisp(false);
          updateButtons();
        });
        return;
      }
      history.push(st);
      st = r.state;
      d.audio.play('click', 0.25, r.rotated ? -600 : 200);
      if (r.rotated) d.audio.play('bell', 0.25, -400);
      if (r.toggled) d.sfx('creak2', 0.35, -300);
      if (r.pushed) d.sfx('creak3', 0.3, -200);
      draw();
      placeWisp(true);
      if (r.event === 'win') {
        won = true;
        resolveWin();
      }
    };

    const undo = () => {
      if (won || busy || !history.length) return;
      st = history.pop()!;
      hintLayer.removeAll(true);
      draw();
      placeWisp(false);
    };
    const reset = () => {
      if (won || busy) return;
      st = initialState(level);
      history.length = 0;
      hintLayer.removeAll(true);
      say('');
      draw();
      placeWisp(false);
    };

    // Buttons under the board: UNDO and RESET always; HINT after 3 slips, SKIP after 6.
    const row = by + bh + 90;
    layer.add(pbutton(s, W / 2 - 330, row, 200, 64, 'UNDO [Z]', undo, 30));
    layer.add(pbutton(s, W / 2 - 110, row, 200, 64, 'RESET [R]', reset, 30));
    const hintBtn = pbutton(s, W / 2 + 110, row, 200, 64, 'HINT', showHint, 30).setVisible(false);
    const skipBtn = pbutton(s, W / 2 + 330, row, 200, 64, 'SKIP', () => ((won = true), resolveWin()), 30).setVisible(false);
    layer.add([hintBtn, skipBtn]);
    const btns = layer.list.filter((o) => (o.name ?? '').startsWith('btn:')) as Phaser.GameObjects.Container[];
    const updateButtons = () => {
      hintBtn.setVisible(slips >= 3);
      skipBtn.setVisible(slips >= 6);
      // Keep whatever is showing centred under the board.
      const shown = btns.filter((b) => b.visible);
      shown.forEach((b, k) => b.setX(W / 2 + (k - (shown.length - 1) / 2) * 220));
    };
    updateButtons();
    layer.add(ptext(s, W / 2, row + 62, 'Arrow keys or WASD to move, or click a tile next to the light.', 28, '#aab8d8').setOrigin(0.5));

    // Click a tile beside the wisp to step onto it.
    const onClick = (p: Phaser.Input.Pointer) => {
      const gx = Math.floor((p.x - bx) / CELL), gy = Math.floor((p.y - by) / CELL);
      if (gx < 0 || gy < 0 || gx >= level.w || gy >= level.h) return;
      const px = st.pos % level.w, py = Math.floor(st.pos / level.w);
      const dir = DIR_ORDER.find((dd) => px + DIRS[dd][0] === gx && py + DIRS[dd][1] === gy);
      if (dir) move(dir);
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (KEYS[k]) move(KEYS[k]);
      else if (k === 'z') undo();
      else if (k === 'r') reset();
    };
    s.input.on('pointerup', onClick);
    s.input.keyboard?.on('keydown', onKey);

    const auto = () => {
      const sol = solve(level, st);
      sol?.moves.forEach((m, k) => s.time.delayedCall(140 * (k + 1), () => move(m)));
    };
    const state = { solved: false, auto };
    this.state = state;

    draw();
    placeWisp(false);
    s.tweens.add({ targets: layer, alpha: 1, duration: 200 });
    if (!still) s.tweens.add({ targets: wispGlow, alpha: 0.6, yoyo: true, repeat: -1, duration: 700 });
    try {
      await Promise.race([winP, d.until(() => !d.alive)]);
      state.solved = true;
      d.audio.tone('chime');
      layer.add(label(s, W / 2, by + bh / 2, 'MEMORY FOUND', 90, { color: '#7fe0d4', strokeThickness: 14 }).setOrigin(0.5));
      await d.wait(1000);
    } finally {
      s.input.off('pointerup', onClick);
      s.input.keyboard?.off('keydown', onKey);
      this.state = null;
      s.tweens.add({ targets: layer, alpha: 0, duration: 250, onComplete: () => layer.destroy() });
      d.busyUi = false;
    }
  }
}

/** Episode 2: Ivy's memory. Teaches the light, the shadows and the clock dial. */
export const IVY_GRID: GridSpec = {
  id: 'pz_tower',
  title: 'WALK INTO HER MEMORY',
  how: 'Carry the light to the gold ring. Shadow is erased memory, so you can’t step into it.',
};

/** Episode 3: Luke's memory. Adds the river: drain the channel, push the crate. */
export const LUKE_GRID: GridSpec = {
  id: 'pz_bro_1',
  title: 'CROSS THE RIVER',
  how: 'The wheel drains the channel. Push the crate, and its shadow moves with it.',
};

