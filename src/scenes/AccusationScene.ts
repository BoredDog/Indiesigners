import Phaser from 'phaser';
import { Bubble, COLORS, FONTS, TEXT_RESOLUTION, dur, impact, pageTurn, ts } from '../comic';
import { Accusation, type AccusationPicks } from '../core/Accusation';
import { evidence, type WitnessId } from '../core/StoryData';
import { backdrop, button, hudIcons, label, popup } from './coreUi';

const CARD_W = 400;
const SFX_W = 118; // left strip of a card: the SFX word; the clue text sits to its right
const COL_X = [230, 650, 1070]; // three witness columns, clear of the right-hand panel
const COL_TOP = 290;
const COL_BOTTOM = 1060;
const CONC_X = 1600;
const PANEL_W = 560;

/**
 * A2 final accusation (content/accusation.json, script v2 d9), between the Archive escape and the
 * Finale: one card per witness + the Archive's three documents in one hand (shown, not picked),
 * then name who caused the incident. Wrong → how many slots hold, or that option's nudge once all
 * three hold; no penalty. Right → CONFIRMED, the investigator's line, then the Finale.
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
    this.add.existing(new Bubble(this, 650, 168, { kind: 'narration', text: a.intro, maxWidth: 900, fontSize: 34, scaleCap: 1.15 }));

    a.slots.forEach((slot, col) => {
      label(this, COL_X[col] - CARD_W / 2, 222, slot.label, 30, { color: COLORS.spiritTealCss });
      // Cards stack by their own height; a long column shrinks to fit the screen.
      const column = this.add.container(COL_X[col], COL_TOP);
      let y = 0;
      for (const id of Accusation.cards(slot.witness)) {
        const card = this.card(id, slot.witness);
        const h = card.getData('h') as number;
        card.setY(y + h / 2);
        column.add(card);
        this.cardViews.set(id, card);
        y += h + 10;
      }
      const fit = (COL_BOTTOM - COL_TOP) / Math.max(1, y - 10);
      if (fit < 1) column.setScale(fit);
    });

    this.archiveClue();
    a.conclusions.forEach((c, i) => this.conclusionViews.set(c.id, this.conclusionCard(CONC_X, 480 + i * 92, c.id, c.text)));
    this.accuseBtn = button(this, CONC_X, 970, a.buttons.accuse, () => void this.accuse(), { fontSize: 44, width: 360, fill: 0x7fe0d4 });
  }

  /** The Archive's evidence is shown, not picked: three documents side by side, stamped SAME HAND. */
  private archiveClue() {
    const clue = Accusation.text.archiveClue;
    const H = 262;
    const doc = this.add.container(CONC_X, 300).setName('archiveClue');
    doc.add([
      this.add.rectangle(6, 6, PANEL_W, H, COLORS.ink),
      this.add.rectangle(0, 0, PANEL_W, H, COLORS.paper).setStrokeStyle(5, COLORS.spiritTeal),
      this.add.text(-PANEL_W / 2 + 18, -H / 2 + 8, clue.title, { fontFamily: `"${FONTS.sfx}"`, fontSize: '28px', color: COLORS.inkCss, resolution: TEXT_RESOLUTION }),
    ]);
    const dw = 168;
    clue.documents.forEach((d, i) => {
      const page = this.add.container((i - 1) * (dw + 14), 4).setAngle((i - 1) * 2.5);
      page.add([
        this.add.rectangle(3, 4, dw, 150, 0x000000, 0.3),
        this.add.rectangle(0, 0, dw, 150, 0xfff6c9).setStrokeStyle(2, COLORS.ink),
        this.add.text(-dw / 2 + 8, -68, d.title, { fontFamily: `"${FONTS.sfx}"`, fontSize: '17px', color: '#7a2f2f', resolution: TEXT_RESOLUTION }),
        this.add.text(-dw / 2 + 8, -46, d.text, {
          fontFamily: `"${FONTS.hand}"`,
          fontSize: `${ts(21, 1.1)}px`,
          color: '#1d3557',
          wordWrap: { width: dw - 14 },
          resolution: TEXT_RESOLUTION,
        }),
      ]);
      doc.add(page);
    });
    doc.add(
      this.add
        .text(0, 8, clue.stamp, { fontFamily: `"${FONTS.sfx}"`, fontSize: '54px', color: '#b3261e', stroke: '#b3261e', strokeThickness: 1, resolution: TEXT_RESOLUTION })
        .setOrigin(0.5)
        .setAngle(-12)
        .setAlpha(0.8),
    );
    doc.add(
      this.add
        .text(0, H / 2 - 22, clue.text, {
          fontFamily: `"${FONTS.narration}"`,
          fontSize: `${ts(19, 1.1)}px`,
          color: COLORS.inkCss,
          align: 'center',
          wordWrap: { width: PANEL_W - 30 },
          resolution: TEXT_RESOLUTION,
        })
        .setOrigin(0.5),
    );
  }

  /** One evidence card: SFX word on the left, clue text on the right; the height follows the text. */
  private card(id: string, witness: WitnessId): Phaser.GameObjects.Container {
    const e = evidence(id);
    const c = this.add.container(0, 0).setName(`acc:${id}`);
    const text = this.add
      .text(-CARD_W / 2 + SFX_W, 0, e.text, {
        fontFamily: `"${FONTS.narration}"`,
        fontSize: `${ts(17, 1.15)}px`, // small fixed card: capped at 115 %
        color: COLORS.inkCss,
        wordWrap: { width: CARD_W - SFX_W - 12 },
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0, 0.5);
    const h = Math.max(56, text.height + 16);
    const box = this.add.rectangle(0, 0, CARD_W, h, 0xfff6c9).setStrokeStyle(4, COLORS.ink);
    c.add([
      this.add.rectangle(5, 5, CARD_W, h, COLORS.ink),
      box,
      this.add
        .text(-CARD_W / 2 + 10, 0, e.sfx, {
          fontFamily: `"${FONTS.sfx}"`,
          fontSize: '21px',
          color: COLORS.amberCss,
          stroke: COLORS.inkCss,
          strokeThickness: 4,
          wordWrap: { width: SFX_W - 14 },
          resolution: TEXT_RESOLUTION,
        })
        .setOrigin(0, 0.5),
      text,
    ]);
    c.setData({ box, witness, h });
    c.setSize(CARD_W, h).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => this.pick(witness, id));
    return c;
  }

  private conclusionCard(x: number, y: number, id: string, text: string): Phaser.GameObjects.Container {
    const w = PANEL_W;
    const h = 80;
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

  /** One card per witness: picking a card replaces that column's previous pick. */
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
    const s = label(this, CONC_X, 660, a.stamp, 110, { color: '#c0392b', strokeThickness: 14 }).setOrigin(0.5).setAngle(-12).setDepth(50).setName('stamp');
    s.setScale(1.6).setAlpha(0);
    this.tweens.add({ targets: s, scale: 1, alpha: 1, duration: dur(300), ease: 'Back.Out', onComplete: () => impact(this) });
    const reaction = new Bubble(this, 650, 970, { kind: 'narration', text: result.reaction, maxWidth: 1000, fontSize: 30 }).setDepth(60);
    this.add.existing(reaction);
    reaction.appear(dur(500));
    this.busy = true;
    await new Promise((r) => this.time.delayedCall(dur(1400) || 50, r));
    this.busy = false;
    button(this, CONC_X, 970, a.buttons.continue, () => this.toFinale(), { fontSize: 40, width: 360 });
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
