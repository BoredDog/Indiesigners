import Phaser from 'phaser';
import { parseMarkup, type Token } from './markup';
import { COLORS, TEXT_RESOLUTION } from './theme';
import { comicSettings } from './settings';

export interface RichTextStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  maxWidth: number;
  align?: 'left' | 'center';
  lineSpacing?: number; // extra px between lines
}

/**
 * Word-wrapped text supporting the Blueprint R3 markup ([[redacted]], ~cracked~, *bold*, \n).
 * Phaser's Text can't mix styles, so every word is its own Text object laid out here.
 * The container's origin is its top-left corner; `textWidth`/`textHeight` give the laid-out size.
 */
export class RichText extends Phaser.GameObjects.Container {
  textWidth = 0;
  textHeight = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, markup: string, style: RichTextStyle) {
    super(scene, x, y);
    this.layout(parseMarkup(markup), style);
  }

  private layout(tokens: Token[], style: RichTextStyle) {
    const lineHeight = Math.round(style.fontSize * 1.2) + (style.lineSpacing ?? 0);
    const space = this.measure(' ', style);
    const lines: Phaser.GameObjects.GameObject[][] = [[]];
    const lineWidths = [0];
    let x = 0;
    let y = 0;

    const newLine = () => {
      lineWidths[lineWidths.length - 1] = x;
      lines.push([]);
      lineWidths.push(0);
      x = 0;
      y += lineHeight;
    };

    for (const token of tokens) {
      if (token.type === 'newline') {
        newLine();
        continue;
      }
      const gap = x > 0 && !token.joined ? space : 0;
      const word = this.makeWord(token.text, token.kind, style);
      if (x > 0 && x + gap + word.width > style.maxWidth) newLine();
      else x += gap;
      word.objects.forEach((o) => {
        const t = o as unknown as Phaser.GameObjects.Components.Transform;
        t.x += x;
        t.y += y;
        this.add(o);
        lines[lines.length - 1].push(o);
      });
      x += word.width;
    }
    lineWidths[lineWidths.length - 1] = x;

    this.textWidth = Math.max(...lineWidths);
    this.textHeight = y + lineHeight;

    if (style.align === 'center') {
      lines.forEach((objs, i) => {
        const shift = (this.textWidth - lineWidths[i]) / 2;
        objs.forEach((o) => ((o as unknown as Phaser.GameObjects.Components.Transform).x += shift));
      });
    }
    this.setSize(this.textWidth, this.textHeight);
  }

  private textStyle(style: RichTextStyle, bold: boolean): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: `"${style.fontFamily}"`,
      fontSize: `${style.fontSize}px`,
      color: style.color,
      fontStyle: bold ? 'bold' : 'normal',
      resolution: TEXT_RESOLUTION,
    };
  }

  private measure(text: string, style: RichTextStyle): number {
    const t = this.scene.make.text({ text, style: this.textStyle(style, false) }, false);
    const w = t.width;
    t.destroy();
    return w;
  }

  private makeWord(text: string, kind: string, style: RichTextStyle) {
    const scene = this.scene;
    const objects: Phaser.GameObjects.GameObject[] = [];

    if (kind === 'cracked') {
      // Letters drawn one by one with small offsets; they tremble unless Reduce Motion is on.
      let cx = 0;
      for (const ch of text) {
        const t = scene.add.text(cx, Phaser.Math.Between(-2, 2), ch, this.textStyle(style, false));
        t.setRotation(Phaser.Math.FloatBetween(-0.08, 0.08)).setAlpha(Phaser.Math.FloatBetween(0.75, 1));
        if (!comicSettings.reduceMotion) {
          scene.tweens.add({
            targets: t,
            // Relative so it still works after layout() moves the letter onto its line.
            y: `${Phaser.Math.Between(0, 1) ? '+' : '-'}=${Phaser.Math.Between(1, 3)}`,
            duration: Phaser.Math.Between(90, 160),
            yoyo: true,
            repeat: -1,
            repeatDelay: Phaser.Math.Between(400, 1400),
          });
        }
        cx += t.width;
        objects.push(t);
      }
      return { objects, width: cx };
    }

    const t = scene.add.text(0, 0, text, this.textStyle(style, kind === 'bold'));
    objects.push(t);

    if (kind === 'redacted') {
      // Black bar over the word; the word itself stays hidden so its width sets the bar size.
      t.setVisible(false);
      const bar = scene.add
        .rectangle(t.width / 2, style.fontSize * 0.62, t.width + 6, style.fontSize * 0.95, COLORS.ink)
        .setRotation(Phaser.Math.FloatBetween(-0.03, 0.03));
      objects.push(bar);
    }
    return { objects, width: t.width };
  }
}
