// Quick-time events. Three kinds, all of which also accept a mouse click, and none of which can
// end the game: a miss just changes what happens next.
//   press  — hit the key before the ring closes
//   mash   — fill the bar by hammering the key before time runs out
//   timing — press as the shrinking ring crosses the target circle (best of 3)
import Phaser from 'phaser';
import { COLORS, FONTS, TEXT_RESOLUTION, comicSettings } from '../comic';
import { H, W, label } from '../scenes/coreUi';
import type { Director } from '../world/Director';

type KeyName = 'SPACE' | 'E' | 'F';
const DEPTH = 70;

export class Qte {
  private d: Director;
  constructor(d: Director) {
    this.d = d;
  }

  private get slow() {
    return comicSettings.reduceMotion ? 1.6 : 1;
  }

  private frame(prompt: string, key: KeyName, how: string) {
    const s = this.d.scene;
    const layer = s.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH);
    layer.add(s.add.rectangle(0, 0, W, H, 0x000000, 0.35).setOrigin(0).setInteractive());
    layer.add(label(s, W / 2, H * 0.24, prompt, 72, { color: '#e8fbff', strokeThickness: 12 }).setOrigin(0.5));
    layer.add(s.add.text(W / 2, H * 0.24 + 70, how, { fontFamily: `"${FONTS.narration}"`, fontSize: '30px', color: '#cfe6ee', resolution: TEXT_RESOLUTION }).setOrigin(0.5));
    const capW = key === 'SPACE' ? 260 : 120;
    layer.add(s.add.rectangle(W / 2 + 6, H * 0.62 + 6, capW, 100, COLORS.ink));
    const cap = s.add.rectangle(W / 2, H * 0.62, capW, 100, COLORS.paper).setStrokeStyle(6, COLORS.ink);
    const capText = s.add.text(W / 2, H * 0.62, key, { fontFamily: `"${FONTS.sfx}"`, fontSize: '54px', color: COLORS.inkCss, resolution: TEXT_RESOLUTION }).setOrigin(0.5);
    layer.add([cap, capText]);
    layer.add(s.add.text(W / 2, H * 0.62 + 80, 'or click', { fontFamily: `"${FONTS.hand}"`, fontSize: '30px', color: '#cfe6ee', resolution: TEXT_RESOLUTION }).setOrigin(0.5));
    const g = s.add.graphics();
    layer.add(g);
    const pulse = () => {
      cap.setScale(0.92);
      capText.setScale(0.92);
      s.time.delayedCall(70, () => (cap.setScale(1), capText.setScale(1)));
    };
    return { layer, g, pulse };
  }

  /** Listen for the key or a click; returns an unsubscribe. */
  private listen(key: KeyName, onPress: () => void) {
    const s = this.d.scene;
    const code = key === 'SPACE' ? ' ' : key;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toUpperCase() === code.toUpperCase() && !e.repeat) onPress();
    };
    const onPtr = () => onPress();
    s.input.keyboard?.on('keydown', onKey);
    s.input.on('pointerdown', onPtr);
    return () => {
      s.input.keyboard?.off('keydown', onKey);
      s.input.off('pointerdown', onPtr);
    };
  }

  private async result(layer: Phaser.GameObjects.Container, ok: boolean) {
    const s = this.d.scene;
    const t = label(s, W / 2, H * 0.44, ok ? 'GOT IT' : 'TOO SLOW', 90, { color: ok ? '#7fe0d4' : '#e07070', strokeThickness: 14 }).setOrigin(0.5);
    layer.add(t);
    this.d.audio.tone(ok ? 'chime' : 'glitch');
    await this.d.wait(650);
    layer.destroy();
    return ok;
  }

  async press(prompt: string, key: KeyName = 'SPACE', ms = 1800): Promise<boolean> {
    const { layer, g, pulse } = this.frame(prompt, key, 'Press before the ring closes');
    const total = ms * this.slow;
    let hit = false;
    const off = this.listen(key, () => ((hit = true), pulse()));
    let t = 0;
    try {
      await this.d.until(() => {
        t += this.d.lastDt;
        const k = 1 - t / total;
        g.clear().lineStyle(10, 0x7fe0d4, 0.9).strokeCircle(W / 2, H * 0.62, 90 + 260 * Math.max(0, k));
        return hit || t >= total;
      });
    } finally {
      off();
    }
    return this.result(layer, hit);
  }

  async mash(prompt: string, key: KeyName = 'SPACE', ms = 3600, need = 14): Promise<boolean> {
    const { layer, g, pulse } = this.frame(prompt, key, 'Tap fast to fill the bar');
    const total = ms * this.slow;
    let fill = 0;
    const off = this.listen(key, () => {
      fill = Math.min(1, fill + 1 / need);
      pulse();
    });
    let t = 0;
    try {
      await this.d.until(() => {
        t += this.d.lastDt;
        fill = Math.max(0, fill - (this.d.lastDt / 1000) * 0.18);
        const bx = W / 2 - 400, by = H * 0.42;
        g.clear().fillStyle(0x0b1a1f, 0.9).fillRect(bx, by, 800, 44).fillStyle(0x7fe0d4, 1).fillRect(bx, by, 800 * fill, 44);
        g.lineStyle(6, COLORS.ink).strokeRect(bx, by, 800, 44);
        g.fillStyle(0xe8fbff, 0.9).fillRect(bx, by + 52, 800 * (1 - t / total), 8);
        return fill >= 1 || t >= total;
      });
    } finally {
      off();
    }
    return this.result(layer, fill >= 1);
  }

  async timing(prompt: string, key: KeyName = 'SPACE', rounds = 3, need = 2): Promise<boolean> {
    const { layer, g, pulse } = this.frame(prompt, key, 'Press when the bright ring meets the faint one');
    const period = 1300 * this.slow, target = 110, tol = 34;
    let hits = 0, round = 0, t = 0, pressed = false;
    const marks = this.d.scene.add.text(W / 2, H * 0.62 - 200, '', { fontFamily: `"${FONTS.sfx}"`, fontSize: '48px', color: '#e8fbff', resolution: TEXT_RESOLUTION }).setOrigin(0.5);
    layer.add(marks);
    const radius = () => 420 * (1 - t / period);
    const off = this.listen(key, () => {
      if (pressed) return;
      pressed = true;
      pulse();
      if (Math.abs(radius() - target) <= tol) hits++;
    });
    try {
      await this.d.until(() => {
        t += this.d.lastDt;
        if (t >= period || pressed) {
          round++;
          t = 0;
          pressed = false;
          marks.setText('●'.repeat(hits) + '○'.repeat(round - hits));
        }
        g.clear().lineStyle(8, 0xe8fbff, 0.35).strokeCircle(W / 2, H * 0.62, target);
        g.lineStyle(10, 0x7fe0d4, 0.95).strokeCircle(W / 2, H * 0.62, Math.max(4, radius()));
        return round >= rounds;
      });
    } finally {
      off();
    }
    return this.result(layer, hits >= need);
  }
}
