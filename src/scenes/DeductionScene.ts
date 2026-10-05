import Phaser from 'phaser';
import { Bubble, COLORS, FONTS, TEXT_RESOLUTION, dur, impact, pageTurn, ts } from '../comic';
import { DeductionController, type ConclusionKey } from '../core/DeductionController';
import { gameState } from '../core/GameState';
import { deduction, evidence, fmt, story, type DeductionId, type WitnessId } from '../core/StoryData';
import { backdrop, button, hudIcons, label, popup } from './coreUi';

export interface DeductionData {
  deductionId: DeductionId;
  witness?: WitnessId;
  returnTo?: 'Memory' | 'Village';
}

const CARD_W = 480;
const CARD_H = 124;

/**
 * Deduction / RECONSTRUCT screen (Blueprint D1, E, M): pick the supporting evidence cards and one
 * conclusion. Wrong → closeness feedback (B1: what's off, never which card) with no penalty (A5).
 * Right → CONFIRMED stamp, Elias's reaction, autosave, then back to the Memory page or Village.
 */
export class DeductionScene extends Phaser.Scene {
  private args!: DeductionData;
  private selected = new Set<string>();
  private conclusion?: ConclusionKey;
  private cardViews = new Map<string, Phaser.GameObjects.Container>();
  private conclusionViews = new Map<ConclusionKey, Phaser.GameObjects.Container>();
  private busy = false;
  private confirmBtn?: Phaser.GameObjects.Container;

  constructor() {
    super('Deduction');
  }

  create(data: DeductionData) {
    this.args = data;
    this.selected = new Set();
    this.conclusion = undefined;
    this.cardViews.clear();
    this.conclusionViews.clear();
    this.busy = false;
    const d = deduction(data.deductionId);
    const done = gameState.deductionState(d.id) === 'confirmed';

    backdrop(this, 0.72, 'bg_deduction_desk');
    hudIcons(this, 'Deduction');
    label(this, 80, 40, story.ui.memory.reconstruct, 56);
    // Kept right of the ← BACK button at any text size (capped at 115 %, wraps instead of widening).
    const q = new Bubble(this, 1040, 175, { kind: 'narration', text: d.question, maxWidth: 960, fontSize: 38, scaleCap: 1.15 });
    this.add.existing(q);

    label(this, 100, 270, 'EVIDENCE', 30, { color: COLORS.spiritTealCss });
    DeductionController.cards(d.id).forEach((id, i) => {
      const x = 100 + (i % 2) * (CARD_W + 30) + CARD_W / 2;
      const y = 340 + Math.floor(i / 2) * (CARD_H + 26) + CARD_H / 2;
      this.cardViews.set(id, this.card(x, y, id));
    });

    label(this, 1180, 270, 'CONCLUSION', 30, { color: COLORS.spiritTealCss });
    DeductionController.conclusions(d.id).forEach((c, i) => {
      this.conclusionViews.set(c.key, this.conclusionCard(1510, 380 + i * 180, c.key, c.text));
    });

    if (done) {
      d.requiredEvidence.forEach((e) => this.toggleCard(e, true));
      this.pickConclusion('correct');
      this.stamp(false);
      button(this, 1510, 960, 'CONTINUE', () => this.back(), { fontSize: 40, width: 360 });
    } else {
      this.confirmBtn = button(this, 1510, 960, 'CONFIRM', () => void this.confirm(), { fontSize: 44, width: 360, fill: 0x7fe0d4 });
    }
    // Way back, top-left under the title where players look for it (was a small corner button).
    const backLabel = data.returnTo === 'Memory' ? '← BACK TO MEMORY' : '← BACK TO VILLAGE';
    button(this, 250, 160, backLabel, () => this.back(), { fontSize: 28, width: 340 }).setName('btn:BACK');
  }

  private card(x: number, y: number, id: string): Phaser.GameObjects.Container {
    const e = evidence(id);
    const c = this.add.container(x, y).setName(`card:${id}`);
    const shadow = this.add.rectangle(6, 6, CARD_W, CARD_H, COLORS.ink);
    const box = this.add.rectangle(0, 0, CARD_W, CARD_H, 0xfff6c9).setStrokeStyle(4, COLORS.ink);
    const sfx = this.add
      .text(-CARD_W / 2 + 16, -CARD_H / 2 + 8, e.sfx, { fontFamily: `"${FONTS.sfx}"`, fontSize: '30px', color: COLORS.amberCss, stroke: COLORS.inkCss, strokeThickness: 5, resolution: TEXT_RESOLUTION })
      .setOrigin(0, 0);
    const text = this.add
      .text(-CARD_W / 2 + 16, -CARD_H / 2 + 50, e.text, {
        fontFamily: `"${FONTS.narration}"`,
        fontSize: `${ts(22, 1.25)}px`, // fixed-size card: text size capped at 125 %
        color: COLORS.inkCss,
        wordWrap: { width: CARD_W - 32 },
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0, 0);
    const pin = this.add.circle(CARD_W / 2 - 22, -CARD_H / 2 + 20, 12, COLORS.spiritTeal).setStrokeStyle(3, COLORS.ink).setVisible(false);
    c.add([shadow, box, sfx, text, pin]);
    c.setData({ box, pin });
    c.setSize(CARD_W, CARD_H).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => this.toggleCard(id));
    return c;
  }

  private conclusionCard(x: number, y: number, key: ConclusionKey, text: string): Phaser.GameObjects.Container {
    const w = 680;
    const h = 150;
    const c = this.add.container(x, y).setName(`conclusion:${key}`);
    const shadow = this.add.rectangle(6, 6, w, h, COLORS.ink);
    const box = this.add.rectangle(0, 0, w, h, COLORS.paper).setStrokeStyle(4, COLORS.ink);
    const t = this.add
      .text(0, 0, text, {
        fontFamily: `"${FONTS.speech}"`,
        fontSize: `${ts(28, 1.25)}px`,
        fontStyle: 'bold',
        color: COLORS.inkCss,
        align: 'center',
        wordWrap: { width: w - 40 },
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5);
    c.add([shadow, box, t]);
    c.setData({ box });
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => this.pickConclusion(key));
    return c;
  }

  private toggleCard(id: string, on = !this.selected.has(id)) {
    if (this.busy) return;
    if (on) this.selected.add(id);
    else this.selected.delete(id);
    const v = this.cardViews.get(id);
    if (!v) return;
    (v.getData('box') as Phaser.GameObjects.Rectangle).setStrokeStyle(on ? 8 : 4, on ? COLORS.spiritTeal : COLORS.ink);
    (v.getData('pin') as Phaser.GameObjects.Arc).setVisible(on);
  }

  private pickConclusion(key: ConclusionKey) {
    if (this.busy) return;
    this.conclusion = key;
    for (const [k, v] of this.conclusionViews) {
      (v.getData('box') as Phaser.GameObjects.Rectangle).setStrokeStyle(k === key ? 8 : 4, k === key ? COLORS.spiritTeal : COLORS.ink);
    }
  }

  private async confirm() {
    if (this.busy) return;
    const d = deduction(this.args.deductionId);
    const ui = story.ui.popups;
    if (!this.conclusion || this.selected.size === 0) {
      await this.modal(story.ui.closeness.nothingYet, ui.unsupported.buttons);
      return this.nudge();
    }
    // Hypothesis prompt (Blueprint M): list the chosen clues and the conclusion, CONFIRM / BACK.
    const clues = [...this.selected].map((e) => evidence(e).text);
    const hypothesis = DeductionController.conclusions(d.id).find((c) => c.key === this.conclusion)!.text;
    const prompt = fmt(ui.hypothesisPrompt.text, { clue_a: clues[0], clue_b: clues.slice(1).join('\n'), hypothesis });
    const choice = await this.modal(prompt.replace(/\n\n/g, '\n'), ui.hypothesisPrompt.buttons);
    if (choice !== ui.hypothesisPrompt.buttons[0]) return;

    const result = DeductionController.attempt(d.id, [...this.selected], this.conclusion);
    if (!result.ok) {
      await this.modal(result.message, ui.unsupported.buttons);
      return this.nudge();
    }
    this.confirmBtn?.setVisible(false);
    this.stamp(true);
    const reaction = new Bubble(this, 640, 920, { kind: 'narration', text: result.reaction, maxWidth: 900, fontSize: 30 });
    this.add.existing(reaction);
    reaction.appear(dur(500));
    this.busy = true;
    await new Promise((r) => this.time.delayedCall(dur(1200) || 50, r));
    this.busy = false;
    await this.modal(fmt(ui.deductionConfirmed.text, { deduction: d.question }), ui.deductionConfirmed.buttons);
    this.back();
  }

  private async modal(text: string, buttons: string[]): Promise<string> {
    this.busy = true;
    const r = await popup(this, text, buttons);
    this.busy = false;
    return r;
  }

  /** Unsupported hypothesis: selected cards nudge apart, no harsh error (Blueprint N). */
  private nudge() {
    for (const id of this.selected) {
      const v = this.cardViews.get(id);
      if (v) this.tweens.add({ targets: v, x: v.x + 10, duration: dur(60), yoyo: true, repeat: 2 });
    }
  }

  private stamp(animate: boolean) {
    const s = label(this, 1510, 560, 'CONFIRMED', 120, { color: '#c0392b', strokeThickness: 14 })
      .setOrigin(0.5)
      .setAngle(-12)
      .setDepth(50)
      .setName('stamp');
    if (!animate) return;
    s.setScale(1.6).setAlpha(0);
    this.tweens.add({ targets: s, scale: 1, alpha: 1, duration: dur(300), ease: 'Back.Out', onComplete: () => impact(this) });
  }

  private back() {
    const { returnTo, witness } = this.args;
    const w = witness ?? deduction(this.args.deductionId).witness;
    pageTurn(this, () => {
      if (returnTo === 'Memory') this.scene.start('Memory', { witness: w });
      else this.scene.start('Village');
    });
  }
}
