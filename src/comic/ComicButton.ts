import Phaser from 'phaser';
import { COLORS, FONTS, TEXT_RESOLUTION } from './theme';
import { comicSettings } from './settings';

export interface ComicButtonOptions {
  label: string;
  width?: number;
  fontSize?: number;
  fill?: number; // background colour
  textColor?: string;
}

/** Hand-lettered comic button: paper box, ink outline, offset shadow, lifts on hover. Emits 'click'. */
export class ComicButton extends Phaser.GameObjects.Container {
  private face: Phaser.GameObjects.Container;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ComicButtonOptions) {
    super(scene, x, y);
    const fontSize = opts.fontSize ?? 32;
    this.text = scene.add
      .text(0, 0, opts.label, {
        fontFamily: `"${FONTS.sfx}"`,
        fontSize: `${fontSize}px`,
        color: opts.textColor ?? COLORS.inkCss,
        resolution: TEXT_RESOLUTION,
        padding: { x: 6, y: 2 }, // Bangers leans right: without it the last letter is clipped ("GOT I1")
      })
      .setOrigin(0.5);
    const w = opts.width ?? this.text.width + 48;
    const h = fontSize + 26;

    const shadow = scene.add.rectangle(6, 6, w, h, COLORS.ink);
    const box = scene.add.rectangle(0, 0, w, h, opts.fill ?? COLORS.paper).setStrokeStyle(4, COLORS.ink);
    this.face = scene.add.container(0, 0, [box, this.text]);
    this.add([shadow, this.face]);
    this.setSize(w + 6, h + 6);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerover', () => this.lift(-3));
    this.on('pointerout', () => this.lift(0));
    this.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      this.emit('click');
    });
  }

  setLabel(label: string): this {
    this.text.setText(label);
    return this;
  }

  private lift(offset: number) {
    if (comicSettings.reduceMotion) return;
    this.scene.tweens.add({ targets: this.face, x: offset, y: offset, duration: 90 });
  }
}
