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
  traps?: Record<string, string>; // a specific reply for a wrong-but-plausible clue
  right: string; // what Elias concludes
  nudge: string; // a gentle hint after two wrong answers
}

// Layout columns on the 1920×1080 board.
const C = { people: 250, mem: 560, village: 900, q: 1260, fig: 1610 };

export const NODES: BoardNode[] = [
  { id: 'case', kind: 'question', title: 'WHAT HAPPENED AT 2:17?', sub: 'The whole village vanished', detail: 'Ten years ago, at 2:17 AM, everyone in Veyra disappeared. The case was closed. Nothing was ever found.', hint: '', x: 960, y: 125 },
  // people
  { id: 'ivy', kind: 'person', title: 'IVY', sub: 'The schoolteacher', detail: 'A ghost at the school. Packs her bag every night and never leaves.', hint: 'Someone who never left', icon: { key: 'pt_ivy', crop: 40 }, x: C.people, y: 300 },
  { id: 'luke', kind: 'person', title: 'LUKE', sub: 'The boatman', detail: 'A ghost on the river dock. Got the village into boats that night.', hint: 'Someone who never left', icon: { key: 'pt_luke', crop: 40 }, x: C.people, y: 480 },
  { id: 'hanna', kind: 'person', title: 'HANNA', sub: 'The archivist', detail: 'The woman in the doorway of the old house. She kept Veyra’s records, and warned you about memories.', hint: 'Someone who never left', icon: { key: 'pt_hanna', crop: 40 }, x: C.people, y: 660 },
  { id: 'nia', kind: 'person', title: 'NIA', sub: 'Eli’s little sister', detail: 'Elias’s little sister. Sick all winter, ten years ago. The reason for everything, and the hand in the letter.', hint: '', icon: { key: 'gv_woman_idle', tint: 0xffe0c0, scale: 1 }, x: C.people, y: 840, hidden: true },
  // what they remember
  { id: 'ivyMem', kind: 'memory', title: 'BELL AT 2:17', sub: 'Ivy’s memory', detail: 'Ivy heard the bell. Everyone ran to the square. She never saw who rang it.', hint: 'Someone’s memory', icon: { key: 'w_clock', scale: 1.4 }, x: C.mem, y: 300 },
  { id: 'lukeMem', kind: 'memory', title: 'WATCH: 2:31', sub: 'Luke’s memory', detail: 'After the boats left, Luke’s watch read 2:31, while the tower still showed 2:17.', hint: 'Someone’s memory', icon: { key: 'pt_watch', scale: 0.32 }, x: C.mem, y: 480 },
  { id: 'hannaMem', kind: 'memory', title: 'LANTERN BELOW', sub: 'Hanna’s memory', detail: 'Hanna followed a sound to the old well. Below it, an Echo Lantern burned beside someone she told to stop.', hint: 'Someone’s memory', icon: { key: 'pt_lantern', scale: 0.3 }, x: C.mem, y: 660 },
  // village clues
  { id: 'footprints', kind: 'clue', title: 'FOOTPRINTS', sub: 'Stopped mid-step', detail: 'Several sets lead toward the clock tower and stop suddenly.', hint: 'Somewhere in the village', icon: { key: 'w_steps', scale: 1.6 }, x: C.village, y: 280 },
  { id: 'key', kind: 'clue', title: 'BLOODIED KEY', sub: 'Where prints end', detail: 'A small iron key with dried blood on the bow. Too small for any door in town.', hint: 'Look closer…', icon: { key: 'w_key', scale: 3 }, x: C.village, y: 390 },
  { id: 'bell', kind: 'clue', title: 'BELL ROPE', sub: 'Nobody pulled it', detail: 'The bell rang the moment Elias arrived, but dust lies thick on the rope. Nobody has pulled it in years.', hint: 'Somewhere in the village', icon: { key: 'pt_rope', scale: 0.32 }, x: C.village, y: 500 },
  { id: 'records', kind: 'clue', title: 'RECORDS', sub: 'Times run to 2:31', detail: 'The night watchman’s log keeps going after the clocks stopped: 1:58 all quiet, 2:17 bell, 2:24 river turned, 2:31… and then nothing.', hint: 'Somewhere in the village', icon: { key: 'w_lectern', scale: 2 }, x: C.village, y: 610 },
  { id: 'symbols', kind: 'clue', title: 'WELL LOCK', sub: 'Strange symbols', detail: 'Symbols carved into the old well, and a small lock under the moss.', hint: 'Somewhere in the village', icon: { key: 'gv_well', scale: 0.35 }, x: C.village, y: 720 },
  { id: 'drawing', kind: 'clue', title: '“— + NIA”', sub: 'A torn drawing', detail: 'In the school, a crayon drawing of a brother and a sister. He holds a lantern like mine. His name is torn away.', hint: 'Somewhere in the village', icon: { key: 'w_drawing', scale: 3.5 }, x: C.village, y: 830 },
  // questions (deductions)
  { id: 'qKey', kind: 'question', title: 'WHAT DOES THE KEY OPEN?', sub: 'Link a clue', detail: 'The key is too small for any door in Veyra.', hint: '', x: C.q, y: 360 },
  { id: 'qTime', kind: 'question', title: 'DID TIME STOP AT 2:17?', sub: 'Link a clue', detail: 'Every clock says 2:17. Ivy remembers 2:17. Is that the whole story?', hint: '', x: C.q, y: 560 },
  { id: 'qWho', kind: 'question', title: 'WHO IS THE FIGURE?', sub: 'Link a clue', detail: 'The person with the lantern appears in every memory, face always hidden.', hint: '', x: C.q, y: 760 },
  // the figure
  { id: 'figure', kind: 'figure', title: 'THE FIGURE', sub: 'Face never seen', detail: 'Someone with a lantern on a staff. In the window, in the crowd, at the river, under the well.', hint: 'A shape in a window…', icon: { key: 'gv_figure_idle', tint: 0x101018, scale: 1.1 }, x: C.fig, y: 300 },
  { id: 'register', kind: 'clue', title: 'REGISTER', sub: 'Hanna’s staff records', detail: 'Veyra’s staff register, every entry in one careful hand. Hanna’s photograph is pinned to the archivist’s page.', hint: 'Somewhere in the old house', icon: { key: 'w_lectern', scale: 2 }, x: C.fig, y: 430, hidden: true },
  { id: 'photo', kind: 'clue', title: 'BURNED PHOTO', sub: 'The fourth face', detail: 'Three villagers and a fourth person carrying a lantern. The fourth face is scratched out.', hint: 'Somewhere in the village', icon: { key: 'w_photo', scale: 3.2 }, x: C.fig, y: 560 },
  { id: 'carried', kind: 'clue', title: 'CARRIED', sub: 'Something small', detail: 'Just after two, before the bell, the figure walked toward the well carrying something small in a blanket.', hint: 'Not everything in a memory is in plain sight', icon: { key: 'w_boat', scale: 1.2 }, x: C.fig, y: 690 },
];

export const LINKS: BoardLink[] = [
  { a: 'ivy', b: 'ivyMem' }, { a: 'luke', b: 'lukeMem' }, { a: 'hanna', b: 'hannaMem' },
  { a: 'footprints', b: 'key', text: 'Found where they end' },
  { a: 'bell', b: 'ivyMem', text: 'Rang, but nobody pulled it' },
  { a: 'ivyMem', b: 'figure', text: 'A lantern in the crowd', needs: 'sawLanternIvy' },
  { a: 'carried', b: 'figure', text: 'Carried something small' },
  { a: 'hannaMem', b: 'figure', text: '“Stop.”' },
  { a: 'photo', b: 'figure', text: 'The same lantern' },
  { a: 'key', b: 'qKey' }, { a: 'qKey', b: 'symbols', text: 'Fits the lock', kind: 'reveals', needs: 'qKey' },
  { a: 'symbols', b: 'hannaMem', text: 'The same well' },
  { a: 'ivyMem', b: 'qTime' }, { a: 'qTime', b: 'lukeMem', text: 'CONTRADICTS 2:17', kind: 'contradicts', needs: 'qTime' },
  { a: 'qTime', b: 'records', text: 'Logged until 2:31', kind: 'contradicts', needs: 'qTime' },
  { a: 'records', b: 'lukeMem', text: 'Both say 2:31' },
  { a: 'figure', b: 'qWho' }, { a: 'qWho', b: 'photo', text: 'The fourth face', kind: 'reveals', needs: 'qWho' },
  { a: 'drawing', b: 'nia', text: 'A brother and a sister' },
  { a: 'register', b: 'hanna', text: 'Her records' }, { a: 'carried', b: 'nia', text: 'What he carried', needs: 'qWho' },
];

export const DEDUCTIONS: Record<string, Deduction> = {
  qKey: { id: 'qKey', ask: 'What does the blood-stained key open?', answer: ['symbols'], wrong: 'Nothing there has a lock that small.', right: 'The lock on the old well. Whatever happened, it went underground.', nudge: 'A key this small fits something small. Which clue mentions a lock?' },
  qTime: { id: 'qTime', ask: 'Ivy remembers the bell at 2:17. What proves the night went on after that?', answer: ['lukeMem', 'records'], wrong: 'That only agrees with 2:17.', right: 'Luke’s watch and the watchman’s log both run on to 2:31. The clocks stopped. The night didn’t.', nudge: 'Look for a time written down that comes after 2:17.' },
  qWho: { id: 'qWho', ask: 'Who is the figure with the lantern?', answer: ['photo'], wrong: 'That doesn’t show a face.', traps: { register: 'That’s what the records say. Someone rewrote the records.' }, right: 'The fourth face in the photograph. The one scratched out. …Mine.', nudge: 'You need a face. Which clue shows the figure with others?' },
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
  const bgRect = scene.add.rectangle(0, 0, W, H, 0x05060c, 1).setOrigin(0).setInteractive();
  layer.add(bgRect);
  // Faint grid, like a detective's corkboard drawn in pixels.
  const grid = scene.add.graphics();
  grid.lineStyle(1, 0x2a3a5a, 0.35);
  for (let x = 0; x < W; x += 48) grid.lineBetween(x, 0, x, H);
  for (let y = 0; y < H; y += 48) grid.lineBetween(0, y, W, y);
  layer.add(grid);
  layer.add(label(scene, 70, 30, 'EVIDENCE BOARD', 64).setOrigin(0, 0));
  const headers: [number, string][] = [[C.people, 'PEOPLE'], [C.mem, 'WHAT THEY REMEMBER'], [C.village, 'THE VILLAGE'], [C.q, 'QUESTIONS'], [C.fig, 'THE FIGURE']];
  for (const [x, t] of headers) layer.add(ptext(scene, x, 205, t, 30, '#7f9fd8').setOrigin(0.5));

  const nodeLayer = scene.add.container(0, 0);
  layer.add(nodeLayer);
  const info = scene.add.container(0, 0);
  layer.add(info);
  const question = scene.add.container(0, 0);
  layer.add(question);
  let selected: string | null = null;
  let mode = opts.deduce ?? null;
  let pick: string | null = null; // the clue the player is about to present
  let misses = 0;
  const solved = (id: string) => !!state.flags[id];
  const visible = (n: BoardNode) => !(mode && n.id === 'case') && isFound(state, n.id) || (!n.hidden && n.kind !== 'question' && (n.id !== 'key' || state.found.includes('footprints')));

  const linkOn = (l: BoardLink) => isFound(state, l.a) && isFound(state, l.b) && (!l.needs || !!state.flags[l.needs]);

  const sizeOf = (n: BoardNode) => ({ w: n.id === 'case' ? 600 : n.kind === 'question' ? 300 : 250, h: n.id === 'case' ? 60 : 92 });
  const activeLinks = () => LINKS.filter(linkOn);
  /** Cards linked to the focused card (plus the card itself). */
  const related = (id: string | null) => {
    const set = new Set<string>();
    if (!id) return set;
    set.add(id);
    for (const l of activeLinks()) if (l.a === id) set.add(l.b); else if (l.b === id) set.add(l.a);
    return set;
  };

  const linkColor = (l: BoardLink) => (l.kind === 'contradicts' ? 0xe05050 : l.kind === 'reveals' ? 0xffe08a : 0x7fe0d4);
  /** The thread between the focused card and `id`, if there is one. */
  const threadTo = (id: string) => (selected && !mode ? activeLinks().find((l) => (l.a === selected && l.b === id) || (l.b === selected && l.a === id)) : undefined);
  const titleOf = (id: string) => (id === 'figure' && state.flags.qWho ? 'ELIAS' : NODES.find((n) => n.id === id)!.title);

  function card(n: BoardNode) {
    const found = isFound(state, n.id);
    const c = scene.add.container(n.x, n.y);
    const { w, h } = sizeOf(n);
    const rel = related(selected);
    const thread = threadTo(n.id);
    const isTarget = !!mode && found && n.kind !== 'question' && n.kind !== 'person';
    if (mode ? !isTarget && n.id !== mode : selected && !rel.has(n.id)) c.setAlpha(0.28);
    const g = scene.add.graphics();
    const border = !found ? 0x3a4a6a : n.kind === 'question' ? (solved(n.id) ? 0xffe08a : 0xe05050) : n.kind === 'person' ? 0xbfefff : n.kind === 'figure' ? 0x9a7ad8 : n.kind === 'memory' ? 0x7fe0d4 : PANEL.line;
    const draw = (hover: boolean) => {
      g.clear();
      g.fillStyle(0x000000, 0.4).fillRoundedRect(-w / 2 + 4, -h / 2 + 5, w, h, 8);
      g.fillStyle(found ? (hover ? PANEL.hi : PANEL.fill) : 0x0c1220, found ? 0.97 : 0.85).fillRoundedRect(-w / 2, -h / 2, w, h, 8);
      const picked = pick === n.id;
      const lit = thread ? linkColor(thread) : picked || (hover && isTarget) ? 0xffe08a : border;
      g.lineStyle(picked || thread ? 6 : hover || selected === n.id ? 4 : 3, lit, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
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
      const sub = n.id === 'figure' && state.flags.qWho ? 'The apprentice. Me.' : n.kind === 'question' ? (solved(n.id) ? 'SOLVED' : mode === n.id ? 'Answering now' : !DEDUCTIONS[n.id] || DEDUCTIONS[n.id].answer.some((id) => isFound(state, id)) ? 'Click to answer' : 'Needs a clue you haven’t found') : n.sub;
      if (n.id === 'case') {
        c.add(ptext(scene, 0, 0, title, 34, '#ffb0b0').setOrigin(0.5));
      } else {
        const tw = w / 2 - tx - 10;
        const t = ptext(scene, tx, -h / 2 + 10, title, 28, n.kind === 'question' && !solved(n.id) ? '#ffb0b0' : '#ffffff', tw);
        c.add(t);
        c.add(ptext(scene, tx, Math.min(h / 2 - 34, -h / 2 + 14 + t.height), sub, 22, n.kind === 'question' && solved(n.id) ? '#ffe08a' : '#aab8d8', tw));
      }
    }
    // A tag on the card's top edge: on a card linked to the focused one, why they are linked;
    // otherwise how many links the card has.
    const count = activeLinks().filter((l) => l.a === n.id || l.b === n.id).length;
    const tagText = thread ? (thread.text ?? 'Linked').toUpperCase() : !selected && !mode && count ? `${count} LINK${count > 1 ? 'S' : ''}` : '';
    if (found && tagText && n.id !== 'case') {
      const col = thread ? linkColor(thread) : 0x7fe0d4;
      const css = '#' + col.toString(16).padStart(6, '0');
      const tag = ptext(scene, 0, -h / 2, tagText, 20, css).setOrigin(0.5);
      const tw = Math.min(w - 12, tag.width + 20);
      const tg = scene.add.graphics();
      tg.fillStyle(0x0b1020, 1).fillRoundedRect(-tw / 2, -h / 2 - 13, tw, 26, 5).lineStyle(2, col, thread ? 1 : 0.8).strokeRoundedRect(-tw / 2, -h / 2 - 13, tw, 26, 5);
      c.add([tg, tag]);
    }
    c.setSize(w, h).setInteractive({ useHandCursor: found && (!mode || isTarget) });
    c.on('pointerover', () => draw(true)).on('pointerout', () => draw(false));
    c.on('pointerup', () => found && click(n));
    if (pick === n.id && !comicSettings.reduceMotion) scene.tweens.add({ targets: c, scale: 1.05, yoyo: true, repeat: -1, duration: 500 });
    nodeLayer.add(c);
  }

  function showInfo(n: BoardNode, extra?: string, color = '#ffffff', present = false) {
    info.removeAll(true);
    const text = extra ?? n.detail;
    info.add(panel(scene, 60, H - 180, W - 120, 150, 0.95));
    info.add(ptext(scene, 90, H - 166, titleOf(n.id), 30, '#ffe08a'));
    info.add(ptext(scene, 90, H - 130, text, 28, color, present ? W - 560 : W - 200));
    // What it's linked to, in words (the lit cards on the board show the same thing).
    if (!extra && !present && !mode) {
      const ts = activeLinks().filter((l) => l.a === n.id || l.b === n.id).map((l) => `${titleOf(l.a === n.id ? l.b : l.a)}${l.text ? ` (${l.text})` : ''}`);
      if (ts.length) info.add(ptext(scene, 90, H - 68, `Linked to: ${ts.join('  ·  ')}`, 24, '#7fe0d4', W - 200));
    }
    if (present) info.add(pbutton(scene, W - 260, H - 105, 340, 72, 'PRESENT THIS CLUE', () => answer(n), 28));
  }

  /** The question being answered, large across the top, with what to do. */
  function showQuestion() {
    question.removeAll(true);
    if (!mode) return;
    const d = DEDUCTIONS[mode];
    // If the clue that answers it isn't on the board yet, say so plainly instead of letting the
    // player cycle through every card.
    const ready = d.answer.some((id) => isFound(state, id));
    const top = 24, pw = 980;
    const t = ptext(scene, W / 2, 0, d.ask, 36, '#ffb0b0', pw - 60).setOrigin(0.5).setAlign('center');
    const how = ptext(scene, W / 2, 0, !ready ? 'You haven’t found the clue that answers this yet. Close the board and keep investigating.' : misses >= 2 ? `Hint: ${d.nudge}` : 'Click a clue to read it, then present the one that answers this.', 26, !ready || misses >= 2 ? '#ffe08a' : '#aab8d8', pw - 60).setOrigin(0.5).setAlign('center');
    t.setY(top + 18 + t.height / 2);
    how.setY(top + 28 + t.height + how.height / 2);
    question.add([panel(scene, W / 2 - pw / 2, top, pw, t.height + how.height + 46, 0.97), t, how]);
  }

  function answer(n: BoardNode) {
    if (!mode) return;
    const d = DEDUCTIONS[mode];
    const q = NODES.find((m) => m.id === mode)!;
    if (d.answer.includes(n.id)) {
      state.flags[mode] = true;
      opts.sfx?.('right');
      opts.onSolved?.(mode);
      mode = null;
      pick = null;
      selected = q.id; // keep it focused so the new thread draws in
      redraw();
      showInfo(q, d.right, '#ffe08a');
    } else {
      opts.sfx?.('wrong');
      scene.cameras.main.shake(150, 0.004);
      misses++;
      pick = null;
      redraw();
      showInfo(q, `${n.title}? ${d.traps?.[n.id] ?? d.wrong}`, '#ff9090');
    }
  }

  function click(n: BoardNode) {
    opts.sfx?.('click');
    if (mode) {
      // Answering: a click only picks a clue and shows what it says. Nothing is guessed by accident.
      if (n.kind === 'question' || n.kind === 'person') return;
      pick = n.id;
      redraw();
      showInfo(n, undefined, '#ffffff', true);
      return;
    }
    if (n.kind === 'question' && n.id !== 'case' && !solved(n.id)) {
      startQuestion(n.id);
      return;
    }
    selected = selected === n.id ? null : n.id;
    redraw();
    if (selected) showInfo(n);
    else showHelp();
  }

  function redraw() {
    nodeLayer.removeAll(true);
    for (const n of NODES) if (visible(n)) card(n);
    showQuestion();
  }

  function startQuestion(id: string) {
    mode = id;
    selected = id;
    pick = null;
    misses = 0;
    redraw();
    info.removeAll(true);
    info.add(panel(scene, 60, H - 180, W - 120, 150, 0.95));
    info.add(ptext(scene, 90, H - 166, 'ANSWER THE QUESTION', 30, '#ffe08a'));
    info.add(ptext(scene, 90, H - 126, 'The glowing cards are the clues you have found. Click one to read it here, and present the one that answers the question at the top. A wrong guess costs nothing.', 28, '#aab8d8', W - 200));
  }
  // Clicking empty space clears the focus, or backs out of a question you opened yourself.
  bgRect.on('pointerup', () => {
    if (mode && mode !== opts.deduce) {
      mode = null;
      pick = null;
    } else if (mode || !selected) return;
    selected = null;
    redraw();
    showHelp();
  });
  redraw();
  if (opts.deduce) startQuestion(opts.deduce);
  else showHelp();
  function showHelp() {
    info.removeAll(true);
    info.add(panel(scene, 60, H - 180, W - 120, 150, 0.95));
    info.add(ptext(scene, 90, H - 166, 'HOW THE BOARD WORKS', 30, '#ffe08a'));
    info.add(ptext(scene, 90, H - 126, 'Every clue you find is pinned here. Click a card to read it and light up the cards it links to. Red cards are open questions: click one, then present the clue that answers it. Cards marked ? are still out there.', 28, '#aab8d8', W - 200));
  }
  // Every way out (the CLOSE button, the C key via Director.closeBoard) goes through here, so a
  // question the story is waiting on can't be closed unanswered and the episode can't move on.
  const tryClose = () => {
    if (opts.deduce && !state.flags[opts.deduce]) {
      const q = NODES.find((n) => n.id === opts.deduce)!;
      showInfo(q, 'Answer the question first. Elias won’t move on until he knows.', '#ffb0b0');
      opts.sfx?.('wrong');
      return;
    }
    layer.destroy();
    opts.onClose();
  };
  const close = pbutton(scene, W - 170, 60, 240, 64, 'CLOSE [C]', tryClose, 30);
  layer.add(close);
  opts.sfx?.('page');
  return { layer, close: tryClose };
}
