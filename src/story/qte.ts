// Quick-time events. Three kinds, all of which also accept a mouse click, and none of which can
// end the game: a miss just changes what happens next.
//   press  — hit the key before the ring closes
//   mash   — fill the bar by hammering the key before time runs out
//   timing — press as the shrinking ring crosses the target circle (best of 3)
import Phaser from 'phaser';
import { COLORS, FONTS, TEXT_RESOLUTION, comicSettings } from '../comic';
import { H, W, label } from '../scenes/coreUi';
import type { Director } from '../world/Director';
import { PIX } from '../world/ui';

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

  /**
   * Builds the overlay and plays a short lead-in, so a QTE never springs on you mid-dialogue:
   * the prompt slides in and input is ignored until "NOW".
   */
  private async frame(prompt: string, key: KeyName, how: string) {
    const s = this.d.scene;
    const layer = s.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH);
    layer.add(s.add.rectangle(0, 0, W, H, 0x000000, 0.35).setOrigin(0).setInteractive());
    layer.add(label(s, W / 2, H * 0.24, prompt, 72, { color: '#e8fbff', strokeThickness: 12 }).setOrigin(0.5));
    layer.add(s.add.text(W / 2, H * 0.24 + 70, how, { fontFamily: PIX, fontSize: '34px', color: '#cfe6ee', resolution: TEXT_RESOLUTION }).setOrigin(0.5));
    const capW = key === 'SPACE' ? 260 : 120;
    layer.add(s.add.rectangle(W / 2 + 6, H * 0.62 + 6, capW, 100, COLORS.ink));
    const cap = s.add.rectangle(W / 2, H * 0.62, capW, 100, COLORS.paper).setStrokeStyle(6, COLORS.ink);
    const capText = s.add.text(W / 2, H * 0.62, key, { fontFamily: `"${FONTS.sfx}"`, fontSize: '54px', color: COLORS.inkCss, resolution: TEXT_RESOLUTION }).setOrigin(0.5);
    layer.add([cap, capText]);
    layer.add(s.add.text(W / 2, H * 0.62 + 80, 'or click the mouse', { fontFamily: PIX, fontSize: '32px', color: '#cfe6ee', resolution: TEXT_RESOLUTION }).setOrigin(0.5));
    const g = s.add.graphics();
    layer.add(g);
    const pulse = () => {
      cap.setScale(0.92);
      capText.setScale(0.92);
      this.d.audio.play('click', 0.18, -200);
      s.time.delayedCall(70, () => (cap.setScale(1), capText.setScale(1)));
    };
    // Lead-in: fade the overlay up, flash READY, then go.
    layer.setAlpha(0);
    s.tweens.add({ targets: layer, alpha: 1, duration: 180 });
    const ready = label(s, W / 2, H * 0.44, 'READY', 80, { color: '#ffe08a', strokeThickness: 12 }).setOrigin(0.5);
    layer.add(ready);
    this.d.audio.tone('heartbeat');
    await this.d.wait(750 * this.slow);
    ready.setText('NOW!');
    await this.d.wait(220);
    ready.destroy();
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

  private async result(layer: Phaser.GameObjects.Container, ok: boolean, fail = 'TOO SLOW') {
    const s = this.d.scene;
    const t = label(s, W / 2, H * 0.44, ok ? 'GOT IT' : fail, 90, { color: ok ? '#7fe0d4' : '#e07070', strokeThickness: 14 }).setOrigin(0.5);
    layer.add(t);
    this.d.audio.tone(ok ? 'chime' : 'glitch');
    await this.d.wait(650);
    layer.destroy();
    return ok;
  }

  async press(prompt: string, key: KeyName = 'SPACE', ms = 1800): Promise<boolean> {
    const { layer, g, pulse } = await this.frame(prompt, key, 'Press before the ring closes');
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
    const { layer, g, pulse } = await this.frame(prompt, key, 'Tap fast to fill the bar');
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
    return this.result(layer, fill >= 1, 'NOT ENOUGH');
  }

  async timing(prompt: string, key: KeyName = 'SPACE', rounds = 3, need = 2): Promise<boolean> {
    const { layer, g, pulse } = await this.frame(prompt, key, `Press as the bright ring crosses the gold one. ${need} of ${rounds} to pass.`);
    const s = this.d.scene;
    // The gold target sits outside the key cap so the moving ring is never hidden behind it.
    const period = 1500 * this.slow, target = 190, tol = 30, cx = W / 2, cy = H * 0.62;
    let hits = 0, round = 0, t = 0, pressed = false, pause = 0;
    const marks = s.add.text(W / 2, cy - 260, '○'.repeat(rounds), { fontFamily: `"${FONTS.sfx}"`, fontSize: '48px', color: '#e8fbff', resolution: TEXT_RESOLUTION }).setOrigin(0.5);
    layer.add(marks);
    const radius = () => 440 * (1 - t / period);
    /** Each round ends with a word on the ring and a short breath before the next. */
    const endRound = (hit: boolean) => {
      if (hit) hits++;
      round++;
      marks.setText('●'.repeat(hits) + '✕'.repeat(round - hits) + '○'.repeat(rounds - round));
      const w = label(s, cx, cy - target - 40, hit ? 'HIT' : 'MISS', 52, { color: hit ? '#7fe0d4' : '#e07070', strokeThickness: 8 }).setOrigin(0.5);
      layer.add(w);
      s.tweens.add({ targets: w, alpha: 0, y: w.y - 30, duration: 600, onComplete: () => w.destroy() });
      if (!hit) this.d.audio.play('click', 0.25, -1200);
      pause = 420;
    };
    const off = this.listen(key, () => {
      if (pressed || pause > 0) return;
      pressed = true;
      pulse();
      endRound(Math.abs(radius() - target) <= tol);
    });
    try {
      await this.d.until(() => {
        if (pause > 0) {
          pause -= this.d.lastDt;
          if (pause <= 0) (t = 0, (pressed = false));
          g.clear().lineStyle(10, 0xffe08a, 0.8).strokeCircle(cx, cy, target);
          return round >= rounds && pause <= 0;
        }
        t += this.d.lastDt;
        if (t >= period) endRound(false);
        const inside = Math.abs(radius() - target) <= tol;
        // The gold ring brightens while a press would count, which teaches the timing.
        g.clear().lineStyle(inside ? 14 : 10, 0xffe08a, inside ? 1 : 0.6).strokeCircle(cx, cy, target);
        g.lineStyle(10, 0x7fe0d4, 0.95).strokeCircle(cx, cy, Math.max(4, radius()));
        return false;
      });
    } finally {
      off();
    }
    return this.result(layer, hits >= need, 'MISSED');
  }
}
