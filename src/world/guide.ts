// Wayfinding and onboarding for story mode, drawn in the UI scene:
//  - location signs that fade in over each landmark as you approach (SCHOOL, CLOCK TOWER…);
//  - arrows at the screen edge pointing to every objective that's off screen;
//  - tutorial cards that teach each control the first time it matters, and disappear once the
//    player has used it (nobody has to read HOW TO PLAY).
import Phaser from 'phaser';
import { H, W } from '../scenes/coreUi';
import type { Director } from './Director';
import { PANEL, panel, ptext } from './ui';

export type Lesson = 'move' | 'run' | 'jump' | 'interact' | 'board' | 'lantern' | 'dig';

const LESSONS: Record<Lesson, { keys: string[][]; text: string }> = {
  move: { keys: [['A', 'D'], ['←', '→']], text: 'Walk' },
  run: { keys: [['SHIFT']], text: 'Hold while walking to run' },
  jump: { keys: [['W'], ['SPACE']], text: 'Jump' },
  interact: { keys: [['E']], text: 'Look at anything marked !' },
  board: { keys: [['C']], text: 'Open the evidence board. Every clue you find is pinned there.' },
  lantern: { keys: [['F'], ['RIGHT MOUSE']], text: 'Hold to raise the lantern. The flame stirs when something hidden is near.' },
  dig: { keys: [['HOLD OR TAP LEFT MOUSE'], ['X']], text: 'Dig through rubble' },
};

interface Landmark {
  name: string;
  x: number;
  y: number; // where the sign floats (world px)
}

export class Guide {
  private d: Director;
  private queue: Lesson[] = [];
  private card?: { id: Lesson; c: Phaser.GameObjects.Container; since: number };
  private signs: { lm: Landmark; t: Phaser.GameObjects.Text }[] = [];
  private arrows: Phaser.GameObjects.Graphics;
  private arrowText: Phaser.GameObjects.Text[] = [];
  interacted = false;
  boardOpened = false;

  constructor(d: Director) {
    this.d = d;
    const ui = d.scene, A = d.a;
    const lms: Landmark[] = [
      { name: 'CEMETERY', x: A.start.x + 40, y: A.start.y - 80 },
      { name: 'THE OLD WELL', x: A.well.x, y: A.well.y - 62 },
      { name: 'SCHOOL', x: A.school.x, y: A.school.y - 150 },
      { name: 'OLD HOUSE (ARCHIVE)', x: A.house.x, y: A.house.y - 150 },
      { name: 'CLOCK TOWER', x: A.clock.x, y: A.footprints.y - 118 },
      { name: 'TOWER TOP: THE BELL', x: A.bell.x, y: A.bell.y - 56 },
      { name: 'TOWN SQUARE', x: A.square.x, y: A.square.y - 70 },
      { name: 'RIVER DOCK', x: A.dock.x - 60, y: A.dock.y - 70 },
      { name: 'ARCHIVE VAULT', x: A.vault.x, y: A.vault.y - 120 },
      { name: 'THE DEEPEST CHAMBER', x: A.chamber.x, y: A.chamber.y - 110 },
    ].filter((l) => Number.isFinite(l.x));
    for (const lm of lms) {
      const t = ptext(ui, 0, 0, lm.name, 30, '#e8e0f4').setOrigin(0.5).setDepth(8).setAlpha(0).setStroke('#05040a', 6);
      this.signs.push({ lm, t });
    }
    this.arrows = ui.add.graphics().setDepth(9);
  }

  /** Queue lessons; each shows once (remembered in the save) until the player does it. */
  teach(ids: Lesson[]) {
    for (const id of ids) if (!this.d.save.flags[`tut_${id}`] && !this.queue.includes(id)) this.queue.push(id);
  }

  private doneWith(id: Lesson): boolean {
    const w = this.d.world;
    switch (id) {
      case 'move': return w.did.move;
      case 'run': return w.did.run;
      case 'jump': return w.did.jump;
      case 'interact': return this.interacted;
      case 'board': return this.boardOpened;
      case 'lantern': return this.d.traces.some((t) => t.revealed);
      case 'dig': return w.did.dig;
    }
  }

  update() {
    const d = this.d;
    const free = d.isFree();
    // ---- tutorial card (hidden while anything else is talking)
    for (const id of [...this.queue]) {
      if (this.doneWith(id)) {
        this.queue = this.queue.filter((q) => q !== id);
        d.save.flags[`tut_${id}`] = true;
      }
    }
    // The lantern lesson jumps the queue the moment something hidden is near.
    const lantern = !d.save.flags.tut_lantern && d.nearTrace;
    if (lantern && !this.queue.includes('lantern')) this.queue.unshift('lantern');
    // A card the player ignores for 15 s goes to the back of the line, so one skipped control
    // (say, never running) can't hide the rest.
    if (this.card && this.card.id !== 'lantern' && d.world.time.now - this.card.since > 15000 && this.queue.length > 1) {
      this.queue = [...this.queue.filter((q) => q !== this.card!.id), this.card.id];
    }
    const want = free ? (this.queue.find((q) => q !== 'lantern' || lantern) ?? null) : null;
    if (this.card && this.card.id !== want) {
      const old = this.card.c;
      this.card = undefined;
      d.scene.tweens.add({ targets: old, alpha: 0, y: old.y + 20, duration: 200, onComplete: () => old.destroy() });
    }
    if (want && !this.card) this.card = { id: want, c: this.drawCard(want), since: d.world.time.now };

    // ---- location signs
    const px = d.player.x;
    for (const { lm, t } of this.signs) {
      const p = d.toScreen(lm.x, lm.y);
      const near = Math.abs(lm.x - px) < 15 * 16 && Math.abs(lm.y - d.player.y) < 16 * 16;
      const target = near && !d.busyUi && !d.qte.state && !d.world.locked ? 0.92 : 0;
      t.setPosition(p.x, p.y).setAlpha(t.alpha + (target - t.alpha) * 0.1);
    }

    // ---- arrows to off-screen objectives
    this.arrows.clear();
    const targets = free ? d.objectiveTargets() : [];
    let used = 0;
    for (const tg of targets.slice(0, 3)) {
      const p = d.toScreen(tg.x, tg.y - 40);
      if (p.x > 40 && p.x < W - 40 && p.y > 40 && p.y < H - 40) continue; // on screen: its "!" is enough
      const cx = W / 2, cy = H / 2;
      const ang = Math.atan2(p.y - cy, p.x - cx);
      // Clamp to a frame inside the screen, clear of the objective box and board button.
      const ex = Phaser.Math.Clamp(cx + Math.cos(ang) * 2000, 90, W - 90);
      const ey = Phaser.Math.Clamp(cy + Math.sin(ang) * 2000, 170, H - 120);
      const bob = Math.sin(d.world.time.now / 220) * 6;
      const ax = ex + Math.cos(ang) * bob, ay = ey + Math.sin(ang) * bob;
      const tri = [0, 2.5, -2.5].map((o) => [ax + Math.cos(ang + o) * (o ? 22 : 30), ay + Math.sin(ang + o) * (o ? 22 : 30)]);
      this.arrows.fillStyle(0x05040a, 0.8).fillCircle(ax, ay, 34);
      this.arrows.fillStyle(0xffe08a, 1).fillTriangle(tri[0][0], tri[0][1], tri[1][0], tri[1][1], tri[2][0], tri[2][1]);
      this.arrows.lineStyle(2, 0xffe08a, 0.7).strokeCircle(ax, ay, 34);
      const t = (this.arrowText[used] ??= ptext(d.scene, 0, 0, '', 28, '#ffe08a').setDepth(9).setStroke('#05040a', 6));
      // Keep the label inside the screen on whichever side the arrow sits.
      t.setText(tg.label).setOrigin(ex > W / 2 ? 1 : 0, 0.5).setPosition(ex > W / 2 ? ax - 46 : ax + 46, ay).setVisible(true);
      used++;
    }
    for (let i = used; i < this.arrowText.length; i++) this.arrowText[i].setVisible(false);
  }

  private drawCard(id: Lesson) {
    const ui = this.d.scene, L = LESSONS[id];
    const c = ui.add.container(W / 2, H - 120).setDepth(12);
    const parts: Phaser.GameObjects.GameObject[] = [];
    let x = 0;
    const items: Phaser.GameObjects.GameObject[] = [];
    L.keys.forEach((group, gi) => {
      if (gi) {
        const or = ptext(ui, x + 14, 0, 'or', 26, '#aab8d8').setOrigin(0, 0.5);
        items.push(or);
        x += or.width + 28;
      }
      for (const k of group) {
        const t = ptext(ui, 0, 0, k, 28, '#05040a').setOrigin(0.5);
        const kw = Math.max(52, t.width + 26);
        const g = ui.add.graphics();
        g.fillStyle(0x000000, 0.5).fillRoundedRect(x + 3, -24, kw, 50, 8);
        g.fillStyle(0xf3e9d2, 1).fillRoundedRect(x, -27, kw, 50, 8);
        g.lineStyle(3, 0x05040a, 1).strokeRoundedRect(x, -27, kw, 50, 8);
        t.setPosition(x + kw / 2, -2);
        items.push(g, t);
        x += kw + 10;
      }
    });
    const text = ptext(ui, x + 18, 0, L.text, 32, '#ffffff').setOrigin(0, 0.5);
    items.push(text);
    x += 18 + text.width;
    const pad = 28, w = x + pad * 2, h = 84;
    parts.push(panel(ui, -w / 2, -h / 2, w, h, 0.92));
    const accent = ui.add.rectangle(-w / 2, -h / 2, 6, h, 0x7fe0d4).setOrigin(0);
    parts.push(accent);
    for (const o of items) (o as unknown as { x: number }).x += -w / 2 + pad;
    c.add([...parts, ...items]);
    c.setAlpha(0).setY(H - 100);
    ui.tweens.add({ targets: c, alpha: 1, y: H - 120, duration: 250, ease: 'Sine.Out' });
    void PANEL;
    return c;
  }
}
