// Hanna's records: what was rewritten. Two versions of the same village record side by side: the
// copy on the shelf, and the original as the lantern remembers it (teal). Click each word on the
// copy that was changed. Every change only uses facts the board already has (2:31, the river at
// 2:24, the apprentice, the archivist), so nothing is spoiled; the last one gives Hanna her name
// back. Story kit throughout: blue panels, VT323, gold for found, teal for the lantern's memory.
// Wrong clicks cost nothing; a HINT circles a change after 6 misses, SKIP after 15.
//
//   await d.rewritten.play(HANNA_RECORD);
import Phaser from 'phaser';
import { TEXT_RESOLUTION } from '../comic';
import { H, W, label } from '../scenes/coreUi';
import type { Director } from '../world/Director';
import { PIX, panel, pbutton, ptext } from '../world/ui';

export interface RecordSpec {
  title: string;
  how: string;
  /** Lines of the shelf copy and the original. `[[text|id]]` marks a change (same id on both). */
  copy: string[];
  original: string[];
  done?: string;
}

const DEPTH = 68;
const HINT_AFTER = 6, SKIP_AFTER = 15;
type Seg = { text: string; id?: string };

/** "2:31 [[The light|a]] took" → segments; plain words are split so each can be clicked. */
function parse(line: string): Seg[] {
  const out: Seg[] = [];
  const re = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
  let last = 0, m: RegExpExecArray | null;
  const plain = (t: string) => t.split(/(\s+)/).filter(Boolean).forEach((w) => out.push({ text: w }));
  while ((m = re.exec(line))) {
    plain(line.slice(last, m.index));
    out.push({ text: m[1], id: m[2] });
    last = m.index + m[0].length;
  }
  plain(line.slice(last));
  return out;
}

export class Rewritten {
  private d: Director;
  /** For tools/autoplay-story.ts: `auto()` finds every change. */
  state: { solved: boolean; auto: () => void } | null = null;

  constructor(d: Director) {
    this.d = d;
  }

  async play(spec: RecordSpec): Promise<void> {
    const d = this.d, s = d.scene;
    d.busyUi = true;
    const ids = [...new Set(spec.copy.flatMap((l) => parse(l).map((g) => g.id).filter(Boolean) as string[]))];
    const found = new Set<string>();
    let misses = 0, won = false;

    const layer = s.add.container(0, 0).setDepth(DEPTH).setAlpha(0);
    layer.add(s.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive());
    layer.add(label(s, W / 2, 120, spec.title, 72, { color: '#e8fbff', strokeThickness: 12 }).setOrigin(0.5));
    layer.add(s.add.text(W / 2, 194, spec.how, { fontFamily: PIX, fontSize: '36px', color: '#cfe6ee', resolution: TEXT_RESOLUTION }).setOrigin(0.5));
    const note = ptext(s, W / 2, 246, '', 30, '#ffe08a').setOrigin(0.5);
    layer.add(note);

    const pw = 830, ph = 560, py = 290, lx = W / 2 - pw - 20, rx = W / 2 + 20;
    layer.add(panel(s, lx, py, pw, ph, 0.97));
    layer.add(panel(s, rx, py, pw, ph, 0.97));
    // The original glows faintly teal: it's what the lantern remembers.
    layer.add(s.add.rectangle(rx + 6, py + 6, pw - 12, ph - 12, 0x7fe0d4, 0.07).setOrigin(0));
    layer.add(ptext(s, lx + pw / 2, py + 26, 'THE COPY ON THE SHELF', 30, '#7f9fd8').setOrigin(0.5, 0));
    layer.add(ptext(s, rx + pw / 2, py + 26, 'THE ORIGINAL, AS THE LANTERN REMEMBERS IT', 30, '#7fe0d4').setOrigin(0.5, 0));
    const marks = s.add.graphics();
    layer.add(marks);

    // Lay the words out; remember where every change sits on both pages.
    const where: Record<string, { left: Phaser.GameObjects.Text[]; right: Phaser.GameObjects.Text[] }> = {};
    const lineH = 50, top = py + 90, size = 32;
    const page = (lines: string[], x0: number, left: boolean) => {
      lines.forEach((line, li) => {
        let x = x0 + 36;
        const y = top + li * lineH;
        for (const g of parse(line)) {
          if (/^\s+$/.test(g.text)) {
            x += 12 * g.text.length;
            continue;
          }
          if (/^[.,]/.test(g.text)) x -= 6; // no gap before punctuation
          const blot = /█/.test(g.text); // ink blotted over a name
          const t = ptext(s, x, y, g.text, size, blot ? '#3a3050' : left ? '#ffffff' : '#d8f6f0');
          layer.add(t);
          x += t.width + 2;
          if (g.id) (where[g.id] ??= { left: [], right: [] })[left ? 'left' : 'right'].push(t);
          if (left) {
            t.setInteractive({ useHandCursor: true });
            t.on('pointerup', () => click(g, t));
          }
        }
      });
    };

    const box = (t: Phaser.GameObjects.Text, color: number, wdt = 3) => marks.lineStyle(wdt, color, 1).strokeRoundedRect(t.x - 6, t.y - 2, t.width + 12, t.height + 4, 6);
    const count = ptext(s, W / 2, py + ph + 30, '', 32, '#aab8d8').setOrigin(0.5, 0);
    layer.add(count);
    let hintId: string | null = null;
    const draw = () => {
      marks.clear();
      for (const id of found) {
        where[id].left.forEach((t) => (box(t, 0xffe08a), t.setColor(/█/.test(t.text) ? '#8a7040' : '#ffe08a')));
        where[id].right.forEach((t) => (box(t, 0x7fe0d4), t.setColor('#7fe0d4')));
      }
      if (hintId && !found.has(hintId)) where[hintId].left.forEach((t) => box(t, 0x7fe0d4, 5));
      count.setText(`FOUND ${found.size} OF ${ids.length}`);
      hintBtn.setVisible(misses >= HINT_AFTER && !won);
      skipBtn.setVisible(misses >= SKIP_AFTER && !won);
      const shown = btns.filter((b) => b.visible);
      shown.forEach((b, k) => b.setX(W / 2 + (k - (shown.length - 1) / 2) * 220));
    };

    let resolveWin: () => void = () => undefined;
    const winP = new Promise<void>((r) => (resolveWin = r));
    const click = (g: Seg, t: Phaser.GameObjects.Text) => {
      if (won) return;
      if (g.id && !found.has(g.id)) {
        found.add(g.id);
        d.sfx('page', 0.5);
        note.setText('Changed. The original says something else.').setColor('#ffe08a');
        if (found.size === ids.length) (won = true), resolveWin();
      } else if (!g.id) {
        misses++;
        d.audio.play('click', 0.25, -900);
        note.setText(`“${t.text}” matches the original.`).setColor('#aab8d8');
        s.tweens.add({ targets: t, x: t.x + 4, yoyo: true, repeat: 2, duration: 40 });
      }
      draw();
    };

    const row = py + ph + 110;
    const btns = [
      pbutton(s, 0, row, 200, 64, 'HINT', () => {
        hintId = ids.find((i) => !found.has(i)) ?? null;
        note.setText('The lantern lingers on the word circled in teal.').setColor('#7fe0d4');
        draw();
      }, 30),
      pbutton(s, 0, row, 200, 64, 'SKIP', () => ((won = true), resolveWin()), 30),
    ];
    const [hintBtn, skipBtn] = btns;
    layer.add(btns);

    page(spec.copy, lx, true);
    page(spec.original, rx, false);
    layer.add(ptext(s, W / 2, row + 50, 'Read both pages, then click each changed word on the copy.', 28, '#aab8d8').setOrigin(0.5));
    const state = { solved: false, auto: () => ids.forEach((id, k) => s.time.delayedCall(150 * (k + 1), () => click({ text: '', id }, where[id].left[0]))) };
    this.state = state;
    draw();
    d.sfx('page', 0.5);
    s.tweens.add({ targets: layer, alpha: 1, duration: 200 });
    try {
      await Promise.race([winP, d.until(() => !d.alive)]);
      state.solved = true;
      d.audio.tone('chime');
      ids.forEach((id) => found.add(id));
      draw();
      layer.add(s.add.rectangle(0, py, W, ph, 0x05040a, 0.55).setOrigin(0));
      layer.add(label(s, W / 2, py + ph / 2, spec.done ?? 'FOUND WHAT WAS REWRITTEN', 76, { color: '#7fe0d4', strokeThickness: 14 }).setOrigin(0.5));
      await d.wait(1600);
    } finally {
      this.state = null;
      s.tweens.add({ targets: layer, alpha: 0, duration: 250, onComplete: () => layer.destroy() });
      d.busyUi = false;
    }
  }
}

/** Episode 4: the village record at the old house. Five changes; the last gives Hanna her name back. */
export const HANNA_RECORD: RecordSpec = {
  title: 'WHAT WAS REWRITTEN',
  how: 'The copy on the shelf was changed in five places. Find them.',
  copy: [
    'VEYRA VILLAGE RECORD. THE NIGHT OF 2:17.',
    '1:58   All quiet. The watchman on his round.',
    '2:17   The bell rang. Everyone ran to the square.',
    '2:20   The archivist [[stayed at home|hanna]].',
    '[[2:17|river]]   The river turned. Boats loaded at the dock.',
    '[[2:17|light]]   The light took the square. The log ends.',
    'Present: three witnesses and [[no|apprentice]] apprentice.',
    'Teacher: Ivy. Boatman: Luke.',
    'Signed by the archivist, [[███████|name]].',
  ],
  original: [
    'VEYRA VILLAGE RECORD. THE NIGHT OF 2:17.',
    '1:58   All quiet. The watchman on his round.',
    '2:17   The bell rang. Everyone ran to the square.',
    '2:20   The archivist [[left the house|hanna]].',
    '[[2:24|river]]   The river turned. Boats loaded at the dock.',
    '[[2:31|light]]   The light took the square. The log ends.',
    'Present: three witnesses and [[one|apprentice]] apprentice.',
    'Teacher: Ivy. Boatman: Luke.',
    'Signed by the archivist, [[Hanna|name]].',
  ],
  done: 'FOUND WHAT WAS REWRITTEN',
};
