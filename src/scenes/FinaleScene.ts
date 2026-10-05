import Phaser from 'phaser';
import { attachComicFx, COLORS, comicSettings, dur, impact, RichText, FONTS, TEXT_RESOLUTION } from '../comic';
import { gameState } from '../core/GameState';
import { story } from '../core/StoryData';
import { PH } from '../dev/placeholders';
import { BEAT, makeBeatArt } from '../dev/beatArt';
import { FRAME, SequenceScene, type FrameBuilder } from './sequence/SequenceScene';

/**
 * Finale (Blueprint L): the fourth mindspace. Eight frames that converge every witness's
 * decisive clue on THE FIGURE, then dissolve the silhouette into young Elias. Text from
 * content/finale.json. No choice: a fixed reconstruction, then the truth ending.
 */
export class FinaleScene extends SequenceScene {
  protected backdrop = 0x06070a;

  constructor() {
    super('Finale');
  }

  create() {
    if (gameState.finale !== 'complete') gameState.setFinale('revealed');
    super.create();
    // Archive frame: a teal-edged dark border around the deepest memory layer.
    this.add.rectangle(960, 540, 1880, 1040).setStrokeStyle(10, COLORS.spiritTeal, 0.35).setDepth(55);
  }

  protected hasOwnButton() {
    return true;
  }

  protected frames(): FrameBuilder[] {
    const f = story.finale.frames;
    const n = (i: number) => f[i].narration;
    return [
      // 1 — Three witness panels slide into one investigation board.
      (layer) => {
        const crops = [
          { x: 780, y: 90, w: 470, h: 340, who: 'MIRA', clue: 'The bell rang with no hand on the rope.' },
          { x: 0, y: 760, w: 600, h: 320, who: 'ARUN', clue: 'The watch kept going: 2:31.' },
          { x: 1100, y: 430, w: 520, h: 400, who: 'LEELA', clue: 'The lantern binds minds as anchors.' },
        ];
        crops.forEach((c, i) => {
          const frame = { x: 0, y: FRAME.y + 220, w: 480, h: 360 };
          const p = this.panel(layer, PH.village, c, undefined, frame);
          const targetX = FRAME.x + 60 + i * 510 + 240;
          p.x = targetX + (i - 1) * 260;
          p.y += (i - 1) * 40;
          p.setAngle((i - 1) * 6);
          this.tweens.add({ targets: p, x: targetX, y: FRAME.y + 220 + 180, angle: 0, duration: dur(900), delay: 300, ease: 'Cubic.Out' });
          const label = this.add.text(targetX, FRAME.y + 640, `${c.who}\n${c.clue}`, {
            fontFamily: `"${FONTS.narration}"`,
            fontSize: '24px',
            color: COLORS.paperCss,
            align: 'center',
            wordWrap: { width: 440 },
            resolution: TEXT_RESOLUTION,
          }).setOrigin(0.5, 0);
          layer.add(label);
        });
        this.narration(layer, n(0), FRAME.x + 300, FRAME.y + 80);
        this.sfxWord(layer, f[0].sfx, FRAME.x + 1300, FRAME.y + 820, 46, 600, '#b3261e');
      },
      // 2 — 2:17 clocks overlaid with Arun's 2:31 watch; the 2:31 hand keeps moving.
      (layer) => {
        this.panel(layer, PH.village, { x: 643, y: 150, w: 534, h: 300 });
        const wx = FRAME.x + 1250;
        const wy = FRAME.y + 560;
        const face = this.add.circle(wx, wy, 170, 0xf3e9d2).setStrokeStyle(10, COLORS.amber);
        const label = this.add.text(wx, wy + 70, '2:31', this.sfx(54, COLORS.inkCss)).setOrigin(0.5);
        const hour = this.add.rectangle(wx, wy, 14, 80, COLORS.ink).setOrigin(0.5, 1).setAngle(((2 + 31 / 60) / 12) * 360);
        const minute = this.add.rectangle(wx, wy, 9, 130, 0xb3261e).setOrigin(0.5, 1).setAngle((31 / 60) * 360);
        layer.add([face, label, hour, minute]);
        if (!comicSettings.reduceMotion) this.tweens.add({ targets: minute, angle: '+=360', duration: 9000, repeat: -1 });
        this.narration(layer, n(1));
        this.sfxWord(layer, f[1].sfx, FRAME.x + 260, FRAME.y + 760, 60);
      },
      // 3 — Nia's clinic record beside the child from the memory echo; the redacted name resolves.
      (layer) => {
        const bgPanel = this.panel(layer, PH.village, { x: 0, y: 690, w: 1920, h: 390 });
        bgPanel.setColour(0.25, 0);
        const nia = this.add.image(FRAME.x + 1260, FRAME.y + FRAME.h - 40, PH.nia).setOrigin(0.5, 1).setScale(1.7).setAlpha(0.85);
        layer.add(nia);
        const { doc, text } = this.document(layer, FRAME.x + 560, FRAME.y + 520, 680, 420, 'VEYRA CLINIC · RECORD', '', false, -3);
        text.setVisible(false);
        const body = (redacted: boolean) =>
          new RichText(this, -310, -124, `Patient: ${redacted ? '[[Nia Vane]]' : '*Nia Vane*'}\\nSister of the lantern apprentice.\\nMemory preservation trial: requested.`, {
            fontFamily: FONTS.narration,
            fontSize: 30,
            color: COLORS.inkCss,
            maxWidth: 620,
            lineSpacing: 10,
          });
        const before = body(true);
        doc.add(before);
        this.time.delayedCall(dur(1300), () => {
          before.destroy();
          doc.add(body(false));
        });
        this.narration(layer, n(2), FRAME.x + 300, FRAME.y + 70);
        this.sfxWord(layer, f[2].sfx, FRAME.x + 1450, FRAME.y + 220, 64, 1300);
      },
      // 4 — Master console and village network lit simultaneously; lines spread across the map.
      (layer) => {
        layer.add(this.add.rectangle(FRAME.x + FRAME.w / 2, FRAME.y + FRAME.h / 2, FRAME.w, FRAME.h, 0x10131a).setStrokeStyle(6, COLORS.ink));
        const cx = FRAME.x + FRAME.w / 2;
        const cy = FRAME.y + FRAME.h / 2 + 60;
        const g = this.add.graphics();
        layer.add(g);
        const nodes: { x: number; y: number }[] = [];
        for (let i = 0; i < 32; i++) {
          // 32 village anchor points (Leela's HUM! clue), scattered deterministically.
          const a = i * 2.39996;
          const r = 140 + ((i * 97) % 300);
          nodes.push({ x: cx + Math.cos(a) * r * 1.9, y: cy + Math.sin(a) * r * 0.85 });
        }
        const dots = nodes.map((p) => {
          const d = this.add.circle(p.x, p.y, 9, 0x3a4150).setStrokeStyle(2, COLORS.ink);
          layer.add(d);
          return d;
        });
        layer.add(this.add.rectangle(cx, cy, 120, 80, 0x2a2a30).setStrokeStyle(4, COLORS.spiritTeal));
        const prog = { k: 0 };
        this.tweens.add({
          targets: prog,
          k: nodes.length,
          duration: dur(2200),
          delay: 300,
          onUpdate: () => {
            g.clear();
            g.lineStyle(3, COLORS.spiritTeal, 0.7);
            for (let i = 0; i < Math.floor(prog.k); i++) {
              g.lineBetween(cx, cy, nodes[i].x, nodes[i].y);
              dots[i].setFillStyle(COLORS.spiritTeal);
            }
          },
        });
        this.narration(layer, n(3));
        this.sfxWord(layer, f[3].sfx, FRAME.x + 1360, FRAME.y + 150, 80, 1800);
        this.time.delayedCall(dur(1800), () => impact(this));
      },
      // 5 — Casebook threads converge on THE FIGURE.
      (layer) => {
        const cx = FRAME.x + FRAME.w / 2;
        const cy = FRAME.y + FRAME.h / 2 + 40;
        layer.add(this.add.tileSprite(FRAME.x, FRAME.y, FRAME.w, FRAME.h, 'paper').setOrigin(0).setTint(0x8a6a48));
        const fig = this.add.image(cx, cy + 150, PH.figure).setOrigin(0.5, 1).setScale(0.62).setTintFill(0x000000);
        const g = this.add.graphics();
        layer.add([g, fig]);
        const cards = story.casebook.filter((c) => /^(sis|bro|mom)_/.test(c.id)).slice(0, 9);
        const pins = cards.map((c, i) => {
          const a = -Math.PI / 2 + (i / cards.length) * Math.PI * 2;
          const x = cx + Math.cos(a) * 620;
          const y = cy + Math.sin(a) * 300;
          const card = this.add.container(x, y).setAngle(((i % 3) - 1) * 4);
          card.add(this.add.rectangle(0, 0, 230, 80, COLORS.paper).setStrokeStyle(3, COLORS.ink));
          card.add(this.add.text(0, 0, c.title, { fontFamily: `"${FONTS.narration}"`, fontSize: '19px', color: COLORS.inkCss, align: 'center', wordWrap: { width: 210 }, resolution: TEXT_RESOLUTION }).setOrigin(0.5));
          layer.add(card);
          return { x, y };
        });
        const prog = { p: 0 };
        this.tweens.add({
          targets: prog,
          p: 1,
          duration: dur(900),
          delay: 400,
          ease: 'Cubic.In',
          onUpdate: () => {
            g.clear();
            g.lineStyle(4, 0xb3261e);
            for (const pin of pins) g.lineBetween(pin.x, pin.y, pin.x + (cx - pin.x) * prog.p, pin.y + (cy - 120 - pin.y) * prog.p);
          },
          onComplete: () => impact(this),
        });
        this.narration(layer, n(4), FRAME.x + 260, FRAME.y + FRAME.h - 70);
        this.sfxWord(layer, f[4].sfx, cx + 260, cy - 200, 72, 1300);
      },
      // 6 — Anonymous case request beside old Elias handwriting; the ink duplicates and aligns.
      (layer) => {
        layer.add(this.add.rectangle(FRAME.x + FRAME.w / 2, FRAME.y + FRAME.h / 2, FRAME.w, FRAME.h, 0x16181f));
        const line = '“Someone has to finish the record of Veyra.”';
        const left = this.document(layer, FRAME.x + 430, FRAME.y + 500, 600, 460, 'CASE REQUEST', `${line}

— unsigned`, true, -4);
        const right = this.document(layer, FRAME.x + 1170, FRAME.y + 500, 600, 460, 'APPRENTICE LOG · E. VANE', `${line}

— E.V.`, true, 3);
        // Same hand, same words: the matching lines light up and get stamped.
        for (const d of [left, right]) {
          const hl = this.add.rectangle(d.text.x - 8, d.text.y - 4, d.text.width + 16, d.text.height * 0.62, COLORS.spiritTeal, 0.35).setOrigin(0);
          d.doc.addAt(hl, 3);
          hl.setScale(0, 1);
          this.tweens.add({ targets: hl, scaleX: 1, duration: dur(700), delay: 1100, ease: 'Cubic.Out' });
        }
        const stamp = this.add
          .text(FRAME.x + 800, FRAME.y + 520, 'SAME HAND', { ...this.sfx(64, '#b3261e'), stroke: '#b3261e', strokeThickness: 2 })
          .setOrigin(0.5)
          .setAngle(-12)
          .setScale(2.2)
          .setAlpha(0);
        layer.add(stamp);
        this.tweens.add({ targets: stamp, scale: 1, alpha: 0.9, duration: dur(260), delay: 2000, ease: 'Back.Out', onComplete: () => impact(this) });
        this.narration(layer, n(5), FRAME.x + 330, FRAME.y + 70);
        this.sfxWord(layer, f[5].sfx, FRAME.x + 1350, FRAME.y + 820, 64, 2300);
      },
      // 7 — The black silhouette dissolves from the edges inward into the younger Elias.
      (layer) => {
        layer.add(this.add.rectangle(FRAME.x + FRAME.w / 2, FRAME.y + FRAME.h / 2, FRAME.w, FRAME.h, 0x0d0e12).setStrokeStyle(6, COLORS.ink));
        const x = FRAME.x + FRAME.w / 2 + 250;
        const y = FRAME.y + FRAME.h - 30;
        const young = this.add.image(x, y, PH.elias).setOrigin(0.5, 1).setScale(1.3);
        const shadow = this.add.image(x, y, PH.figure).setOrigin(0.5, 1).setScale(1.3).setTintFill(0x000000);
        layer.add([young, shadow]);
        // Script §11: the scratched-out face in the burned photograph becomes his own.
        makeBeatArt(this);
        const px = FRAME.x + 380;
        const py = FRAME.y + 430;
        const scratched = this.add.image(px, py, BEAT.photo).setScale(0.42).setAngle(-4).setName('finale:photo');
        const revealed = this.add.image(px, py, BEAT.photoRevealed).setScale(0.42).setAngle(-4).setAlpha(0).setName('finale:photo-revealed');
        layer.add([scratched, revealed]);
        this.tweens.add({ targets: revealed, alpha: 1, duration: dur(2600), delay: 900, ease: 'Sine.InOut' });
        const fx = attachComicFx(young);
        if (fx) fx.ink = 1;
        // Edges first, face last: the ink recedes from the highlights while the black mask fades.
        this.tweens.add({ targets: shadow, alpha: 0, duration: dur(2600), delay: 500, ease: 'Sine.In' });
        if (fx) this.tweens.add({ targets: fx, ink: 0, duration: dur(3200), delay: 900, ease: 'Sine.InOut' });
        this.narration(layer, n(6), FRAME.x + 380, FRAME.y + 120);
        this.sfxWord(layer, f[6].sfx, FRAME.x + 380, FRAME.y + 700, 90, 3000);
      },
      // 8 — Young Elias activates the machine, then reaches for the self-purge control.
      (layer) => {
        layer.add(this.add.rectangle(FRAME.x + FRAME.w / 2, FRAME.y + FRAME.h / 2, FRAME.w, FRAME.h, 0x12141b).setStrokeStyle(6, COLORS.ink));
        const console_ = this.add.rectangle(FRAME.x + 1160, FRAME.y + 600, 520, 300, 0x2a2a30).setStrokeStyle(6, COLORS.spiritTeal);
        const purge = this.add.circle(FRAME.x + 1300, FRAME.y + 560, 40, 0xb3261e).setStrokeStyle(4, COLORS.ink);
        const purgeLabel = this.add.text(FRAME.x + 1300, FRAME.y + 630, 'PURGE', this.sfx(30, COLORS.paperCss)).setOrigin(0.5);
        const elias = this.add.image(FRAME.x + 720, FRAME.y + FRAME.h - 20, PH.elias).setOrigin(0.5, 1).setScale(1.15);
        layer.add([console_, purge, purgeLabel, elias]);
        if (!comicSettings.reduceFlashing) this.tweens.add({ targets: purge, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
        this.narration(layer, n(7), FRAME.x + 330, FRAME.y + 90);
        this.sfxWord(layer, f[7].sfx, FRAME.x + 1150, FRAME.y + 330, 54, 1200, COLORS.paperCss);
        this.button(layer, f[7].button ?? 'CONTINUE', FRAME.x + FRAME.w - 200, FRAME.y + FRAME.h - 70, () => this.next());
      },
    ];
  }

  protected finish(): void {
    this.cameras.main.fadeOut(dur(700), 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Ending'));
  }
}
