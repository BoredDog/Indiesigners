// The tuning puzzle: match the lantern's light to an echo. Two knobs, FREQUENCY (how many peaks)
// and AMPLITUDE (how tall they are), move the lantern's wave until it lies on the echo's dotted
// one; hold it there and the signal locks. Drawn like a QTE overlay with the story-mode kit (blue
// panels, VT323, gold for what you control, teal for the lantern), and it can't be failed: after a
// while a hint appears, then markers show which knob is already right.
//
//   await d.tuner.tune(ECHO);   // resolves once the signal locks
import Phaser from 'phaser';
import { COLORS, TEXT_RESOLUTION, comicSettings } from '../comic';
import { H, W, label } from '../scenes/coreUi';
import type { Director } from '../world/Director';
import { PANEL, PIX, panel, ptext } from '../world/ui';

export interface TuneSpec {
  title: string; // CAPS, like a QTE prompt
  how: string; // one sentence under it
  target: { f: number; a: number }; // f: peaks across the scope (1..6), a: height (0.1..1)
  start: { f: number; a: number };
  /** The echo wanders around its target (a note that won't hold still). */
  drift?: { f: number; a: number; period: number };
  tol?: { f: number; a: number }; // how close counts as matched
  hold?: number; // ms the match must be held
  hz?: number; // pitch per peak, for the sound
  hint?: string;
}

const DEPTH = 68; // under the QTE layer (70), above the dialogue (20) and the board (50)
const F = { min: 1, max: 6 }, A = { min: 0.1, max: 1 };
const GOLD = 0xffe08a, TEAL = 0x7fe0d4, PALE = 0xe8fbff;

/** A key cap, drawn like the tutorial cards' (paper face, ink edge). Returns its width. */
function keycap(s: Phaser.Scene, c: Phaser.GameObjects.Container, x: number, y: number, key: string) {
  const t = ptext(s, 0, 0, key, 28, '#05040a').setStroke('#05040a', 0).setOrigin(0.5);
  const kw = Math.max(52, t.width + 26);
  const g = s.add.graphics();
  g.fillStyle(0x000000, 0.5).fillRoundedRect(x + 3, y - 22, kw, 50, 8);
  g.fillStyle(0xf3e9d2, 1).fillRoundedRect(x, y - 25, kw, 50, 8);
  g.lineStyle(3, 0x05040a, 1).strokeRoundedRect(x, y - 25, kw, 50, 8);
  t.setPosition(x + kw / 2, y);
  c.add([g, t]);
  return kw;
}

export class Tuner {
  private d: Director;
  /** What's on screen (read by tools/autoplay-story.ts, which calls `auto()` to solve it). */
  state: { locked: boolean; closeness: number; auto: () => void } | null = null;

  constructor(d: Director) {
    this.d = d;
  }

  async tune(spec: TuneSpec): Promise<void> {
    const d = this.d, s = d.scene;
    const tol = spec.tol ?? { f: 0.15, a: 0.07 };
    const hold = spec.hold ?? 1200;
    const hz = spec.hz ?? 55;
    d.busyUi = true;

    // ---- layout: the lantern on the left, the scope beside it, two knobs and the signal meter below
    const lx = 414, sx = 506, sw = 1060, sy = 300, sh = 340, cy = sy + sh / 2;
    const tx0 = 740, tx1 = 1360; // knob tracks
    const rowF = 712, rowA = 800, rowS = 900;
    const layer = s.add.container(0, 0).setDepth(DEPTH).setAlpha(0);
    layer.add(s.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setInteractive());
    layer.add(label(s, W / 2, 140, spec.title, 72, { color: '#e8fbff', strokeThickness: 12 }).setOrigin(0.5));
    layer.add(s.add.text(W / 2, 214, spec.how, { fontFamily: PIX, fontSize: '36px', color: '#cfe6ee', resolution: TEXT_RESOLUTION }).setOrigin(0.5));
    const hint = ptext(s, W / 2, 262, `Hint: ${spec.hint ?? 'match the height first, then count the peaks.'}`, 30, '#ffe08a').setOrigin(0.5).setVisible(false);
    layer.add(hint);

    // The scope: a blue panel with the evidence board's faint grid.
    layer.add(panel(s, sx, sy, sw, sh, 0.95));
    const grid = s.add.graphics();
    grid.lineStyle(1, 0x2a3a5a, 0.5);
    for (let x = sx + 40; x < sx + sw; x += 40) grid.lineBetween(x, sy + 10, x, sy + sh - 10);
    for (let y = sy + 30; y < sy + sh; y += 40) grid.lineBetween(sx + 10, y, sx + sw - 10, y);
    grid.lineStyle(2, PANEL.line, 0.35).lineBetween(sx + 12, cy, sx + sw - 12, cy);
    layer.add(grid);
    const waves = s.add.graphics();
    layer.add(waves);
    layer.add(ptext(s, sx + 20, sy + 12, 'ECHO', 26, '#e8fbff').setAlpha(0.7));
    layer.add(ptext(s, sx + 92, sy + 12, 'LANTERN', 26, '#7fe0d4'));

    // The lantern, framed like a dialogue portrait, with a glow that grows as the signal clears.
    layer.add(panel(s, lx - 76, sy, 152, sh, 1));
    const glow = s.add.image(lx, cy, 'w_glow').setTint(0x9fe8ff).setBlendMode(Phaser.BlendModes.ADD);
    const lamp = s.add.image(lx, cy, 'pt_lantern').setScale(2);
    lamp.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    layer.add([glow, lamp]);

    // ---- the two knobs
    let f = spec.start.f, a = spec.start.a;
    const knobs = s.add.graphics();
    layer.add(knobs);
    const marks: Phaser.GameObjects.Text[] = [];
    const row = (y: number, name: string, keys: [string, string], which: 'f' | 'a') => {
      layer.add(ptext(s, sx, y, name, 32, '#7f9fd8').setOrigin(0, 0.5));
      const m = ptext(s, sx + 210, y, '○', 30, '#3e5070').setOrigin(0.5).setVisible(false);
      marks.push(m);
      layer.add(m);
      let kx = tx1 + 40;
      kx += keycap(s, layer, kx, y, keys[0]) + 10;
      keycap(s, layer, kx, y, keys[1]);
      const zone = s.add.zone((tx0 + tx1) / 2, y, tx1 - tx0 + 60, 70).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => ((drag = which), setFrom(p.x)));
      layer.add(zone);
    };
    let drag: 'f' | 'a' | null = null;
    const setFrom = (px: number) => {
      const k = Phaser.Math.Clamp((px - tx0) / (tx1 - tx0), 0, 1);
      if (drag === 'f') f = F.min + k * (F.max - F.min);
      if (drag === 'a') a = A.min + k * (A.max - A.min);
    };
    row(rowF, 'FREQUENCY', ['A', 'D'], 'f');
    row(rowA, 'AMPLITUDE', ['S', 'W'], 'a');
    const onMove = (p: Phaser.Input.Pointer) => drag && p.isDown && setFrom(p.x);
    const onUp = () => (drag = null);
    s.input.on('pointermove', onMove);
    s.input.on('pointerup', onUp);
    const held = new Set<string>();
    const onDown = (e: KeyboardEvent) => held.add(e.key.toLowerCase());
    const onKeyUp = (e: KeyboardEvent) => held.delete(e.key.toLowerCase());
    s.input.keyboard?.on('keydown', onDown);
    s.input.keyboard?.on('keyup', onKeyUp);
    // A key released while paused or in another window would otherwise stay held.
    const letGo = () => held.clear();
    d.world.events.on(Phaser.Scenes.Events.PAUSE, letGo);
    s.game.events.on(Phaser.Core.Events.BLUR, letGo);

    // ---- the signal meter (the mash QTE's bar), with a gold tick where "matched" starts
    layer.add(ptext(s, sx, rowS, 'SIGNAL', 32, '#7f9fd8').setOrigin(0, 0.5));
    const meter = s.add.graphics();
    layer.add(meter);
    const status = ptext(s, tx1 + 40, rowS, '', 34, '#ffe08a').setOrigin(0, 0.5);
    layer.add(status);
    layer.add(ptext(s, W / 2, rowS + 80, 'Drag the gold knobs, or use the keys. Hold Shift for small steps.', 30, '#aab8d8').setOrigin(0.5));
    const closeness = (df: number, da: number) => Math.exp(-((df / 0.6) ** 2 + (da / 0.25) ** 2));
    const threshold = closeness(tol.f, tol.a);

    const sound = d.audio.tuner();
    s.tweens.add({ targets: layer, alpha: 1, duration: 200 });

    let t = 0, inFor = 0, locked = false, auto = false;
    const st = { locked: false, closeness: 0, auto: () => (auto = true) };
    this.state = st;
    const still = comicSettings.reduceMotion;
    try {
      await d.until(() => {
        const dt = d.lastDt;
        t += dt;
        // Where the echo is right now (it may wander).
        const dr = spec.drift, ph = dr ? (t / dr.period) * Math.PI * 2 : 0;
        const ef = spec.target.f + (dr ? dr.f * Math.sin(ph) : 0);
        const ea = spec.target.a + (dr ? dr.a * Math.sin(ph + 1.3) : 0);
        if (!locked) {
          const fine = held.has('shift') ? 0.35 : 1;
          const k = (dt / 1000) * fine;
          if (held.has('a') || held.has('arrowleft')) f -= 1.6 * k;
          if (held.has('d') || held.has('arrowright')) f += 1.6 * k;
          if (held.has('s') || held.has('arrowdown')) a -= 0.55 * k;
          if (held.has('w') || held.has('arrowup')) a += 0.55 * k;
          if (auto) (f = ef), (a = ea);
          f = Phaser.Math.Clamp(f, F.min, F.max);
          a = Phaser.Math.Clamp(a, A.min, A.max);
        }
        const fOk = Math.abs(f - ef) <= tol.f, aOk = Math.abs(a - ea) <= tol.a;
        const c = closeness(f - ef, a - ea);
        st.closeness = c;
        if (fOk && aOk) inFor += dt;
        else inFor = Math.max(0, inFor - dt * 2);
        if (!locked && inFor >= hold) {
          locked = st.locked = true;
          d.audio.tone('chime');
        }

        // Hints: a sentence after 25 s, then markers for whichever knob is already right.
        hint.setVisible(t > 25_000 && !locked);
        marks.forEach((m, i) => {
          const ok = i === 0 ? fOk : aOk;
          m.setVisible(t > 45_000).setText(ok ? '●' : '○').setColor(ok ? '#7fe0d4' : '#3e5070');
        });

        // Waves: the echo dotted and pale, the lantern solid (gold once it's on the echo).
        const amp = sh / 2 - 34, x0 = sx + 24, span = sw - 48;
        const phase = still ? 0 : (t / 1000) * 2.2;
        waves.clear();
        waves.fillStyle(PALE, 0.6);
        for (let x = 0; x <= span; x += 16) waves.fillCircle(x0 + x, cy - ea * amp * Math.sin((x / span) * Math.PI * 2 * ef + phase), 3);
        const line = fOk && aOk ? GOLD : TEAL;
        waves.lineStyle(5, line, 1).beginPath();
        const tick = still ? 0 : Math.floor(t / 80); // static redraws ~12 times a second
        for (let x = 0; x <= span; x += 6) {
          const n = Math.sin(x * 12.9898 + tick * 78.233) * 43758.5453;
          const noise = (n - Math.floor(n) - 0.5) * 30 * (1 - c) * (locked ? 0 : 1);
          const y = cy - a * amp * Math.sin((x / span) * Math.PI * 2 * f + phase) + noise;
          if (x === 0) waves.moveTo(x0 + x, y);
          else waves.lineTo(x0 + x, y);
        }
        waves.strokePath();

        // Knobs on their tracks.
        knobs.clear();
        for (const [y, v] of [[rowF, (f - F.min) / (F.max - F.min)], [rowA, (a - A.min) / (A.max - A.min)]] as const) {
          knobs.fillStyle(0x0b1a1f, 0.9).fillRoundedRect(tx0, y - 7, tx1 - tx0, 14, 7);
          knobs.lineStyle(2, PANEL.line, 0.9).strokeRoundedRect(tx0, y - 7, tx1 - tx0, 14, 7);
          const kx = tx0 + v * (tx1 - tx0);
          knobs.fillStyle(0x000000, 0.5).fillRoundedRect(kx - 15 + 3, y - 28 + 4, 30, 56, 6);
          knobs.fillStyle(GOLD, 1).fillRoundedRect(kx - 15, y - 28, 30, 56, 6);
          knobs.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(kx - 15, y - 28, 30, 56, 6);
        }
        // Signal meter: how clear the echo is, plus how long it's been held.
        meter.clear().fillStyle(0x0b1a1f, 0.9).fillRect(tx0, rowS - 18, tx1 - tx0, 36);
        meter.fillStyle(TEAL, 1).fillRect(tx0, rowS - 18, (tx1 - tx0) * (locked ? 1 : c), 36);
        meter.lineStyle(6, COLORS.ink).strokeRect(tx0, rowS - 18, tx1 - tx0, 36);
        meter.fillStyle(GOLD, 1).fillRect(tx0 + (tx1 - tx0) * threshold - 2, rowS - 26, 4, 52);
        meter.fillStyle(PALE, 0.9).fillRect(tx0, rowS + 26, (tx1 - tx0) * Math.min(1, inFor / hold), 8);
        status.setText(locked ? 'LOCKED' : fOk && aOk ? 'HOLD IT' : '').setAlpha(locked || Math.sin(t / 160) > -0.3 ? 1 : 0.5);

        glow.setScale(1.2 + c * 1.8).setAlpha(0.2 + c * 0.6);
        // In tune, the two hums become one note; apart, they beat against each other.
        sound.set(hz * ef, 0.03 + 0.02 * ea, hz * f, 0.025 + 0.035 * a);
        return locked;
      });
      const done = label(s, sx + sw / 2, cy, 'LOCKED', 90, { color: '#7fe0d4', strokeThickness: 14 }).setOrigin(0.5);
      layer.add(done);
      if (!comicSettings.reduceFlashing) s.tweens.add({ targets: glow, alpha: 1, scale: 4, duration: 300, yoyo: true });
      await d.wait(900);
    } finally {
      s.input.off('pointermove', onMove);
      s.input.off('pointerup', onUp);
      s.input.keyboard?.off('keydown', onDown);
      s.input.keyboard?.off('keyup', onKeyUp);
      d.world.events.off(Phaser.Scenes.Events.PAUSE, letGo);
      s.game.events.off(Phaser.Core.Events.BLUR, letGo);
      sound.stop();
      this.state = null;
      s.tweens.add({ targets: layer, alpha: 0, duration: 250, onComplete: () => layer.destroy() });
      d.busyUi = false;
    }
  }
}

/** Episode 1: the lantern's first real use. A faint, quick echo, low and fast. */
export const ECHO_FIRST: TuneSpec = {
  title: 'TUNE THE LANTERN',
  how: 'Line the lantern’s light up with the echo, then hold it there.',
  target: { f: 4, a: 0.35 },
  start: { f: 1.6, a: 0.9 },
  hz: 55,
};

/** Episode 4: the note under Veyra. Slow and deep, and it won't hold still. */
export const ECHO_NOTE: TuneSpec = {
  title: 'FOLLOW THE NOTE',
  how: 'The note under the ground keeps wandering. Match it, and stay with it.',
  target: { f: 1.6, a: 0.8 },
  start: { f: 4.5, a: 0.3 },
  drift: { f: 0.3, a: 0.08, period: 7000 },
  tol: { f: 0.18, a: 0.08 },
  hold: 1600,
  hz: 85,
  hint: 'the note drifts slowly. Match it, then follow it with small moves.',
};

