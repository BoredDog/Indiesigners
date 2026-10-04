import Phaser from 'phaser';
import {
  Bubble,
  ComicPage,
  ComicPanel,
  comicSettings,
  FONTS,
  gridFrames,
  pageTurn,
  SfxWord,
  type PageDef,
} from '../comic';
import { makePlaceholders, PH } from './placeholders';

/**
 * Test bench for the comic layer, laid out like Mira's page (Blueprint H2/H3) with placeholder art.
 * Keys: 1–6 zoom panel · Esc back · C colour all · H halftone · I ink · T page turn · R reduce motion.
 */
export class ComicDemoScene extends Phaser.Scene {
  page!: ComicPage;
  evidence = 0;
  private counter!: Phaser.GameObjects.Text;
  private halftoneOn = true;

  constructor() {
    super('ComicDemo');
  }

  preload() {
    this.load.image('paper', 'assets/textures/paper002.jpg');
  }

  create() {
    makePlaceholders(this);

    // Clicking empty space closes a zoomed panel.
    this.add
      .rectangle(0, 0, 1920, 1080, 0x000000, 0)
      .setOrigin(0)
      .setInteractive()
      .on('pointerup', () => this.page.unfocus());

    this.buildPage();

    this.counter = this.add
      .text(1920 - 16, 16, '', {
        fontFamily: `"${FONTS.sfx}"`,
        fontSize: '40px',
        color: '#f3e9d2',
        stroke: '#111114',
        strokeThickness: 8,
      })
      .setOrigin(1, 0)
      .setDepth(100);
    this.updateCounter();

    this.add
      .text(16, 1080 - 12, '1–6 zoom · Esc back · C colour · H halftone · I ink · T page turn · R reduce motion', {
        fontFamily: `"${FONTS.speech}"`,
        fontSize: '20px',
        color: '#bdb6a6',
      })
      .setOrigin(0, 1)
      .setDepth(100);

    const kb = this.input.keyboard!;
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'].forEach((k, i) =>
      kb.on(`keydown-${k}`, () => this.page.focus(`P${i + 1}`)),
    );
    kb.on('keydown-ESC', () => this.page.unfocus());
    kb.on('keydown-C', () => {
      const anyGrey = this.page.panels.some((p) => (p.fx?.colour ?? 1) < 0.5);
      this.page.setAllColour(anyGrey ? 1 : 0);
    });
    kb.on('keydown-H', () => {
      this.halftoneOn = !this.halftoneOn;
      this.page.setAllHalftone(this.halftoneOn ? 0.55 : 0);
    });
    kb.on('keydown-I', () => {
      const targets = this.page.focused ? [this.page.focused] : this.page.panels;
      targets.forEach((p) => p.setInk((p.fx?.ink ?? 0) > 0.5 ? 0 : 1));
    });
    kb.on('keydown-T', () =>
      pageTurn(this, () => {
        this.page.destroy();
        this.evidence = 0;
        this.buildPage();
        this.updateCounter();
      }),
    );
    kb.on('keydown-R', () => {
      comicSettings.reduceMotion = !comicSettings.reduceMotion;
      this.flash(`Reduce Motion ${comicSettings.reduceMotion ? 'ON' : 'OFF'}`);
    });

    (window as unknown as { __comicDemo: ComicDemoScene }).__comicDemo = this;
  }

  private buildPage() {
    const bounds = { x: 100, y: 24, w: 1580, h: 1010 };
    const frames = gridFrames(bounds, [
      { h: 1, cols: [1, 1.25] },
      { h: 1.25, cols: [1, 1] },
      { h: 1, cols: [0.7, 1.3] },
    ]);
    const def: PageDef = {
      id: 'demo_mira',
      background: PH.village,
      bounds,
      panels: [
        { id: 'P1', frame: frames[0], src: { x: 90, y: 400, w: 520, h: 420 } },
        { id: 'P2', frame: frames[1], src: { x: 790, y: 210, w: 240, h: 180 } },
        { id: 'P3', frame: frames[2], src: { x: 780, y: 90, w: 270, h: 340 } },
        {
          id: 'P4',
          frame: frames[3],
          src: { x: 1100, y: 430, w: 500, h: 400 },
          cutouts: [{ key: PH.mira, x: 520, y: 440, scale: 0.72 }],
        },
        {
          id: 'P5',
          frame: frames[4],
          src: { x: 600, y: 480, w: 420, h: 420 },
          cutouts: [{ key: PH.figure, x: 230, y: 330, scale: 0.5 }],
        },
        { id: 'P6', frame: frames[5], src: { x: 0, y: 690, w: 1920, h: 390 } },
      ],
    };

    this.page = new ComicPage(this, def, { paperKey: 'paper', grey: true });
    this.add.existing(this.page);
    this.page.on('panel-click', (panel: ComicPanel) =>
      this.page.focused === panel ? this.page.unfocus() : this.page.focus(panel.def.id),
    );

    const p = (id: string) => this.page.panel(id);

    p('P1').overlay.add(
      new Bubble(this, 230, 70, {
        kind: 'narration',
        text: 'The village still looked ordinary before the minute that broke it.',
        maxWidth: 380,
      }).appear(200),
    );
    p('P4').overlay.add(
      new Bubble(this, 210, 110, { kind: 'speech', text: 'Who rang it?', tail: { x: 120, y: 140 } }).appear(400),
    );
    p('P4').overlay.add(
      new Bubble(this, 230, 300, {
        kind: 'thought',
        text: 'I remember ~two-seventeen~.',
        maxWidth: 240,
        tail: { x: 150, y: 60 },
      }).appear(600),
    );
    p('P6').overlay.add(
      new Bubble(this, 280, 80, { kind: 'narration', text: 'The archive entry named [[Elias]].' }).appear(800),
    );
    p('P6').overlay.add(
      new Bubble(this, 830, 110, { kind: 'shout', text: '*Shut it down!*', tail: { x: -30, y: 110 } }).appear(1000),
    );

    this.addSfx('P3', 160, 150, { text: 'BELL!', evidence: 'The village bell rang at 2:17.' }).pulse();
    this.addSfx('P2', 360, 230, { text: 'TICK!', size: 56, angle: 5, evidence: 'Three clocks stopped at 2:17.' });
    this.addSfx('P5', 150, 110, {
      text: 'GLASS!',
      size: 56,
      color: '#7fe0d4',
      evidence: 'The figure carried the apprentice lantern staff.',
    });
    this.addSfx('P1', 520, 210, { text: 'SCRATCH!', size: 48, angle: 8, evidence: 'A later entry reads 2:31.' });
    this.addSfx('P6', 560, 200, {
      text: 'PAPER!',
      size: 52,
      evidence: 'Elias Vane, apprentice — entry removed.',
    });
  }

  private addSfx(panelId: string, x: number, y: number, opts: ConstructorParameters<typeof SfxWord>[3]) {
    const panel = this.page.panel(panelId);
    const word = new SfxWord(this, x, y, opts);
    panel.overlay.add(word);
    word.on('reveal', () => {
      this.evidence++;
      this.updateCounter();
      panel.setColour(1); // the panel fills with colour once its fragment is recovered
    });
    return word;
  }

  private updateCounter() {
    this.counter.setText(`Evidence ${this.evidence}/5`);
  }

  private flash(msg: string) {
    const t = this.add
      .text(960, 1040, msg, { fontFamily: `"${FONTS.narration}"`, fontSize: '28px', color: '#f3e9d2' })
      .setOrigin(0.5)
      .setDepth(200);
    this.tweens.add({ targets: t, alpha: 0, delay: 900, duration: 400, onComplete: () => t.destroy() });
  }
}
