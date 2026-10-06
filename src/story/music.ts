// Story-mode music and the volume mix. Everything is synthesized with WebAudio (no music files, no
// licences to clear): a soft pad, a music-box line for Nia's theme, a low bass, and an echo that
// fits a game about echoes. One player per AudioContext, so the music carries across scenes
// (Title → Story) and crossfades when the mood changes.
//
// Mix: two buses into Phaser's master output. MUSIC = this file; SOUND = samples, synth one-shots
// and ambience (src/story/audio.ts). Both follow the MUSIC / SOUND rows in the settings menu.
import Phaser from 'phaser';
import { gameState } from '../core/GameState';

export type Mood = 'title' | 'night' | 'memory' | 'under' | 'finale' | 'dawn' | 'none';

type Mix = { ctx: AudioContext; music: GainNode; sfx: GainNode };
const mixes = new WeakMap<AudioContext, Mix>();

/** The MUSIC and SOUND buses for this game's AudioContext (made once, on first use). */
export function mixFor(scene: Phaser.Scene): Mix | undefined {
  const m = scene.sound as Phaser.Sound.WebAudioSoundManager;
  const ctx = m.context;
  if (!ctx) return undefined;
  let mix = mixes.get(ctx);
  if (!mix) {
    const out = m.destination ?? ctx.destination;
    const music = ctx.createGain(), sfx = ctx.createGain();
    music.gain.value = gameState.settings.music;
    sfx.gain.value = gameState.settings.sfx;
    music.connect(out);
    sfx.connect(out);
    mix = { ctx, music, sfx };
    mixes.set(ctx, mix);
    (window as unknown as { __echoesMix?: Mix }).__echoesMix = mix; // for tools/check-audio.ts
    const set = mix;
    gameState.on('settings-changed', (s) => {
      set.music.gain.setTargetAtTime(s.music, ctx.currentTime, 0.05);
      set.sfx.gain.setTargetAtTime(s.sfx, ctx.currentTime, 0.05);
    });
  }
  return mix;
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** One piece of music: a chord loop, an optional melody per bar, an optional bass. */
type Piece = {
  bar: number; // seconds per chord
  chords: number[][]; // MIDI notes
  /** Melody for bar i: [offset in seconds, MIDI note]. */
  melody?: (i: number) => [number, number][];
  bass?: boolean;
  /** A low struck bell every other bar instead of a melody (under Veyra). */
  bells?: number[];
  pad: number; // pad level per note
  box: number; // music-box level
  level: number; // overall level of this piece
};

// Nia's theme: a little music-box phrase in A minor, rising and falling back. It returns in every
// mood, and in A major's relative C for the dawn.
const NIA: [number, number][] = [[0, 69], [0.6, 72], [1.2, 76], [2.4, 74], [3.0, 72], [3.6, 71]];
const NIA_END: [number, number][] = [[0, 69], [1.2, 64], [2.4, 69]];
const NIA_DAWN: [number, number][] = [[0, 72], [0.55, 76], [1.1, 79], [2.2, 77], [2.75, 76], [3.3, 74]];
const NIA_DAWN_END: [number, number][] = [[0, 72], [1.1, 67], [2.2, 72], [3.3, 76]];

const MINOR = [[57, 60, 64], [53, 57, 60, 64], [50, 57, 62, 65], [52, 56, 59, 64]]; // Am, Fmaj7, Dm, E
const PIECES: Record<Exclude<Mood, 'none'>, Piece> = {
  title: { bar: 4.8, chords: MINOR, melody: (i) => (i % 2 === 0 ? NIA : NIA_END), bass: true, pad: 0.03, box: 0.055, level: 1 },
  // Exploring: mostly pad under the wind, with a fragment of the theme now and then.
  night: { bar: 6, chords: MINOR, melody: (i) => (i % 4 === 1 ? NIA.slice(0, 3) : []), pad: 0.022, box: 0.04, level: 0.7 },
  memory: {
    bar: 5, chords: [[69, 72, 76], [64, 67, 71], [65, 69, 72], [64, 68, 71]], // Am, Em, F, E (an octave up, thinner)
    melody: (i) => (i % 2 === 0 ? NIA.map(([t, n]) => [t * 1.2, n + 12] as [number, number]) : []), pad: 0.016, box: 0.035, level: 0.8,
  },
  under: { bar: 7, chords: [[33, 40, 45], [33, 40, 44], [34, 41, 46], [33, 40, 45]], bells: [45, 52, 48, 50], pad: 0.035, box: 0.05, level: 0.75 },
  finale: { bar: 4.8, chords: MINOR, melody: (i) => (i % 2 === 0 ? NIA : NIA_END), bass: true, pad: 0.034, box: 0.06, level: 1 },
  dawn: {
    bar: 4.5, chords: [[48, 55, 60, 64], [47, 55, 59, 62], [45, 57, 60, 64], [41, 53, 57, 60]], // C, G/B, Am, F
    melody: (i) => (i % 2 === 0 ? NIA_DAWN : NIA_DAWN_END), bass: true, pad: 0.034, box: 0.06, level: 1,
  },
};

class Player {
  private mix: Mix;
  private mood: Mood = 'none';
  private current?: { gain: GainNode; timer: number; piece: Piece; next: number; i: number };
  private input: GainNode;

  constructor(mix: Mix) {
    this.mix = mix;
    const { ctx } = mix;
    // Dry + an echo (delay with a darkened feedback loop) into the MUSIC bus.
    this.input = ctx.createGain();
    const delay = ctx.createDelay(2), fb = ctx.createGain(), tone = ctx.createBiquadFilter(), wet = ctx.createGain();
    delay.delayTime.value = 0.42;
    fb.gain.value = 0.38;
    tone.type = 'lowpass';
    tone.frequency.value = 2200;
    wet.gain.value = 0.5;
    this.input.connect(mix.music);
    this.input.connect(delay);
    delay.connect(tone).connect(fb).connect(delay);
    tone.connect(wet).connect(mix.music);
  }

  play(mood: Mood) {
    if (mood === this.mood) return;
    this.mood = mood;
    const { ctx } = this.mix;
    const old = this.current;
    this.current = undefined;
    if (old) {
      clearInterval(old.timer);
      old.gain.gain.cancelScheduledValues(ctx.currentTime);
      old.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.8);
      setTimeout(() => old.gain.disconnect(), 5000);
    }
    if (mood === 'none') return;
    const piece = PIECES[mood];
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.gain.setTargetAtTime(piece.level, ctx.currentTime, 1.2);
    gain.connect(this.input);
    const cur = { gain, piece, next: ctx.currentTime + 0.1, i: 0, timer: 0 };
    // Look-ahead scheduler: queue each bar a moment before it starts. While the context is
    // suspended (before the first click, or with the tab in the background) time stands still,
    // so nothing piles up.
    const tick = () => {
      while (cur.next < ctx.currentTime + 0.6) {
        this.bar(cur.gain, piece, cur.i, cur.next);
        cur.next += piece.bar;
        cur.i++;
      }
    };
    cur.timer = window.setInterval(tick, 150);
    tick();
    this.current = cur;
  }

  private bar(out: GainNode, p: Piece, i: number, t: number) {
    const chord = p.chords[i % p.chords.length];
    for (const n of chord) this.pad(out, hz(n), t, p.bar, p.pad);
    if (p.bass) this.bass(out, hz(chord[0] - 12), t, p.bar);
    for (const [dt, n] of p.melody?.(i) ?? []) this.box(out, hz(n), t + dt, p.box);
    if (p.bells && i % 2 === 0) this.bell(out, hz(p.bells[(i / 2) % p.bells.length]), t + 0.5, p.box);
  }

  /** Two detuned triangles through a soft low-pass, slow in and out. */
  private pad(out: AudioNode, f: number, t: number, len: number, level: number) {
    const { ctx } = this.mix;
    const g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(level, t + Math.min(1.6, len * 0.35));
    g.gain.setValueAtTime(level, t + len - 0.2);
    g.gain.linearRampToValueAtTime(0.0001, t + len + 1.4);
    lp.connect(g).connect(out);
    for (const cents of [-5, 5]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.detune.value = cents;
      o.connect(lp);
      o.start(t);
      o.stop(t + len + 1.5);
    }
  }

  /** A music-box note: a bright sine with two quieter partials and a long ring. */
  private box(out: AudioNode, f: number, t: number, level: number) {
    const { ctx } = this.mix;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    g.connect(out);
    [[1, 1], [2, 0.3], [3.01, 0.08]].forEach(([mult, amp]) => {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.value = f * mult;
      og.gain.value = amp;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + 2.3);
    });
  }

  private bass(out: AudioNode, f: number, t: number, len: number) {
    const { ctx } = this.mix;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(len, 3.5));
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + len);
  }

  /** A low struck bell: a sine plus the inharmonic partials that make it sound like metal. */
  private bell(out: AudioNode, f: number, t: number, level: number) {
    const { ctx } = this.mix;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level * 1.4, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
    g.connect(out);
    [[1, 1], [2.76, 0.35], [5.4, 0.12]].forEach(([mult, amp]) => {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.value = f * mult;
      og.gain.value = amp;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + 4.6);
    });
  }
}

const players = new WeakMap<AudioContext, Player>();

/** Switch the music to a mood (crossfades; the same mood again does nothing). */
export function music(scene: Phaser.Scene, mood: Mood) {
  const mix = mixFor(scene);
  if (!mix) return;
  let p = players.get(mix.ctx);
  if (!p) players.set(mix.ctx, (p = new Player(mix)));
  p.play(mood);
}
