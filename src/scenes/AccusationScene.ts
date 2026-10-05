import Phaser from 'phaser';
import { Bubble, COLORS, FONTS, TEXT_RESOLUTION, dur, impact, pageTurn, ts } from '../comic';
import { Accusation, type AccusationPicks } from '../core/Accusation';
import { evidence, type WitnessId } from '../core/StoryData';
import { backdrop, button, hudIcons, label, popup } from './coreUi';

const CARD_W = 380;
const CARD_H = 84;
const COL_X = [220, 620, 1020]; // three witness columns, clear of the right-hand panel
const CONC_X = 1580;
const PANEL_W = 600;

/**
 * A2 final accusation (content/accusation.json), between the Archive escape and the Finale:
 * one clue per witness + the Archive's handwriting match, then name who caused the incident.
 * Wrong → that option's nudge (B1 style), no penalty. Right → CASE CLOSED, then the Finale.
 */
export class AccusationScene extends Phaser.Scene {
  private picks: AccusationPicks = {};
  private conclusion?: string;
  private cardViews = new Map<string, Phaser.GameObjects.Container>();
  private conclusionViews = new Map<string, Phaser.GameObjects.Container>();
  private busy = false;
  private accuseBtn?: Phaser.GameObjects.Container;

  constructor() {
    super('Accusation');
  }

  create() {
    this.picks = {};
    this.conclusion = undefined;
    this.cardViews.clear();
    this.conclusionViews.clear();
    this.busy = false;
    const a = Accusation.text;

    backdrop(this, 0.8);
    hudIcons(this, 'Accusation');
    label(this, 80, 40, a.title, 56);
    this.add.existing(new Bubble(this, 960, 160, { kind: 'narration', text: `${a.question}\n${a.intro}`, maxWidth: 900, fontSize: 34, scaleCap: 1.15 }));

    a.slots.forEach((slot, col) => {
      label(this, COL_X[col] - CARD_W / 2, 250, slot.label, 30, { color: COLORS.spiritTealCss });
      Accusation.cards(slot.witness).forEach((id, i) => {
        this.cardViews.set(id, this.card(COL_X[col], 320 + i * (CARD_H + 12) + CARD_H / 2, id, slot.witness));
      });
    });

    // The Archive's evidence is shown, not picked: the case request and the apprentice log match.
    const doc = this.add.container(CONC_X, 300).setName('archiveClue');
    doc.add([
      this.add.rectangle(6, 6, PANEL_W, 130, COLORS.ink),
      this.add.rectangle(0, 0, PANEL_W, 130, COLORS.paper).setStrokeStyle(5, COLORS.spiritTeal),
      this.add.text(-PANEL_W / 2 + 20, -50, a.archiveClue.title, { fontFamily: `"${FONTS.sfx}"`, fontSize: '28px', color: COLORS.inkCss, resolution: TEXT_RESOLUTION }),
      this.add.text(-PANEL_W / 2 + 20, -12, a.archiveClue.text, {
        fontFamily: `"${FONTS.narration}"`,
        fontSize: `${ts(24, 1.2)}px`,
        color: COLORS.inkCss,
        wordWrap: { width: PANEL_W - 40 },
        resolution: TEXT_RESOLUTION,
      }),
    ]);

    a.conclusions.forEach((c, i) => this.conclusionViews.set(c.id, this.conclusionCard(CONC_X, 430 + i * 96, c.id, c.text)));
    this.accuseBtn = button(this, CONC_X, 960, a.buttons.accuse, () => void this.accuse(), { fontSize: 44, width: 360, fill: 0x7fe0d4 });
  }

  private card(x: number, y: number, id: string, witness: WitnessId): Phaser.GameObjects.Container {
    const e = evidence(id);
    const c = this.add.container(x, y).setName(`acc:${id}`);
    const box = this.add.rectangle(0, 0, CARD_W, CARD_H, 0xfff6c9).setStrokeStyle(4, COLORS.ink);
    c.add([
      this.add.rectangle(5, 5, CARD_W, CARD_H, COLORS.ink),
      box,
      this.add.text(-CARD_W / 2 + 12, -CARD_H / 2 + 6, e.sfx, { fontFamily: `"${FONTS.sfx}"`, fontSize: '22px', color: COLORS.amberCss, stroke: COLORS.inkCss, strokeThickness: 4, resolution: TEXT_RESOLUTION }),
      this.add.text(-CARD_W / 2 + 12, -CARD_H / 2 + 34, e.text, {
        fontFamily: `"${FONTS.narration}"`,
        fontSize: `${ts(17, 1.15)}px`, // small fixed card: capped at 115 %
        color: COLORS.inkCss,
        wordWrap: { width: CARD_W - 24 },
        resolution: TEXT_RESOLUTION,
      }),
    ]);
    c.setData({ box, witness });
    c.setSize(CARD_W, CARD_H).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => this.pick(witness, id));
    return c;
  }

  private conclusionCard(x: number, y: number, id: string, text: string): Phaser.GameObjects.Container {
    const w = PANEL_W;
    const h = 82;
    const c = this.add.container(x, y).setName(`accuse:${id}`);
    const box = this.add.rectangle(0, 0, w, h, COLORS.paper).setStrokeStyle(4, COLORS.ink);
    c.add([
      this.add.rectangle(5, 5, w, h, COLORS.ink),
      box,
      this.add
        .text(0, 0, text, {
          fontFamily: `"${FONTS.speech}"`,
          fontSize: `${ts(24, 1.15)}px`,
          fontStyle: 'bold',
          color: COLORS.inkCss,
          align: 'center',
          wordWrap: { width: w - 40 },
          resolution: TEXT_RESOLUTION,
        })
        .setOrigin(0.5),
    ]);
    c.setData({ box });
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => this.pickConclusion(id));
    return c;
  }

  /** One clue per witness: picking a card replaces that column's previous pick. */
  pick(witness: WitnessId, id: string) {
    if (this.busy) return;
    this.picks[witness] = this.picks[witness] === id ? undefined : id;
    for (const [cid, v] of this.cardViews) {
      if (v.getData('witness') !== witness) continue;
      const on = this.picks[witness] === cid;
      (v.getData('box') as Phaser.GameObjects.Rectangle).setStrokeStyle(on ? 8 : 4, on ? COLORS.spiritTeal : COLORS.ink);
    }
  }

  pickConclusion(id: string) {
    if (this.busy) return;
    this.conclusion = id;
    for (const [k, v] of this.conclusionViews) {
      (v.getData('box') as Phaser.GameObjects.Rectangle).setStrokeStyle(k === id ? 8 : 4, k === id ? COLORS.spiritTeal : COLORS.ink);
    }
  }

  private async accuse() {
    if (this.busy) return;
    const a = Accusation.text;
    const result = Accusation.accuse(this.picks, this.conclusion);
    if (!result.ok) {
      await this.modal(result.message, [a.buttons.retry]);
      for (const id of Object.values(this.picks)) {
        const v = id && this.cardViews.get(id);
        if (v) this.tweens.add({ targets: v, x: v.x + 10, duration: dur(60), yoyo: true, repeat: 2 });
      }
      return;
    }
    this.accuseBtn?.setVisible(false);
    const s = label(this, CONC_X, 640, 'CASE CLOSED', 110, { color: '#c0392b', strokeThickness: 14 }).setOrigin(0.5).setAngle(-12).setDepth(50).setName('stamp');
    s.setScale(1.6).setAlpha(0);
    this.tweens.add({ targets: s, scale: 1, alpha: 1, duration: dur(300), ease: 'Back.Out', onComplete: () => impact(this) });
    const reaction = new Bubble(this, 690, 960, { kind: 'narration', text: result.reaction, maxWidth: 1000, fontSize: 30 });
    this.add.existing(reaction);
    reaction.appear(dur(500));
    this.busy = true;
    await new Promise((r) => this.time.delayedCall(dur(1400) || 50, r));
    this.busy = false;
    button(this, CONC_X, 960, a.buttons.continue, () => this.toFinale(), { fontSize: 40, width: 360 });
  }

  private async modal(text: string, buttons: string[]): Promise<string> {
    this.busy = true;
    const r = await popup(this, text, buttons);
    this.busy = false;
    return r;
  }

  private toFinale() {
    const next = this.scene.manager.keys['Finale'] ? 'Finale' : 'Village';
    pageTurn(this, () => this.scene.start(next));
  }
}
