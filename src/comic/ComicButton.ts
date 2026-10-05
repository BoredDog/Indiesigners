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
  /** Pixel skin (design/pixel scene 12): the 9-slice and its texture prefix, when loaded. */
  private slice?: Phaser.GameObjects.NineSlice;
  private skin = '';

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

    const primary = opts.fill === COLORS.spiritTeal;
    const skin = primary ? 'px_ui_button_primary' : 'px_ui_button';
    const pixel = scene.textures.exists(`${skin}_9s`) && scene.game.renderer.type === Phaser.WEBGL;
    if (pixel) {
      // 24×16 source, slices 5 5 4 4, drawn at ×4; height follows the label so every font fits.
      this.skin = skin;
      const sw = Math.max(12, Math.round(w / 4));
      const sh = Math.max(16, Math.round(h / 4));
      this.slice = scene.add.nineslice(0, 0, `${skin}_9s`, undefined, sw, sh, 5, 5, 4, 4).setScale(4);
      if (!opts.textColor) this.text.setColor(COLORS.paperCss);
      this.face = scene.add.container(0, 0, [this.slice, this.text]);
      this.add(this.face);
    } else {
      const shadow = scene.add.rectangle(6, 6, w, h, COLORS.ink);
      const box = scene.add.rectangle(0, 0, w, h, opts.fill ?? COLORS.paper).setStrokeStyle(4, COLORS.ink);
      this.face = scene.add.container(0, 0, [box, this.text]);
      this.add([shadow, this.face]);
    }
    this.setSize(w + 6, h + 6);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerover', () => (this.slice ? this.skinTo('_hover') : this.lift(-3)));
    this.on('pointerout', () => (this.slice ? this.skinTo('') : this.lift(0)));
    this.on('pointerdown', () => this.slice && this.skinTo('_pressed'));
    this.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      this.emit('click');
    });
  }

  setLabel(label: string): this {
    this.text.setText(label);
    return this;
  }

  /** Pixel skin state: '' | '_hover' | '_pressed' (pressed text sits 1 px lower). */
  private skinTo(state: string) {
    const key = `${this.skin}${state}_9s`;
    if (this.slice && this.scene.textures.exists(key)) this.slice.setTexture(key);
    this.text.setY(state === '_pressed' ? 4 : 0);
  }

  private lift(offset: number) {
    if (comicSettings.reduceMotion) return;
    this.scene.tweens.add({ targets: this.face, x: offset, y: offset, duration: 90 });
  }
}
