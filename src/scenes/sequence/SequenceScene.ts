import Phaser from 'phaser';
import {
  Bubble,
  ComicButton,
  ComicPanel,
  COLORS,
  comicSettings,
  dur,
  FONTS,
  SfxWord,
  TEXT_RESOLUTION,
  type CutoutDef,
  type Rect,
} from '../../comic';
import { makePlaceholders } from '../../dev/placeholders';

/** The big single panel every sequence frame is drawn in (screen px). */
export const FRAME: Rect = { x: 160, y: 60, w: 1600, h: 900 };

/** One frame: builds its content into `layer` (screen coordinates). */
export type FrameBuilder = (layer: Phaser.GameObjects.Container) => void;

/**
 * Base for click-through comic sequences (Opening, Finale, Ending): one frame at a time, a new
 * panel slides in over the old one, click / Space / Enter advances. Subclasses list the frames
 * and say where to go when they run out.
 */
export abstract class SequenceScene extends Phaser.Scene {
  protected step = -1;
  private layer?: Phaser.GameObjects.Container;
  private busy = false;
  private hint!: Phaser.GameObjects.Text;

  protected abstract frames(): FrameBuilder[];
  protected abstract finish(): void;
  /** Background colour behind the frames. */
  protected backdrop = 0x0b0b0e;

  preload() {
    if (!this.textures.exists('paper')) this.load.image('paper', 'assets/textures/paper002.jpg');
  }

  create() {
    makePlaceholders(this);
    this.step = -1;
    this.busy = false;
    this.layer = undefined;
    this.add.rectangle(0, 0, 1920, 1080, this.backdrop).setOrigin(0).setInteractive().on('pointerup', () => this.next());
    const kb = this.input.keyboard;
    kb?.on('keydown-SPACE', () => this.next());
    kb?.on('keydown-ENTER', () => this.next());
    this.hint = this.add
      .text(1900, 1064, 'CLICK TO CONTINUE', this.sfx(26, '#8d8676'))
      .setOrigin(1, 1)
      .setDepth(50);
    this.next();
  }

  /** Advance to the next frame (ignored while a frame is sliding in). */
  next(): void {
    if (this.busy) return;
    const list = this.frames();
    this.step++;
    if (this.step >= list.length) {
      this.finish();
      return;
    }
    this.busy = true;
    const old = this.layer;
    const layer = this.add.container(0, 0).setDepth(10 + this.step);
    list[this.step](layer);
    this.layer = layer;

    const done = () => {
      old?.destroy();
      this.busy = false;
    };
    if (comicSettings.reduceMotion || this.step === 0) {
      layer.setAlpha(0);
      this.tweens.add({ targets: layer, alpha: 1, duration: dur(300), onComplete: done });
    } else {
      // "Comic panel slides in" (Blueprint F2): the new frame slides over the old one.
      layer.x = 1920;
      this.tweens.add({ targets: layer, x: 0, duration: 450, ease: 'Cubic.Out', onComplete: done });
    }
    this.hint.setVisible(this.step < list.length - 1 || !this.hasOwnButton());
  }

  /** Subclasses whose last frame has its own button hide the generic hint there. */
  protected hasOwnButton(): boolean {
    return false;
  }

  // ------------------------------------------------------------------ frame helpers

  /** A comic panel filling FRAME, cut from `bg` (cover-fit). Added to `layer`. */
  protected panel(layer: Phaser.GameObjects.Container, bg: string, src: Rect, cutouts?: CutoutDef[], frame = FRAME) {
    const p = new ComicPanel(this, `seq_${this.scene.key}_${this.step}_${layer.length}`, bg, {
      id: 'F',
      frame,
      src,
      cutouts,
    }, { grey: false });
    layer.add(p);
    return p;
  }

  protected narration(layer: Phaser.GameObjects.Container, text: string, x = FRAME.x + 290, y = FRAME.y + 80, delay = 250) {
    const b = new Bubble(this, x, y, { kind: 'narration', text, maxWidth: 480, fontSize: 30 });
    layer.add(b.appear(delay));
    return b;
  }

  protected speech(layer: Phaser.GameObjects.Container, text: string, x: number, y: number, tail: { x: number; y: number }, delay = 600) {
    const b = new Bubble(this, x, y, { kind: 'speech', text, maxWidth: 360, fontSize: 34, tail });
    layer.add(b.appear(delay));
    return b;
  }

  /** Decorative sound-effect word that bursts in (not a clue, not clickable). */
  protected sfxWord(layer: Phaser.GameObjects.Container, text: string, x: number, y: number, size = 72, delay = 450, color?: string) {
    const w = new SfxWord(this, x, y, { text, size, color, angle: -6 });
    w.disableInteractive();
    w.setScale(0);
    layer.add(w);
    this.tweens.add({ targets: w, scale: 1, duration: dur(320), delay, ease: 'Back.Out' });
    return w;
  }

  /** A paper document (case file, clinic record…) with typed or handwritten lines. */
  protected document(
    layer: Phaser.GameObjects.Container,
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    body: string,
    hand = false,
    angle = 0,
  ) {
    const doc = this.add.container(x, y).setAngle(angle);
    doc.add(this.add.rectangle(8, 10, w, h, 0x000000, 0.4));
    doc.add(this.add.tileSprite(0, 0, w, h, 'paper').setTint(COLORS.paper));
    doc.add(this.add.rectangle(0, 0, w, h).setStrokeStyle(3, COLORS.ink));
    doc.add(
      this.add
        .text(-w / 2 + 30, -h / 2 + 26, title, { ...this.sfx(34, '#7a2f2f') })
        .setOrigin(0, 0),
    );
    const text = this.add
      .text(-w / 2 + 30, -h / 2 + 86, body, {
        fontFamily: `"${hand ? FONTS.hand : FONTS.narration}"`,
        fontSize: hand ? '38px' : '28px',
        color: hand ? '#1d3557' : COLORS.inkCss,
        wordWrap: { width: w - 60 },
        lineSpacing: 8,
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0, 0);
    doc.add(text);
    layer.add(doc);
    return { doc, text };
  }

  protected button(layer: Phaser.GameObjects.Container, label: string, x: number, y: number, onClick: () => void) {
    const b = new ComicButton(this, x, y, { label, fontSize: 34, fill: COLORS.spiritTeal });
    b.on('click', onClick);
    layer.add(b);
    return b;
  }

  protected sfx(size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: `"${FONTS.sfx}"`, fontSize: `${size}px`, color, resolution: TEXT_RESOLUTION };
  }
}
