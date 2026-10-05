import Phaser from 'phaser';
import { Bubble, dur, pageTurn, type BubbleKind } from '../comic';
import { gameState } from '../core/GameState';
import { story, type Question, type WitnessId } from '../core/StoryData';
import { H, W, backdrop, button, ghost, hudIcons, label } from './coreUi';

const COL_X = 1180; // bubble column centre
const LOG_TOP = 150; // the dialogue log scrolls inside LOG_TOP .. the top of the options
const LOG_LEFT = 560; // left edge of the log's clip (speech tails reach COL_X - 260)
const LINE_GAP = 26;
const MAX_LINES = 40; // older lines are dropped past this
const ENTER_Y = 930;

/**
 * Witness conversation (Blueprint G2, A10): 3–6 bubbles on the first visit, the repeat line on
 * later visits, evidence-gated investigation questions, then ENTER HER/HIS/THE ARCHIVE MEMORY.
 * Elias only narrates (narration boxes); witnesses speak in bubbles.
 * The lines sit in a clipped log above the options: it follows the newest line and scrolls back
 * with the mouse wheel, ↑/↓ or the ▲/▼ hints, so long answers never run under the buttons.
 */
export class ConversationScene extends Phaser.Scene {
  private witness: WitnessId = 'mira';
  private lines: Bubble[] = [];
  private options: Phaser.GameObjects.GameObject[] = [];
  private queue: string[] = [];
  private log!: Phaser.GameObjects.Container;
  private clip!: Phaser.GameObjects.Graphics;
  private logBottom = H - 40;
  private contentH = 0;
  private scroll = 0;
  private moreUp!: Phaser.GameObjects.Text;
  private moreDown!: Phaser.GameObjects.Text;

  constructor() {
    super('Conversation');
  }

  create(data: { witness?: WitnessId } = {}) {
    this.witness = data.witness ?? 'mira';
    this.lines = [];
    this.options = [];
    this.logBottom = H - 40;
    this.contentH = 0;
    this.scroll = 0;
    const d = story.dialogue[this.witness];

    backdrop(this, 0.6);
    ghost(this, this.witness, 420, 1000, 1.15);
    label(this, 420, 1010, d.name.toUpperCase(), 44).setOrigin(0.5, 1);
    hudIcons(this, 'Conversation');

    this.log = this.add.container(0, 0).setName('log');
    this.clip = this.make.graphics({}, false);
    this.log.setMask(this.clip.createGeometryMask());
    this.moreUp = this.hint('▲ earlier', -1).setName('log:up');
    this.moreDown = this.hint('▼ newer', 1).setName('log:down');
    this.updateClip();

    const status = gameState.witnessStatus(this.witness);
    if (status === 'unvisited') {
      gameState.setWitness(this.witness, 'active');
      this.queue = [...d.first];
    } else {
      this.queue = [status === 'resolved' ? d.resolution.lastLine : d.repeat];
    }

    // Click anywhere (or Space/Enter) advances the next bubble.
    const advance = () => this.next();
    this.add.zone(0, 0, W, H).setOrigin(0).setInteractive().on('pointerup', advance).setDepth(-1).setName('advance');
    this.input.keyboard?.on('keydown-SPACE', advance);
    this.input.keyboard?.on('keydown-ENTER', advance);
    this.input.keyboard?.on('keydown-UP', () => this.scrollTo(this.scroll - 160));
    this.input.keyboard?.on('keydown-DOWN', () => this.scrollTo(this.scroll + 160));
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.scrollTo(this.scroll + dy));
    this.next();
  }

  private hint(text: string, dir: -1 | 1) {
    const t = label(this, COL_X, 0, text, 24, { color: '#cfc4a8' })
      .setOrigin(0.5)
      .setDepth(5)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    t.on('pointerup', (_p: unknown, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation(); // don't also advance the dialogue
      this.scrollTo(this.scroll + dir * 240);
    });
    return t;
  }

  private next() {
    const line = this.queue.shift();
    if (line === undefined) return;
    this.say('speech', line);
    if (this.queue.length === 0) this.showOptions();
  }

  private say(kind: BubbleKind, text: string) {
    const b = new Bubble(this, COL_X, 0, {
      kind,
      text,
      maxWidth: kind === 'speech' ? 520 : 600,
      fontSize: kind === 'speech' ? 34 : 28,
      tail: kind === 'speech' ? { x: -260, y: 30 } : undefined,
    });
    b.setName(`line:${text}`);
    this.log.add(b);
    this.lines.push(b);
    while (this.lines.length > MAX_LINES) this.lines.shift()!.destroy();
    this.layoutLines();
    // Blueprint N bubble entrance (rise 6 px, 0.2 s) from its final position.
    const homeY = b.y;
    b.setAlpha(0).setY(homeY + 6);
    this.tweens.add({ targets: b, alpha: 1, y: homeY, duration: dur(200), ease: 'Cubic.Out' });
    this.scrollTo(this.maxScroll(), true);
  }

  /** Stacks the lines top-down from LOG_TOP (log-local coordinates). */
  private layoutLines() {
    let y = LOG_TOP;
    for (const l of this.lines) {
      l.setPosition(l.kind === 'narration' ? COL_X + 80 : COL_X, y + l.height / 2);
      y += l.height + LINE_GAP;
    }
    this.contentH = y - LINE_GAP - LOG_TOP;
  }

  private maxScroll() {
    return Math.max(0, this.contentH - (this.logBottom - LOG_TOP));
  }

  private scrollTo(target: number, animate = false) {
    this.scroll = Phaser.Math.Clamp(target, 0, this.maxScroll());
    this.tweens.killTweensOf(this.log);
    if (animate) this.tweens.add({ targets: this.log, y: -this.scroll, duration: dur(200), ease: 'Cubic.Out' });
    else this.log.y = -this.scroll;
    this.moreUp.setVisible(this.scroll > 1);
    this.moreDown.setVisible(this.scroll < this.maxScroll() - 1);
  }

  /** The log's visible window: LOG_TOP .. logBottom (screen space). */
  private updateClip() {
    this.clip.clear().fillStyle(0xffffff).fillRect(LOG_LEFT, LOG_TOP - 20, W - LOG_LEFT, this.logBottom - LOG_TOP + 20);
    this.moreUp.setY(LOG_TOP - 34);
    this.moreDown.setY(this.logBottom + 4);
  }

  private showOptions() {
    this.options.forEach((o) => o.destroy());
    this.options = [];
    const d = story.dialogue[this.witness];
    const questions = gameState.questionsFor(this.witness);
    // Bottom-up: ENTER … MEMORY, then the questions above it (in order), then the log above those.
    const enter = button(this, COL_X + 60, ENTER_Y, d.enterButton, () => this.enterMemory(), {
      fontSize: 48,
      width: 760,
      fill: 0x7fe0d4,
    });
    this.options.push(enter);
    let top = ENTER_Y - enter.height / 2 - 24;
    for (const q of [...questions].reverse()) {
      const asked = gameState.wasAsked(q.id);
      const b = button(this, COL_X + 60, 0, q.ask, () => this.ask(q), { fontSize: 26, width: 760, fill: asked ? 0xcfc4a8 : undefined });
      b.setY(top - b.height / 2);
      top -= b.height + 14;
      this.options.push(b);
    }
    this.options.push(button(this, 140, 1020, 'BACK', () => this.leave(), { fontSize: 26, width: 160 }));
    this.logBottom = top - 30;
    this.updateClip();
    this.scrollTo(this.maxScroll());
  }

  private ask(q: Question) {
    gameState.markAsked(q.id);
    this.say('narration', q.ask);
    this.say('speech', q.answer);
    this.showOptions();
  }

  private enterMemory() {
    pageTurn(this, () => this.scene.start('Memory', { witness: this.witness }));
  }

  private leave() {
    pageTurn(this, () => this.scene.start('Village'));
  }
}
