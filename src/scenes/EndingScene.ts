import Phaser from 'phaser';
import { ComicButton, ComicPanel, COLORS, comicSettings, dur, FONTS, gridFrames, TEXT_RESOLUTION } from '../comic';
import { gameState } from '../core/GameState';
import { DEDUCTION_IDS, deduction, story } from '../core/StoryData';
import { PH } from '../dev/placeholders';
import { FRAME, SequenceScene, type FrameBuilder } from './sequence/SequenceScene';

const TEAM = [
  ['Garv Singh', 'Lead, comic UI, build'],
  ['Nav Singhal', 'Gameplay systems'],
  ['Vansh Jaiswal', 'Echo Paths puzzles'],
  ['Bhumi Chaudhari', 'Character art'],
  ['Arya Pandey', 'Environment art, QA'],
];

const ASSETS = [
  'Fonts: Bangers, Comic Neue, Caveat (SIL OFL 1.1), Special Elite (Apache 2.0) via Google Fonts',
  'Textures: ambientCG (CC0)',
  'Engine: Phaser 3 (MIT)',
  'Code written with help from Claude Code (AI). Full list in CREDITS.md.',
];

/**
 * Truth ending (Blueprint L3): 4 panels + final narration, the optional 100%-evidence epilogue
 * (the clock finally moves to 2:18), then the investigation summary and credits.
 */
export class EndingScene extends SequenceScene {
  protected backdrop = 0x0b0b0e;

  constructor() {
    super('Ending');
  }

  create() {
    gameState.setFinale('complete');
    super.create();
    this.cameras.main.fadeIn(dur(600), 0, 0, 0);
  }

  protected hasOwnButton() {
    return true;
  }

  private fullEvidence() {
    const o = gameState.optionalProgress();
    return o.total > 0 && o.found === o.total;
  }

  protected frames(): FrameBuilder[] {
    const t = story.finale.truthEnding;
    const list: FrameBuilder[] = [
      // Truth: Nia, the overloaded lantern, the vanished village, Elias facing the archive.
      (layer) => {
        const frames = gridFrames(FRAME, [{ h: 1, cols: [1, 1] }, { h: 1, cols: [1, 1] }], 22, 0);
        const defs = [
          { src: { x: 0, y: 690, w: 900, h: 390 }, cut: { key: PH.nia, x: 560, y: 410, scale: 1.0 } },
          { src: { x: 780, y: 90, w: 470, h: 340 }, cut: undefined },
          { src: { x: 0, y: 380, w: 1920, h: 700 }, cut: undefined },
          { src: { x: 600, y: 480, w: 700, h: 420 }, cut: { key: PH.elias, x: 560, y: 420, scale: 0.6 } },
        ];
        defs.forEach((d, i) => {
          const p = new ComicPanel(this, `ending_${i}`, PH.village, { id: `T${i}`, frame: frames[i], src: d.src, cutouts: d.cut ? [d.cut] : undefined }, { grey: false });
          layer.add(p);
          if (i === 1) {
            // The overloaded lantern: teal flare over the tower.
            const glow = this.add.circle(frames[i].x + frames[i].w / 2, frames[i].y + frames[i].h * 0.35, 120, COLORS.spiritTeal, 0.35);
            layer.add(glow);
            if (!comicSettings.reduceFlashing) this.tweens.add({ targets: glow, scale: 1.3, alpha: 0.15, duration: 900, yoyo: true, repeat: -1 });
          }
          if (i === 2) p.setColour(0.15, 0); // the vanished village stays grey
          p.setAlpha(0);
          this.tweens.add({ targets: p, alpha: 1, duration: dur(500), delay: 200 + i * 350 });
        });
        this.narration(layer, t.narration, 960, 540, 1700).setDepth(5);
        // Nia's echo, on her panel.
        if (t.niaEcho) this.speech(layer, t.niaEcho, frames[0].x + frames[0].w - 190, frames[0].y + 80, { x: -110, y: 70 }, 1400);
      },
    ];
    // Every player: the clock finally moves, 2:17 → 2:18 (from Vansh's final script).
    list.push((layer) => {
      this.panel(layer, PH.village, { x: 643, y: 150, w: 534, h: 300 });
      const cx = FRAME.x + (910 - 643) * 3;
      const cy = FRAME.y + (300 - 150) * 3;
      const hand = this.add.rectangle(cx, cy, 15, 150, COLORS.ink).setOrigin(0.5, 1).setAngle((17 / 60) * 360).setName('clock:minute');
      layer.add(hand);
      this.tweens.add({ targets: hand, angle: (18 / 60) * 360, duration: dur(400) || 1, delay: dur(1400), ease: 'Back.Out' });
      this.sfxWord(layer, 'TICK.', cx + 320, cy + 200, 70, 1500);
      if (t.clockLine) this.narration(layer, t.clockLine, FRAME.x + 330, FRAME.y + 90);
    });

    if (t.closing) {
      // Closing desk panel (art B6): the case file, the cracked lantern and Nia's hairclip.
      list.push((layer) => {
        this.panel(layer, PH.village, { x: 560, y: 600, w: 760, h: 428 }).setColour(0.4, 0);
        this.document(layer, FRAME.x + 520, FRAME.y + 560, 560, 330, 'CASE FILE · VEYRA', 'Mass disappearance.\nStatus: closed.', false, -5);
        const lx = FRAME.x + 1150;
        const ly = FRAME.y + 560;
        const lantern = this.add.circle(lx, ly, 70, COLORS.spiritTeal, 0.55).setStrokeStyle(8, COLORS.ink);
        const crack = this.add.graphics().lineStyle(4, COLORS.ink).lineBetween(lx - 30, ly - 50, lx + 5, ly - 5).lineBetween(lx + 5, ly - 5, lx - 10, ly + 40);
        const clip = this.add.rectangle(FRAME.x + 1340, FRAME.y + 720, 110, 22, 0xd9dde3).setStrokeStyle(3, COLORS.ink).setAngle(-20);
        layer.add([lantern, crack, clip]);
        this.narration(layer, t.closing ?? '', FRAME.x + 330, FRAME.y + 90);
      });
    }

    if (this.fullEvidence()) {
      const e = story.finale.epilogue;
      // 100% evidence: the archived master log, finally signed (the unsigned request, closed).
      list.push((layer) => {
        this.panel(layer, PH.village, { x: 0, y: 380, w: 1920, h: 700 }).setColour(0.3, 0);
        if (e.stamp) {
          const { doc } = this.document(layer, FRAME.x + 800, FRAME.y + 520, 620, 360, 'MASTER LOG', 'Veyra, incident night.\nArchived.', false, -4);
          const stamp = this.add
            .text(0, 40, e.stamp, { ...this.sfx(40, '#b3261e'), align: 'center', wordWrap: { width: 460 } })
            .setOrigin(0.5)
            .setAngle(-10)
            .setAlpha(0);
          doc.add(stamp);
          this.tweens.add({ targets: stamp, alpha: 0.9, duration: dur(260), delay: 1900 });
        }
        this.narration(layer, e.narration);
      });
    }

    list.push((layer) => this.summary(layer));
    return list;
  }

  private summary(layer: Phaser.GameObjects.Container) {
    const s = story.finale.summary;
    layer.add(this.add.tileSprite(0, 0, 1920, 1080, 'paper').setOrigin(0).setTint(0xd8cba8));
    layer.add(this.add.text(120, 70, s.title.toUpperCase(), this.sfx(72, COLORS.inkCss)));

    const body = (x: number, y: number, text: string, size = 24, color: string = COLORS.inkCss, width = 820) => {
      const o = this.add.text(x, y, text, {
        fontFamily: `"${FONTS.narration}"`,
        fontSize: `${size}px`,
        color,
        wordWrap: { width },
        lineSpacing: 6,
        resolution: TEXT_RESOLUTION,
      });
      layer.add(o);
      return o;
    };

    let y = 190;
    layer.add(this.add.text(120, y, 'DEDUCTIONS', this.sfx(34, '#7a2f2f')));
    y += 52;
    for (const id of DEDUCTION_IDS) {
      const ok = gameState.deductionState(id) === 'confirmed';
      const o = body(130, y, `${ok ? '✓' : '○'}  ${deduction(id).question}`, 22, ok ? COLORS.inkCss : '#5f5446');
      y += o.height + 8;
    }
    y += 18;
    const resolved = (['mira', 'arun', 'leela'] as const).filter((w) => gameState.witnessStatus(w) === 'resolved').length;
    body(130, y, `Witnesses at rest: ${resolved}/3`, 24);
    y += 40;
    const opt = gameState.optionalProgress();
    body(130, y, `Optional evidence: ${opt.found}/${opt.total}`, 24);
    y += 40;
    if (!this.fullEvidence()) body(130, y, s.replayHint, 24, '#1d3557');

    layer.add(this.add.text(1080, 190, 'CREDITS', this.sfx(34, '#7a2f2f')));
    let cy = 248;
    layer.add(this.add.text(1080, cy, 'TEAM INDIESIGNERS', this.sfx(28, COLORS.inkCss)));
    cy += 44;
    for (const [name, role] of TEAM) {
      body(1090, cy, `${name} — ${role}`, 22, COLORS.inkCss, 720);
      cy += 34;
    }
    cy += 24;
    for (const line of ASSETS) {
      const o = body(1090, cy, line, 19, '#3b3b44', 720);
      cy += o.height + 10;
    }
    body(1090, cy + 10, 'TGC GameJam 2026 · Comic · Twist · Light', 19, '#3b3b44', 720);

    const [backLabel, againLabel] = s.buttons;
    const back = new ComicButton(this, 1480, 980, { label: backLabel ?? 'BACK TO TITLE', fontSize: 30 });
    const again = new ComicButton(this, 1790, 980, { label: againLabel ?? 'PLAY AGAIN', fontSize: 30, fill: COLORS.spiritTeal });
    back.on('click', () => this.scene.start('Title'));
    again.on('click', () => {
      gameState.newGame();
      this.scene.start(this.scene.manager.keys['Opening'] ? 'Opening' : 'Village');
    });
    layer.add([back, again]);
  }

  protected finish(): void {
    // The summary has its own buttons; nothing after it.
    this.step = this.frames().length - 1;
  }
}
