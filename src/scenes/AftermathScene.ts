import Phaser from 'phaser';
import { Bubble, COLORS, dur, pageTurn } from '../comic';
import { gameState } from '../core/GameState';
import { fmt, story, witnessName, type Thread, type WitnessId } from '../core/StoryData';
import { W, button, ghost, hudIcons, label, popup } from './coreUi';

const PAGE = { x: 40, y: 110, w: 1840, h: 850 };
const GUTTER = 24;

/**
 * Return to the village (Blueprint I, K): the witness's post-memory line, their resolution beat if
 * all three deductions are confirmed, then one panel per new evidence thread (caption + reaction),
 * or "Nothing new. Recheck the evidence." Ends with RETURN TO VILLAGE.
 */
export class AftermathScene extends Phaser.Scene {
  constructor() {
    super('Aftermath');
  }

  create(data: { witness?: WitnessId } = {}) {
    const w = data.witness ?? 'mira';
    const d = story.dialogue[w];
    const ui = story.ui.aftermath;
    const resolvingNow = gameState.deductionsConfirmed(w) === 3 && gameState.witnessStatus(w) !== 'resolved';
    if (resolvingNow) gameState.setWitness(w, 'resolved');
    const threads = gameState.takeAftermathThreads();

    this.cameras.main.setBackgroundColor(COLORS.ink);
    if (this.textures.exists('px_bg_aftermath_dawn')) this.add.image(0, 0, 'px_bg_aftermath_dawn').setOrigin(0).setScale(4); // pixel dawn behind the page
    this.add.image(PAGE.x, PAGE.y, 'paper').setOrigin(0).setDisplaySize(PAGE.w, PAGE.h);
    label(this, 60, 30, ui.title, 64);
    hudIcons(this, 'Aftermath');

    // Row 1: the witness who just finished, then their resolution beat (K).
    const rowH = 360;
    const top = PAGE.y + GUTTER;
    const half = (PAGE.w - GUTTER * 3) / 2;
    const p1 = this.panel(PAGE.x + GUTTER, top, resolvingNow ? half : PAGE.w - GUTTER * 2, rowH);
    ghost(this, w, p1.x + 170, p1.y + rowH - 10, 0.55);
    this.speech(p1.x + p1.w / 2 + 120, p1.y + rowH / 2, d.postMemory, 0);

    if (resolvingNow) {
      const p2 = this.panel(PAGE.x + GUTTER * 2 + half, top, half, rowH);
      ghost(this, w, p2.x + 170, p2.y + rowH - 10, 0.55).setAlpha(1);
      this.speech(p2.x + p2.w / 2 + 120, p2.y + rowH / 2, d.resolution.lastLine, 300);
    }

    // Row 2: one panel per new thread (I), or the quiet beat.
    const y2 = top + rowH + GUTTER;
    const h2 = PAGE.y + PAGE.h - GUTTER - y2;
    if (threads.length === 0) {
      const p = this.panel(PAGE.x + GUTTER, y2, PAGE.w - GUTTER * 2, h2);
      const nothing = new Bubble(this, p.x + p.w / 2, p.y + h2 / 2, { kind: 'narration', text: ui.nothingNew, maxWidth: 700, fontSize: 32 });
      this.add.existing(nothing);
    } else {
      const n = threads.length;
      const pw = (PAGE.w - GUTTER * (n + 1)) / n;
      threads.forEach((t, i) => this.threadPanel(t, PAGE.x + GUTTER + i * (pw + GUTTER), y2, pw, h2, 400 + i * 300));
    }

    button(this, W / 2, 1020, ui.return, () => pageTurn(this, () => this.scene.start('Village')), { fontSize: 38, width: 480 });

    if (resolvingNow) {
      const p = story.ui.popups.witnessResolved;
      this.time.delayedCall(dur(900) || 50, () => void popup(this, fmt(p.text, { ghost: witnessName(w) }), p.buttons));
    }
  }

  private panel(x: number, y: number, w: number, h: number) {
    this.add.rectangle(x, y, w, h, 0x2b2b30).setOrigin(0).setStrokeStyle(6, COLORS.ink);
    return { x, y, w, h };
  }

  private speech(x: number, y: number, text: string, delay: number) {
    const b = new Bubble(this, x, y, { kind: 'speech', text, maxWidth: 420, fontSize: 30, tail: { x: -220, y: 60 } });
    b.setName(`line:${text}`);
    this.add.existing(b);
    b.appear(dur(delay));
  }

  private threadPanel(t: Thread, x: number, y: number, w: number, h: number, delay: number) {
    const p = this.panel(x, y, w, h);
    const cards = story.casebook;
    const title = (id: string) => cards.find((c) => c.id === id)?.title ?? id;
    const typeLabel = story.ui.aftermath.threadLabels[t.type];
    const arrow = t.type === 'reveals' ? '→' : t.type === 'contradicts' ? '⇎' : '⇔';

    label(this, p.x + w / 2, p.y + 34, typeLabel, 44, { color: t.type === 'contradicts' ? '#e07a5f' : COLORS.spiritTealCss })
      .setOrigin(0.5)
      .setAngle(-3)
      .setName(`thread:${t.id}`);
    this.add
      .text(p.x + w / 2, p.y + 92, `${title(t.from)}  ${arrow}  ${title(t.to)}`, {
        fontFamily: '"Special Elite"',
        fontSize: '22px',
        color: COLORS.paperCss,
        align: 'center',
        wordWrap: { width: w - 40 },
      })
      .setOrigin(0.5, 0);
    const cap = new Bubble(this, p.x + w / 2, p.y + 210, { kind: 'narration', text: t.caption, maxWidth: Math.min(520, w - 60), fontSize: 24 });
    this.add.existing(cap);
    cap.appear(dur(delay));
    const r = new Bubble(this, p.x + w / 2, p.y + h - 80, {
      kind: 'speech',
      text: `${witnessName(t.reaction.speaker)}: "${t.reaction.line}"`,
      maxWidth: Math.min(480, w - 60),
      fontSize: 26,
    });
    this.add.existing(r);
    r.appear(dur(delay + 250));
  }
}
