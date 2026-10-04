import Phaser from 'phaser';
import { Bubble, dur, pageTurn, type BubbleKind } from '../comic';
import { gameState } from '../core/GameState';
import { story, type Question, type WitnessId } from '../core/StoryData';
import { H, W, backdrop, button, ghost, hudIcons, label } from './coreUi';

const COL_X = 1180; // bubble column centre
const TOP = 170;
const MAX_LINES = 5;

/**
 * Witness conversation (Blueprint G2, A10): 3–6 bubbles on the first visit, the repeat line on
 * later visits, evidence-gated investigation questions, then ENTER HER/HIS/THE ARCHIVE MEMORY.
 * Elias only narrates (narration boxes); witnesses speak in bubbles.
 */
export class ConversationScene extends Phaser.Scene {
  private witness: WitnessId = 'mira';
  private lines: Bubble[] = [];
  private options: Phaser.GameObjects.GameObject[] = [];
  private queue: string[] = [];

  constructor() {
    super('Conversation');
  }

  create(data: { witness?: WitnessId } = {}) {
    this.witness = data.witness ?? 'mira';
    this.lines = [];
    this.options = [];
    const d = story.dialogue[this.witness];

    backdrop(this, 0.6);
    ghost(this, this.witness, 420, 1000, 1.15);
    label(this, 420, 1010, d.name.toUpperCase(), 44).setOrigin(0.5, 1);
    hudIcons(this, 'Conversation');

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
    this.next();
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
    this.add.existing(b);
    this.lines.push(b);
    while (this.lines.length > MAX_LINES) this.lines.shift()!.destroy();
    let y = TOP;
    for (const l of this.lines) {
      l.setPosition(l.kind === 'narration' ? COL_X + 80 : COL_X, y + l.height / 2);
      y += l.height + 26;
    }
    // Blueprint N bubble entrance (rise 6 px, 0.2 s) from its final position.
    const homeY = b.y;
    b.setAlpha(0).setY(homeY + 6);
    this.tweens.add({ targets: b, alpha: 1, y: homeY, duration: dur(200), ease: 'Cubic.Out' });
  }

  private showOptions() {
    this.options.forEach((o) => o.destroy());
    this.options = [];
    const d = story.dialogue[this.witness];
    const questions = gameState.questionsFor(this.witness);
    let y = 700;
    for (const q of questions) {
      const asked = gameState.wasAsked(q.id);
      const b = button(this, COL_X + 60, y, q.ask, () => this.ask(q), { fontSize: 26, width: 760, fill: asked ? 0xcfc4a8 : undefined });
      this.options.push(b);
      y += 72;
    }
    const enter = button(this, COL_X + 60, Math.max(y + 30, 900), d.enterButton, () => this.enterMemory(), {
      fontSize: 48,
      width: 760,
      fill: 0x7fe0d4,
    });
    this.options.push(enter);
    this.options.push(button(this, 140, 1020, 'BACK', () => this.leave(), { fontSize: 26, width: 160 }));
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
