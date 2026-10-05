// The evidence board: the casebook as a graph. People on the left, what each one remembers next
// to them, the village clues in the middle, open questions, and THE FIGURE on the right.
// Undiscovered nodes show as "?" cards with a hint, so the board doubles as a to-do list.
// A few questions are deductions: the player links the right clue (Minecraft: Story Mode-style
// "you decide" moment, Obra Dinn-style certainty).
import Phaser from 'phaser';
import { H, W, label } from '../scenes/coreUi';
import { comicSettings } from '../comic';
import { PANEL, panel, pbutton, ptext } from './ui';

export type NodeKind = 'person' | 'memory' | 'clue' | 'question' | 'figure';
export interface BoardNode {
  id: string;
  kind: NodeKind;
  title: string;
  sub: string; // one line under the title
  detail: string; // shown when selected
  hint: string; // shown while the node is still "?"
  icon?: { key: string; frame?: number; tint?: number; scale?: number; crop?: number };
  x: number;
  y: number;
  hidden?: boolean; // not even a "?" until revealed (late twist nodes)
}
export interface BoardLink {
  a: string;
  b: string;
  text?: string;
  kind?: 'leads' | 'contradicts' | 'reveals';
  needs?: string; // only after this deduction is solved
}
export interface Deduction {
  id: string; // the question node
  ask: string;
  answer: string[]; // clue ids that count as right
  wrong: string; // feedback for a wrong link
  right: string; // what Elias concludes
}

// Layout columns on the 1920×1080 board.
const C = { people: 250, mem: 560, village: 900, q: 1260, fig: 1610 };

export const NODES: BoardNode[] = [
  { id: 'case', kind: 'question', title: 'WHAT HAPPENED AT 2:17?', sub: 'The whole village vanished', detail: 'Ten years ago, at 2:17 AM, everyone in Veyra disappeared. The case was closed. Nothing was found.', hint: '', x: 960, y: 125 },
  // people
  { id: 'ivy', kind: 'person', title: 'IVY', sub: 'the schoolteacher', detail: 'A ghost at the schoolhouse. Packs her bag every night and never leaves.', hint: 'Someone waits at the schoolhouse', icon: { key: 'pt_ivy', crop: 40 }, x: C.people, y: 300 },
  { id: 'luke', kind: 'person', title: 'LUKE', sub: 'the boatman', detail: 'A ghost on the river dock. Got the village into boats that night.', hint: 'Someone waits by the river', icon: { key: 'pt_luke', crop: 40 }, x: C.people, y: 480 },
  { id: 'hanna', kind: 'person', title: 'HANNA', sub: 'the archivist', detail: 'The woman in the doorway of the old house. She kept Veyra’s records — and warned you about memories.', hint: 'A woman in the old house doorway', icon: { key: 'pt_hanna', crop: 40 }, x: C.people, y: 660 },
  { id: 'nia', kind: 'person', title: 'NIA', sub: 'a sick little girl', detail: 'Elias’s younger sister. Seriously ill. The reason for everything.', hint: '', icon: { key: 'gv_woman_idle', tint: 0xffe0c0, scale: 1 }, x: C.people, y: 840, hidden: true },
  // what they remember
  { id: 'ivyMem', kind: 'memory', title: 'BELL AT 2:17', sub: 'Ivy’s memory', detail: 'Ivy heard the bell. Everyone ran to the square. She never saw who rang it.', hint: 'Ivy’s memory', icon: { key: 'w_clock', scale: 1.4 }, x: C.mem, y: 300 },
  { id: 'lukeMem', kind: 'memory', title: 'WATCH: 2:31', sub: 'Luke’s memory', detail: 'After the boats left, Luke’s watch read 2:31 — while the tower still showed 2:17.', hint: 'Luke’s memory', icon: { key: 'pt_watch', scale: 0.32 }, x: C.mem, y: 480 },
  { id: 'hannaMem', kind: 'memory', title: 'LANTERN BELOW', sub: 'Hanna’s memory', detail: 'Hanna followed a sound to the old well. Below it, an Echo Lantern burned beside someone she told to stop.', hint: 'Hanna’s memory', icon: { key: 'pt_lantern', scale: 0.3 }, x: C.mem, y: 660 },
  // village clues
  { id: 'footprints', kind: 'clue', title: 'FOOTPRINTS', sub: 'stop mid-step', detail: 'Several sets lead toward the clock tower and stop suddenly.', hint: 'Something on the street near the tower', icon: { key: 'w_steps', scale: 1.6 }, x: C.village, y: 280 },
  { id: 'key', kind: 'clue', title: 'BLOODY KEY', sub: 'where prints end', detail: 'A small old key with dried blood. Too small for any door in town.', hint: 'Where the footprints end', icon: { key: 'w_key', scale: 3 }, x: C.village, y: 390 },
  { id: 'bell', kind: 'clue', title: 'BELL ROPE', sub: 'nobody pulled it', detail: 'The bell rang tonight, but dust lies thick on the rope. Nobody pulled it.', hint: 'Climb the clock tower', icon: { key: 'pt_rope', scale: 0.32 }, x: C.village, y: 500 },
  { id: 'records', kind: 'clue', title: 'RECORDS', sub: 'times run to 2:31', detail: 'The village records keep going after 2:17: 1:43, 1:58, 2:06, 2:11, 2:17, 2:31.', hint: 'Inside the old house', icon: { key: 'w_lectern', scale: 2 }, x: C.village, y: 610 },
  { id: 'symbols', kind: 'clue', title: 'WELL LOCK', sub: 'strange symbols', detail: 'Symbols carved into the old well — and a small lock under the moss.', hint: 'Look at the old well', icon: { key: 'gv_well', scale: 0.35 }, x: C.village, y: 720 },
  { id: 'drawing', kind: 'clue', title: '“ELI + NIA”', sub: 'a child’s drawing', detail: 'In the schoolhouse: a crayon drawing of a boy with a lantern holding a girl’s hand.', hint: 'Something left in the schoolhouse', icon: { key: 'w_drawing', scale: 3.5 }, x: C.village, y: 830 },
  // questions (deductions)
  { id: 'qKey', kind: 'question', title: 'WHAT DOES THE KEY OPEN?', sub: 'link a clue', detail: 'The key is too small for any door in Veyra.', hint: '', x: C.q, y: 360 },
  { id: 'qTime', kind: 'question', title: 'DID TIME STOP AT 2:17?', sub: 'link a clue', detail: 'Every clock says 2:17. Ivy remembers 2:17. Is that the whole story?', hint: '', x: C.q, y: 560 },
  { id: 'qWho', kind: 'question', title: 'WHO IS THE FIGURE?', sub: 'link a clue', detail: 'The person with the lantern appears in every memory, face always hidden.', hint: '', x: C.q, y: 760 },
  // the figure
  { id: 'figure', kind: 'figure', title: 'THE FIGURE', sub: 'face never seen', detail: 'Someone with a lantern on a staff. In the window, in the crowd, at the river, under the well.', hint: 'A shape in a window…', icon: { key: 'gv_figure_idle', tint: 0x101018, scale: 1.1 }, x: C.fig, y: 330 },
  { id: 'photo', kind: 'clue', title: 'BURNED PHOTO', sub: 'the fourth face', detail: 'Three villagers and a fourth person carrying a lantern. The fourth face is scratched out.', hint: 'Inside the old house', icon: { key: 'w_photo', scale: 3.2 }, x: C.fig, y: 560 },
  { id: 'carried', kind: 'clue', title: 'CARRIED', sub: 'something small', detail: 'After the boats left, the figure walked back to Veyra carrying something small in a blanket.', hint: 'Watch closely in Luke’s memory', icon: { key: 'w_boat', scale: 1.2 }, x: C.fig, y: 760 },
];

export const LINKS: BoardLink[] = [
  { a: 'ivy', b: 'ivyMem' }, { a: 'luke', b: 'lukeMem' }, { a: 'hanna', b: 'hannaMem' },
  { a: 'footprints', b: 'key', text: 'found where they end' },
  { a: 'bell', b: 'ivyMem', text: 'rang — but nobody pulled it' },
  { a: 'ivyMem', b: 'figure', text: 'a lantern in the crowd', needs: 'sawLanternIvy' },
  { a: 'carried', b: 'figure', text: 'carried something small' },
  { a: 'hannaMem', b: 'figure', text: '“Stop.”' },
  { a: 'photo', b: 'figure', text: 'same lantern' },
  { a: 'key', b: 'qKey' }, { a: 'qKey', b: 'symbols', text: 'fits the lock', kind: 'reveals', needs: 'qKey' },
  { a: 'symbols', b: 'hannaMem', text: 'the same well' },
  { a: 'ivyMem', b: 'qTime' }, { a: 'qTime', b: 'lukeMem', text: 'CONTRADICTS 2:17', kind: 'contradicts', needs: 'qTime' },
  { a: 'records', b: 'lukeMem', text: 'agree: 2:31' },
  { a: 'figure', b: 'qWho' }, { a: 'qWho', b: 'photo', text: 'the fourth face', kind: 'reveals', needs: 'qWho' },
  { a: 'drawing', b: 'nia', text: '“ELI + NIA”' }, { a: 'carried', b: 'nia', text: 'what he carried', needs: 'qWho' },
];

export const DEDUCTIONS: Record<string, Deduction> = {
  qKey: { id: 'qKey', ask: 'What does the blood-stained key open?', answer: ['symbols'], wrong: 'That doesn’t have a lock that small.', right: 'The lock on the old well. Whatever happened, it went underground.' },
  qTime: { id: 'qTime', ask: 'Ivy remembers the bell at 2:17. What proves the night went on after that?', answer: ['lukeMem', 'records'], wrong: 'That only agrees with 2:17.', right: 'Luke’s watch said 2:31. The clocks stopped — the night didn’t.' },
  qWho: { id: 'qWho', ask: 'Who is the figure with the lantern?', answer: ['photo'], wrong: 'That doesn’t show a face.', right: 'The fourth face in the photograph. The one scratched out. …Mine.' },
};

/** Board state lives in the save: found node ids + solved deduction ids (as flags). */
export interface BoardState {
  found: string[];
  flags: Record<string, unknown>;
}

const isFound = (s: BoardState, id: string) => id === 'case' || s.found.includes(id) || NODES.find((n) => n.id === id)?.kind === 'question' && questionOpen(s, id);
function questionOpen(s: BoardState, id: string) {
  if (id === 'qKey') return s.found.includes('key');
  if (id === 'qTime') return s.found.includes('ivyMem');
  if (id === 'qWho') return !!s.flags.askWho;
  return false;
}

/**
 * Draws the board into `scene`. In connect mode (`deduce`), clicking a found clue tries to answer
 * the question; resolves true when solved. Otherwise it's a viewer and resolves on close.
 */
export function openBoard(scene: Phaser.Scene, state: BoardState, opts: { deduce?: string; onSolved?: (id: string) => void; onClose: () => void; sfx?: (k: 'page' | 'click' | 'right' | 'wrong') => void }) {
  const layer = scene.add.container(0, 0).setDepth(50);
  layer.add(scene.add.rectangle(0, 0, W, H, 0x05060c, 0.92).setOrigin(0).setInteractive());
  // Faint grid, like a detective's corkboard drawn in pixels.
  const grid = scene.add.graphics();
  grid.lineStyle(1, 0x2a3a5a, 0.35);
  for (let x = 0; x < W; x += 48) grid.lineBetween(x, 0, x, H);
  for (let y = 0; y < H; y += 48) grid.lineBetween(0, y, W, y);
  layer.add(grid);
  layer.add(label(scene, 70, 30, 'EVIDENCE BOARD', 64).setOrigin(0, 0));
  const headers: [number, string][] = [[C.people, 'PEOPLE'], [C.mem, 'WHAT THEY REMEMBER'], [C.village, 'THE VILLAGE'], [C.q, 'QUESTIONS'], [C.fig, 'THE FIGURE']];
  for (const [x, t] of headers) layer.add(ptext(scene, x, 205, t, 30, '#7f9fd8').setOrigin(0.5));

  const lines = scene.add.graphics();
  layer.add(lines);
  const nodeLayer = scene.add.container(0, 0);
  layer.add(nodeLayer);
  const info = scene.add.container(0, 0);
  layer.add(info);
  let selected: string | null = null;
  let mode = opts.deduce ?? null;
  const solved = (id: string) => !!state.flags[id];
  const visible = (n: BoardNode) => isFound(state, n.id) || (!n.hidden && n.kind !== 'question');

  const linkOn = (l: BoardLink) => isFound(state, l.a) && isFound(state, l.b) && (!l.needs || !!state.flags[l.needs]);

  const labels: Phaser.GameObjects.GameObject[] = [];
  function drawLines() {
    lines.clear();
    labels.forEach((o) => o.destroy());
    labels.length = 0;
    for (const l of LINKS) {
      if (!linkOn(l)) continue;
      const a = NODES.find((n) => n.id === l.a)!, b = NODES.find((n) => n.id === l.b)!;
      const color = l.kind === 'contradicts' ? 0xe05050 : l.kind === 'reveals' ? 0xffe08a : 0xc8d4f0;
      lines.lineStyle(l.kind ? 5 : 3, color, l.kind ? 1 : 0.55);
      if (l.kind === 'contradicts') {
        const steps = 16;
        for (let i = 0; i < steps; i += 2) {
          const t0 = i / steps, t1 = (i + 1) / steps;
          lines.lineBetween(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0, a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
        }
      } else lines.lineBetween(a.x, a.y, b.x, b.y);
      if (l.text && l.kind) {
        // Label near the question end, on a dark backing so it reads over lines and cards.
        const k = 0.3, lx = a.x + (b.x - a.x) * k, ly = a.y + (b.y - a.y) * k + 30;
        const t = ptext(scene, lx, ly, l.text, 24, l.kind === 'contradicts' ? '#ff9090' : '#ffe08a').setOrigin(0.5);
        const bg = scene.add.rectangle(lx, ly, t.width + 16, t.height + 6, 0x05060c, 0.9).setStrokeStyle(2, color, 0.9);
        labels.push(bg, t);
      }
    }
  }

  function card(n: BoardNode) {
    const found = isFound(state, n.id);
    const c = scene.add.container(n.x, n.y);
    const w = n.kind === 'question' ? 300 : n.id === 'case' ? 460 : 250, h = n.id === 'case' ? 60 : 100;
    const g = scene.add.graphics();
    const border = !found ? 0x3a4a6a : n.kind === 'question' ? (solved(n.id) ? 0xffe08a : 0xe05050) : n.kind === 'person' ? 0xbfefff : n.kind === 'figure' ? 0x9a7ad8 : n.kind === 'memory' ? 0x7fe0d4 : PANEL.line;
    const isTarget = mode && found && n.kind !== 'question' && n.kind !== 'person';
    const draw = (hover: boolean) => {
      g.clear();
      g.fillStyle(0x000000, 0.4).fillRoundedRect(-w / 2 + 4, -h / 2 + 5, w, h, 8);
      g.fillStyle(found ? (hover ? PANEL.hi : PANEL.fill) : 0x0c1220, found ? 0.97 : 0.85).fillRoundedRect(-w / 2, -h / 2, w, h, 8);
      g.lineStyle(hover || selected === n.id ? 4 : 3, hover && isTarget ? 0xffe08a : border, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    };
    draw(false);
    c.add(g);
    if (!found) {
      c.add(ptext(scene, 0, -18, '?', 44, '#3e5070').setOrigin(0.5));
      c.add(ptext(scene, 0, 22, n.hint, 22, '#6a7ca0', w - 20).setOrigin(0.5).setAlign('center'));
    } else {
      let tx = -w / 2 + 16;
      if (n.icon) {
        const img = scene.add.image(-w / 2 + 44, 0, n.icon.key, n.icon.frame ?? 0).setOrigin(0.5);
        img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        if (n.icon.crop) img.setCrop(0, 0, img.width, n.icon.crop).setOrigin(0.5, 0.25);
        const s = n.icon.scale ?? Math.min(60 / img.width, 70 / (n.icon.crop ?? img.height));
        img.setScale(n.icon.crop && !n.icon.scale ? Math.min(60 / img.width, 70 / n.icon.crop) : s);
        if (n.icon.tint !== undefined) img.setTint(n.icon.tint);
        if (n.id === 'figure' && state.flags.qWho) img.setTexture('gv_hatman_idle', 0).clearTint().setScale(1.2);
        c.add(img);
        tx = -w / 2 + 84;
      }
      const title = n.id === 'figure' && state.flags.qWho ? 'ELIAS' : n.title;
      const sub = n.id === 'figure' && state.flags.qWho ? 'the apprentice — me' : n.kind === 'question' ? (solved(n.id) ? 'SOLVED' : mode === n.id ? 'pick the clue that answers it' : 'click to connect a clue') : n.sub;
      if (n.id === 'case') {
        c.add(ptext(scene, 0, 0, title, 34, '#ffb0b0').setOrigin(0.5));
      } else {
        const tw = w / 2 - tx - 10;
        const t = ptext(scene, tx, -h / 2 + 10, title, 28, n.kind === 'question' && !solved(n.id) ? '#ffb0b0' : '#ffffff', tw);
        c.add(t);
        c.add(ptext(scene, tx, Math.min(h / 2 - 34, -h / 2 + 14 + t.height), sub, 22, n.kind === 'question' && solved(n.id) ? '#ffe08a' : '#aab8d8', tw));
      }
    }
    c.setSize(w, h).setInteractive({ useHandCursor: found });
    c.on('pointerover', () => draw(true)).on('pointerout', () => draw(false));
    c.on('pointerup', () => found && click(n));
    if (isTarget && !comicSettings.reduceMotion) scene.tweens.add({ targets: c, scale: 1.04, yoyo: true, repeat: -1, duration: 500 });
    nodeLayer.add(c);
  }

  function showInfo(n: BoardNode, extra?: string, color = '#ffffff') {
    info.removeAll(true);
    const text = extra ?? n.detail;
    info.add(panel(scene, 60, H - 140, W - 120, 100, 0.95));
    info.add(ptext(scene, 90, H - 128, `${n.id === 'figure' && state.flags.qWho ? 'ELIAS' : n.title}`, 30, '#ffe08a'));
    info.add(ptext(scene, 90, H - 92, text, 30, color, W - 200));
  }

  function click(n: BoardNode) {
    opts.sfx?.('click');
    if (n.kind === 'question' && n.id !== 'case' && !solved(n.id)) {
      mode = n.id;
      selected = n.id;
      redraw();
      showInfo(n, `${DEDUCTIONS[n.id].ask}  →  click the clue that answers it.`, '#ffb0b0');
      return;
    }
    if (mode && n.kind !== 'question') {
      const d = DEDUCTIONS[mode];
      const q = NODES.find((m) => m.id === mode)!;
      if (d.answer.includes(n.id)) {
        state.flags[mode] = true;
        opts.sfx?.('right');
        opts.onSolved?.(mode);
        mode = null;
        selected = null;
        redraw();
        showInfo(q, d.right, '#ffe08a');
      } else {
        opts.sfx?.('wrong');
        scene.cameras.main.shake(150, 0.004);
        showInfo(q, `${n.title}? ${d.wrong}`, '#ff9090');
      }
      return;
    }
    selected = n.id;
    redraw();
    showInfo(n);
  }

  function redraw() {
    nodeLayer.removeAll(true);
    drawLines();
    for (const n of NODES) if (visible(n)) card(n);
    for (const o of labels) nodeLayer.add(o); // labels above cards
  }
  redraw();
  if (opts.deduce) {
    const q = NODES.find((n) => n.id === opts.deduce)!;
    selected = q.id;
    redraw();
    showInfo(q, `${DEDUCTIONS[q.id].ask}  →  click the clue that answers it.`, '#ffb0b0');
  } else {
    info.add(ptext(scene, 90, H - 92, 'Click a card to read it. Red questions need a clue linked to them. “?” cards are still out there.', 28, '#aab8d8'));
  }
  const close = pbutton(scene, W - 170, 60, 240, 64, 'CLOSE [C]', () => {
    if (opts.deduce && !state.flags[opts.deduce]) {
      const q = NODES.find((n) => n.id === opts.deduce)!;
      showInfo(q, `Answer this one first: ${DEDUCTIONS[q.id].ask}`, '#ffb0b0');
      return;
    }
    layer.destroy();
    opts.onClose();
  }, 30);
  layer.add(close);
  opts.sfx?.('page');
  return { layer, close: () => (layer.destroy(), opts.onClose()) };
}
