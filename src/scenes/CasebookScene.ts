import Phaser from 'phaser';
import { Bubble, ComicButton, COLORS, comicSettings, dur, FONTS, TEXT_RESOLUTION, ts } from '../comic';
import { casebookDeps, type CaseCard, type CaseThread } from './casebook/CasebookDeps';
import type { Witness } from './memory/MemoryData';

export interface CasebookSceneData {
  /** Scene to wake/resume on close (it was slept or paused when the casebook opened). */
  returnTo?: string;
}

const CARD_W = 330;
const CARD_H = 180;
const COLS: Record<Witness, number> = { mira: 300, arun: 730, leela: 1160 };
const ROW_Y = [370, 590, 810];
const NAMES: Record<Witness, string> = { mira: 'MIRA', arun: 'ARUN', leela: 'LEELA' };
const THREAD_STYLE: Record<CaseThread['type'], { color: number; label: string }> = {
  corroborates: { color: 0x2f6f4f, label: 'CORROBORATES' },
  contradicts: { color: 0xb3261e, label: 'CONTRADICTS' },
  reveals: { color: 0x1d4f91, label: 'REVEALS' },
};

/**
 * The casebook corkboard (Blueprint J): three witness columns of deduction cards, a shared
 * timeline, THE CASE REQUEST, THE FIGURE and NIA cards, and relationship threads that appear once both ends are
 * known. Relationship types are always written out and use different line patterns, so colour
 * is never the only cue. Opened over another scene, which is paused and resumed on close.
 */
export class CasebookScene extends Phaser.Scene {
  private returnTo?: string;
  private cardPos = new Map<string, { x: number; y: number }>();
  private detail?: Phaser.GameObjects.Container;

  constructor() {
    super('Casebook');
  }

  preload() {
    if (!this.textures.exists('cork')) this.load.image('cork', 'assets/textures/cork001.jpg');
    if (!this.textures.exists('paper')) this.load.image('paper', 'assets/textures/paper002.jpg');
  }

  create(data: CasebookSceneData = {}) {
    this.returnTo = data.returnTo;
    this.cardPos.clear();
    const deps = casebookDeps();

    this.add.tileSprite(0, 0, 1920, 1080, 'cork').setOrigin(0).setTint(0xd9b27c).setInteractive();
    this.add.rectangle(0, 0, 1920, 1080).setOrigin(0).setStrokeStyle(28, 0x3b2a1a);

    this.add.text(60, 36, 'CASEBOOK', this.sfxStyle(64, COLORS.paperCss)).setDepth(5);
    this.add
      .existing(new ComicButton(this, 1790, 70, { label: 'CLOSE', fontSize: 30 }))
      .on('click', () => this.close());
    this.input.keyboard?.on('keydown-ESC', () => (this.detail ? this.closeDetail() : this.close()));
    this.input.keyboard?.on('keydown-C', () => this.close());

    this.drawTimeline();

    for (const w of Object.keys(COLS) as Witness[]) {
      this.add.text(COLS[w], 260, NAMES[w], this.sfxStyle(44, COLORS.paperCss)).setOrigin(0.5);
    }
    const cards = deps.cards();
    cards.forEach((c) => {
      const row = cards.filter((x) => x.witness === c.witness).indexOf(c);
      this.cardPos.set(c.id, { x: COLS[c.witness], y: ROW_Y[row] });
    });

    for (const c of cards) this.drawCard(c);
    this.drawFigureCards(cards);

    // Threads go on top of the cards, pin to pin, like string on a corkboard.
    const threadLayer = this.add.container(0, 0);
    for (const t of deps.threads()) this.drawThread(threadLayer, t);
  }

  // ------------------------------------------------------------------ pieces

  private drawTimeline() {
    const deps = casebookDeps();
    const y = 170;
    const g = this.add.graphics();
    g.lineStyle(6, COLORS.ink).lineBetween(300, y, 1400, y);
    const marks: { label: string; x: number; known: boolean; note: string }[] = [
      { label: '2:17', x: 640, known: deps.hasEvidence('ev_mira_clocks') || deps.hasEvidence('ev_mira_bell'), note: 'Every clock froze' },
      { label: '2:31', x: 1060, known: deps.hasEvidence('ev_mira_later_entry') || deps.hasEvidence('ev_arun_tick'), note: 'The night kept moving' },
    ];
    this.add.text(300, y + 20, 'INCIDENT NIGHT', this.noteStyle(22)).setAlpha(0.85);
    for (const m of marks) {
      g.fillStyle(m.known ? COLORS.amber : 0x6d5a43).fillCircle(m.x, y, 16);
      g.lineStyle(4, COLORS.ink).strokeCircle(m.x, y, 16);
      this.add.text(m.x, y + 26, m.known ? m.label : '?', this.sfxStyle(34, m.known ? COLORS.paperCss : '#a08a6a')).setOrigin(0.5, 0);
      if (m.known) this.add.text(m.x + 26, y - 6, m.note, this.handStyle(26, COLORS.paperCss)).setOrigin(0, 1);
    }
  }

  private drawCard(c: CaseCard) {
    const deps = casebookDeps();
    const pos = this.cardPos.get(c.id)!;
    const found = c.requiredEvidence.filter((e) => deps.hasEvidence(e)).length;
    const known = found > 0 || c.confirmed;
    const tilt = (this.hash(c.id) - 0.5) * 4;

    const card = this.add.container(pos.x, pos.y).setAngle(tilt);
    const shadow = this.add.rectangle(6, 8, CARD_W, CARD_H, 0x000000, 0.35);
    const paper = this.add.rectangle(0, 0, CARD_W, CARD_H, known ? COLORS.paper : 0x9b8b72).setStrokeStyle(3, COLORS.ink);
    const pin = this.add.circle(0, -CARD_H / 2 + 10, 11, 0xc0392b).setStrokeStyle(3, COLORS.ink);
    card.add([shadow, paper, pin]);

    if (!known) {
      card.add(this.add.text(0, 6, '?', this.sfxStyle(80, '#5f523f')).setOrigin(0.5));
      card.add(this.add.text(0, CARD_H / 2 - 22, 'Not yet investigated', this.noteStyle(18)).setOrigin(0.5));
      return;
    }

    card.add(
      this.add
        .text(-CARD_W / 2 + 16, -CARD_H / 2 + 26, c.question, { ...this.noteStyle(19), wordWrap: { width: CARD_W - 32 } })
        .setOrigin(0, 0),
    );
    const note = c.confirmed ? c.notes.final : this.relatedKnown(c.id) ? c.notes.related : c.notes.pinned;
    card.add(
      this.add
        .text(-CARD_W / 2 + 16, 8, note, { ...this.handStyle(25), wordWrap: { width: CARD_W - 32 } })
        .setOrigin(0, 0),
    );
    // Evidence pips: one per required clue.
    c.requiredEvidence.forEach((e, i) => {
      const px = CARD_W / 2 - 20 - (c.requiredEvidence.length - 1 - i) * 22;
      card.add(
        this.add.circle(px, -CARD_H / 2 + 22, 7, deps.hasEvidence(e) ? COLORS.spiritTeal : 0xffffff, 1).setStrokeStyle(2, COLORS.ink),
      );
    });
    if (c.confirmed) {
      card.add(
        this.add
          .text(CARD_W / 2 - 20, CARD_H / 2 - 18, 'CONFIRMED', { ...this.sfxStyle(30, '#b3261e'), stroke: '#b3261e', strokeThickness: 1 })
          .setOrigin(1, 1)
          .setAngle(-8)
          .setAlpha(0.85),
      );
    }

    paper.setInteractive({ useHandCursor: true }).on('pointerup', () => this.openDetail(c));
  }

  private relatedKnown(id: string) {
    return casebookDeps()
      .threads()
      .some((t) => t.from === id || t.to === id);
  }

  private drawThread(layer: Phaser.GameObjects.Container, t: CaseThread) {
    const pa = this.cardPos.get(t.from);
    const pb = this.cardPos.get(t.to);
    if (!pa || !pb) return;
    const a = { x: pa.x, y: pa.y - CARD_H / 2 + 10 }; // pins
    const b = { x: pb.x, y: pb.y - CARD_H / 2 + 10 };
    const style = THREAD_STYLE[t.type];
    const g = this.add.graphics();
    layer.add(g);
    const key = `thread_${t.from}_${t.to}`;
    const isNew = !casebookDeps().seen(key);
    casebookDeps().markSeen(key);

    const draw = (p: number) => {
      g.clear();
      const ex = a.x + (b.x - a.x) * p;
      const ey = a.y + (b.y - a.y) * p;
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const nx = -Math.sin(ang) * 5;
      const ny = Math.cos(ang) * 5;
      if (t.type === 'corroborates') {
        // Double line.
        g.lineStyle(4, style.color).lineBetween(a.x + nx, a.y + ny, ex + nx, ey + ny);
        g.lineStyle(4, style.color).lineBetween(a.x - nx, a.y - ny, ex - nx, ey - ny);
      } else if (t.type === 'contradicts') {
        // Broken line.
        const len = Math.hypot(ex - a.x, ey - a.y);
        g.lineStyle(6, style.color);
        for (let d = 0; d < len; d += 34) {
          const d2 = Math.min(d + 20, len);
          g.lineBetween(a.x + Math.cos(ang) * d, a.y + Math.sin(ang) * d, a.x + Math.cos(ang) * d2, a.y + Math.sin(ang) * d2);
        }
      } else {
        // Solid line with an arrowhead.
        g.lineStyle(6, style.color).lineBetween(a.x, a.y, ex, ey);
        if (p >= 1) {
          const tipX = b.x - Math.cos(ang) * 16;
          const tipY = b.y - Math.sin(ang) * 16;
          g.fillStyle(style.color).fillTriangle(
            tipX,
            tipY,
            tipX - Math.cos(ang - 0.45) * 30,
            tipY - Math.sin(ang - 0.45) * 30,
            tipX - Math.cos(ang + 0.45) * 30,
            tipY - Math.sin(ang + 0.45) * 30,
          );
        }
      }
    };

    const label = this.add
      .text((a.x + b.x) / 2, (a.y + b.y) / 2, style.label, {
        ...this.sfxStyle(26, '#ffffff'),
        backgroundColor: Phaser.Display.Color.IntegerToColor(style.color).rgba,
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5)
      .setAngle(-4);
    layer.add(label);

    if (isNew && !comicSettings.reduceMotion) {
      label.setAlpha(0);
      const prog = { p: 0 };
      this.tweens.add({
        targets: prog,
        p: 1,
        duration: dur(800),
        ease: 'Cubic.Out',
        onUpdate: () => draw(prog.p),
        onComplete: () => this.tweens.add({ targets: label, alpha: 1, duration: 250 }),
      });
    } else draw(1);
  }

  private drawFigureCards(cards: CaseCard[]) {
    const deps = casebookDeps();
    const figureSeen = deps.hasEvidence('ev_mira_staff') || cards.some((c) => c.witness !== 'mira' && c.confirmed);
    const niaSeen = deps.hasEvidence('ev_mira_clinic') || deps.hasEvidence('ev_arun_cloth');
    const x = 1640;

    const fig = this.add.container(x, 470).setAngle(2);
    fig.add(this.add.rectangle(6, 8, 300, 330, 0x000000, 0.35));
    fig.add(this.add.rectangle(0, 0, 300, 330, 0x1b1b20).setStrokeStyle(3, COLORS.ink));
    fig.add(this.add.circle(0, -155, 11, 0xc0392b).setStrokeStyle(3, COLORS.ink));
    if (this.textures.exists('ph_figure') && figureSeen) {
      fig.add(this.add.image(0, 20, 'ph_figure').setScale(0.42).setTintFill(0x000000));
    } else fig.add(this.add.text(0, 10, '?', this.sfxStyle(90, '#55555f')).setOrigin(0.5));
    fig.add(this.add.text(0, -140, 'THE FIGURE', this.sfxStyle(34, COLORS.paperCss)).setOrigin(0.5, 0));
    if (figureSeen) {
      fig.add(
        this.add
          .text(0, 120, deps.sideNote('figure'), {
            ...this.handStyle(22, COLORS.paperCss),
            align: 'center',
            wordWrap: { width: 260 },
          })
          .setOrigin(0.5),
      );
    }

    const nia = this.add.container(x, 830).setAngle(-3);
    nia.add(this.add.rectangle(6, 8, 300, 200, 0x000000, 0.35));
    nia.add(this.add.rectangle(0, 0, 300, 200, niaSeen ? COLORS.paper : 0x9b8b72).setStrokeStyle(3, COLORS.ink));
    nia.add(this.add.circle(0, -90, 11, 0xc0392b).setStrokeStyle(3, COLORS.ink));
    nia.add(this.add.text(0, -70, niaSeen ? 'NIA VANE' : '???', this.sfxStyle(34, COLORS.inkCss)).setOrigin(0.5, 0));
    if (niaSeen) {
      nia.add(
        this.add
          .text(0, 30, deps.sideNote('nia'), { ...this.handStyle(24), align: 'center', wordWrap: { width: 260 } })
          .setOrigin(0.5),
      );
    }

    // THE CASE REQUEST (script v2 d7): pinned from the start, the reason I came to Veyra.
    const req = this.add.container(x, 205).setAngle(-2).setName('card:case_request');
    req.add(this.add.rectangle(6, 8, 300, 170, 0x000000, 0.35));
    req.add(this.add.rectangle(0, 0, 300, 170, 0xfff6c9).setStrokeStyle(3, COLORS.ink));
    req.add(this.add.circle(0, -76, 11, 0xc0392b).setStrokeStyle(3, COLORS.ink));
    req.add(this.add.text(0, -60, 'THE CASE REQUEST', this.sfxStyle(28, COLORS.inkCss)).setOrigin(0.5, 0));
    req.add(
      this.add
        .text(0, 26, deps.sideNote('case_request'), { ...this.handStyle(24), align: 'center', wordWrap: { width: 270 } })
        .setOrigin(0.5),
    );
  }

  // ------------------------------------------------------------------ detail overlay

  private openDetail(c: CaseCard) {
    this.closeDetail();
    const deps = casebookDeps();
    const layer = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(0, 0, 1920, 1080, 0x000000, 0.6).setOrigin(0).setInteractive();
    dim.on('pointerup', () => this.closeDetail());
    const W = 1100;
    const H = 700;
    const sheet = this.add.rectangle(960, 540, W, H, COLORS.paper).setStrokeStyle(5, COLORS.ink).setInteractive();
    layer.add([dim, sheet]);

    const left = 960 - W / 2 + 50;
    let y = 540 - H / 2 + 40;
    const add = (o: Phaser.GameObjects.Text) => {
      layer.add(o);
      y += o.height + 18;
      return o;
    };
    add(this.add.text(left, y, `${NAMES[c.witness]} · ${c.id.toUpperCase()}`, this.sfxStyle(30, '#7a2f2f')));
    add(this.add.text(left, y, c.question, { ...this.noteStyle(34), wordWrap: { width: W - 100 } }));
    add(this.add.text(left, y, 'EVIDENCE', this.sfxStyle(26, COLORS.inkCss)));
    for (const e of c.requiredEvidence) {
      const has = deps.hasEvidence(e);
      add(
        this.add.text(left + 20, y, `${has ? '●' : '○'}  ${has ? deps.evidenceText(e) : 'Missing evidence'}`, {
          ...this.noteStyle(24),
          color: has ? COLORS.inkCss : '#8a7a62',
          wordWrap: { width: W - 140 },
        }),
      );
    }
    if (c.confirmed) {
      add(this.add.text(left, y + 6, 'CONCLUSION', this.sfxStyle(26, COLORS.inkCss)));
      add(this.add.text(left + 20, y, c.conclusion, { ...this.noteStyle(26), wordWrap: { width: W - 140 } }));
    }
    const links = deps.threads().filter((t) => t.from === c.id || t.to === c.id);
    if (links.length) {
      add(this.add.text(left, y + 6, 'LINKS', this.sfxStyle(26, COLORS.inkCss)));
      for (const t of links) {
        const other = t.from === c.id ? t.to : t.from;
        add(this.add.text(left + 20, y, `${THREAD_STYLE[t.type].label} → ${other.toUpperCase()}`, this.noteStyle(24)));
      }
    }
    const note = new Bubble(this, 960 + W / 2 - 230, 540 + H / 2 - 90, {
      kind: 'narration',
      text: c.confirmed ? c.notes.final : c.notes.pinned,
      maxWidth: 360,
    });
    layer.add(note);
    const close = new ComicButton(this, 960 + W / 2 - 90, 540 - H / 2 + 50, { label: 'CLOSE', fontSize: 24 });
    close.on('click', () => this.closeDetail());
    layer.add(close);

    this.detail = layer;
  }

  private closeDetail() {
    this.detail?.destroy();
    this.detail = undefined;
  }

  private close() {
    if (this.returnTo && this.scene.manager.keys[this.returnTo]) {
      const back = this.returnTo;
      this.scene.stop();
      if (this.scene.isSleeping(back)) this.scene.wake(back);
      else this.scene.resume(back);
    } else this.scene.stop();
  }

  // ------------------------------------------------------------------ helpers

  private sfxStyle(size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: `"${FONTS.sfx}"`, fontSize: `${size}px`, color, resolution: TEXT_RESOLUTION };
  }
  private noteStyle(size: number): Phaser.Types.GameObjects.Text.TextStyle {
    // Board notes sit on fixed cards: text size capped at 120 %.
    return { fontFamily: `"${FONTS.narration}"`, fontSize: `${ts(size, 1.2)}px`, color: COLORS.inkCss, resolution: TEXT_RESOLUTION };
  }
  private handStyle(size: number, color: string = '#1d3557'): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: `"${FONTS.hand}"`, fontSize: `${ts(size, 1.2)}px`, color, resolution: TEXT_RESOLUTION };
  }
  private hash(s: string) {
    let h = 0;
    for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 997;
    return h / 997;
  }
}
