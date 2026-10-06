// Story-mode sound. Footsteps on grass, creaks, page turns and the bell are Kenney CC0 samples
// (public/assets/story/audio). Wind, rain, water, drone, stone and wood footsteps, heartbeat and
// glitch are synthesized with WebAudio. Everything goes through the SOUND bus (src/story/music.ts);
// music() switches the score.
import Phaser from 'phaser';
import { gameState } from '../core/GameState';
import { mixFor, music, type Mood } from './music';

const FILES = {
  step0: 'footstep_grass_000', step1: 'footstep_grass_001', step2: 'footstep_grass_002', step3: 'footstep_grass_003', step4: 'footstep_grass_004',
  creak1: 'creak1', creak2: 'creak2', creak3: 'creak3',
  page: 'bookFlip1', click: 'metalClick', bell: 'impactBell_heavy_000', slam: 'doorClose_4',
} as const;
export type SoundKey = keyof typeof FILES;
export type Surface = 'grass' | 'stone' | 'wood' | 'mud';

export class StoryAudio {
  private scene: Phaser.Scene;
  private stepI = 0;
  private bed?: { out: GainNode; stop: () => void };

  static preload(scene: Phaser.Scene) {
    for (const [k, f] of Object.entries(FILES)) {
      if (!scene.cache.audio.exists(`st_${k}`)) scene.load.audio(`st_${k}`, `assets/story/audio/${f}.ogg`);
    }
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (this.bed?.stop(), this.hum(false), this.water(false)));
  }

  private get ctx(): AudioContext | undefined {
    return (this.scene.sound as Phaser.Sound.WebAudioSoundManager).context;
  }
  /** The SOUND bus (falls back to the raw output if the mix isn't available). */
  private get dest(): AudioNode | undefined {
    const mix = mixFor(this.scene);
    if (mix) return mix.sfx;
    const m = this.scene.sound as Phaser.Sound.WebAudioSoundManager;
    return m.destination ?? this.ctx?.destination;
  }

  /** Switch the score (title, night, memory, under, finale, dawn, none). */
  music(mood: Mood) {
    music(this.scene, mood);
  }

  play(k: SoundKey, volume = 0.5, detune = 0) {
    const v = volume * gameState.settings.sfx; // samples play through Phaser, so scale them here
    if (v > 0 && this.scene.cache.audio.exists(`st_${k}`)) this.scene.sound.play(`st_${k}`, { volume: v, detune });
  }
  /** A footstep that matches the ground: grass samples, synthesized stone and wood. Underground
   *  stone gets a short slap-back, like a tunnel. */
  step(surface: Surface = 'grass', underground = false) {
    if (surface === 'grass' || surface === 'mud') {
      this.play(`step${this.stepI++ % 5}` as SoundKey, surface === 'mud' ? 0.14 : 0.2, (surface === 'mud' ? -700 : -300) + Math.random() * 200);
      return;
    }
    const ctx = this.ctx, dest = this.dest;
    if (!ctx || !dest) return;
    const t = ctx.currentTime, vary = 0.85 + Math.random() * 0.3;
    const hit = (at: number, level: number) => {
      const len = surface === 'wood' ? 0.09 : 0.05;
      const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate), ch = b.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length) ** 2;
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = b;
      f.type = 'bandpass';
      f.frequency.value = (surface === 'wood' ? 650 : 1700) * vary;
      f.Q.value = surface === 'wood' ? 1.2 : 0.8;
      g.gain.value = level * (surface === 'wood' ? 0.5 : 0.35);
      s.connect(f).connect(g).connect(dest);
      s.start(t + at);
      // The heel: a short low thump, hollow on wood.
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.setValueAtTime((surface === 'wood' ? 170 : 115) * vary, t + at);
      o.frequency.exponentialRampToValueAtTime(surface === 'wood' ? 110 : 70, t + at + 0.08);
      og.gain.setValueAtTime(0.0001, t + at);
      og.gain.exponentialRampToValueAtTime(level * (surface === 'wood' ? 0.22 : 0.14), t + at + 0.004);
      og.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.09);
      o.connect(og).connect(dest);
      o.start(t + at);
      o.stop(t + at + 0.12);
    };
    hit(0, 1);
    if (underground && surface === 'stone') hit(0.11, 0.3);
  }
  creak() {
    this.play(`creak${1 + Math.floor(Math.random() * 3)}` as SoundKey, 0.35, -500);
  }
  bell(times = 1) {
    for (let i = 0; i < times; i++) this.scene.time.delayedCall(i * 1400, () => this.play('bell', 0.7, -900));
  }

  private humNode?: { gain: GainNode; stop: () => void };
  /** A low, steady hum while the lantern is raised (fades in and out). */
  hum(on: boolean) {
    const ctx = this.ctx, dest = this.dest;
    if (!ctx || !dest) return;
    if (on && !this.humNode) {
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      const a = ctx.createOscillator(), b = ctx.createOscillator();
      a.type = 'sine'; a.frequency.value = 110;
      b.type = 'triangle'; b.frequency.value = 165.4; // a slightly sour fifth, so it hums rather than sings
      const bg = ctx.createGain(); bg.gain.value = 0.25;
      a.connect(gain); b.connect(bg).connect(gain);
      gain.connect(dest);
      a.start(); b.start();
      gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.25);
      this.humNode = { gain, stop: () => { a.stop(); b.stop(); } };
    } else if (!on && this.humNode) {
      const h = this.humNode;
      this.humNode = undefined;
      h.gain.gain.cancelScheduledValues(ctx.currentTime);
      h.gain.gain.setValueAtTime(Math.max(0.0001, h.gain.gain.value), ctx.currentTime);
      h.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
      setTimeout(h.stop, 260);
    }
  }

  /**
   * The tuning puzzle's sound: the echo's tone and the lantern's tone. While they're apart they
   * beat against each other; when they match, the beating stops and it hums as one note.
   */
  tuner(): { set: (echoHz: number, echoGain: number, myHz: number, myGain: number) => void; stop: () => void } {
    const ctx = this.ctx, dest = this.dest;
    if (!ctx || !dest) return { set: () => undefined, stop: () => undefined };
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(dest);
    out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 0.4);
    const voice = () => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      g.gain.value = 0;
      o.connect(g).connect(out);
      o.start();
      return { o, g };
    };
    const echo = voice(), mine = voice();
    let stopped = false;
    return {
      set: (echoHz, echoGain, myHz, myGain) => {
        if (stopped) return;
        const t = ctx.currentTime;
        echo.o.frequency.setTargetAtTime(echoHz, t, 0.03);
        echo.g.gain.setTargetAtTime(echoGain, t, 0.05);
        mine.o.frequency.setTargetAtTime(myHz, t, 0.03);
        mine.g.gain.setTargetAtTime(myGain, t, 0.05);
      },
      stop: () => {
        if (stopped) return;
        stopped = true;
        out.gain.cancelScheduledValues(ctx.currentTime);
        out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), ctx.currentTime);
        out.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
        setTimeout(() => (echo.o.stop(), mine.o.stop(), out.disconnect()), 360);
      },
    };
  }

  private waterBed?: { stop: () => void };
  /** Running water while the river is full (Luke's memory). */
  water(on: boolean) {
    const ctx = this.ctx, dest = this.dest;
    if (!ctx || !dest) return;
    if (on && !this.waterBed) {
      const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { last = (last + 0.06 * (Math.random() * 2 - 1)) / 1.06; d[i] = last * 2.5 + (Math.random() * 2 - 1) * 0.05; }
      const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = buf;
      src.loop = true;
      bp.type = 'bandpass';
      bp.frequency.value = 420;
      bp.Q.value = 0.7;
      // A slow wobble on the filter makes it gurgle rather than hiss.
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 0.35;
      lg.gain.value = 160;
      lfo.connect(lg).connect(bp.frequency);
      g.gain.value = 0.0001;
      g.gain.setTargetAtTime(0.5, ctx.currentTime, 0.8);
      src.connect(bp).connect(g).connect(dest);
      src.start();
      lfo.start();
      this.waterBed = {
        stop: () => {
          g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.7);
          setTimeout(() => { src.stop(); lfo.stop(); g.disconnect(); }, 3500);
        },
      };
    } else if (!on && this.waterBed) {
      this.waterBed.stop();
      this.waterBed = undefined;
    }
  }

  /** Short synthesized one-shots. 'whisper' sits under a ghost's line; 'sting' is the dark ending. */
  tone(kind: 'heartbeat' | 'glitch' | 'whoom' | 'chime' | 'drone' | 'whisper' | 'sting') {
    const ctx = this.ctx, dest = this.dest;
    if (!ctx || !dest) return;
    const t = ctx.currentTime;
    const env = (g: GainNode, a: number, peak: number, d: number, at = 0) => {
      g.gain.setValueAtTime(0.0001, t + at);
      g.gain.exponentialRampToValueAtTime(peak, t + at + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + a + d);
    };
    const osc = (f: number, type: OscillatorType, peak: number, d: number, at = 0, glide?: number) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t + at);
      if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + at + d);
      env(g, 0.01, peak, d, at);
      o.connect(g).connect(dest);
      o.start(t + at);
      o.stop(t + at + d + 0.1);
    };
    const noise = (d: number, freq: number, peak: number, at = 0, type: BiquadFilterType = 'bandpass') => {
      const b = ctx.createBuffer(1, ctx.sampleRate * d, ctx.sampleRate), ch = b.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = b;
      f.type = type;
      f.frequency.value = freq;
      env(g, 0.005, peak, d, at);
      s.connect(f).connect(g).connect(dest);
      s.start(t + at);
    };
    if (kind === 'heartbeat') { osc(62, 'sine', 0.5, 0.18, 0, 40); osc(58, 'sine', 0.35, 0.2, 0.26, 38); }
    if (kind === 'glitch') { for (let i = 0; i < 6; i++) noise(0.05, 1500 + Math.random() * 4000, 0.18, i * 0.06, 'highpass'); osc(880, 'square', 0.05, 0.3, 0, 120); }
    if (kind === 'whoom') { noise(1.4, 200, 0.5, 0, 'lowpass'); osc(70, 'sawtooth', 0.12, 1.4, 0, 30); }
    if (kind === 'chime') { [880, 1320, 1760].forEach((f, i) => osc(f, 'sine', 0.12, 1.2, i * 0.08)); }
    if (kind === 'drone') { osc(49, 'sawtooth', 0.08, 3, 0, 46); }
    if (kind === 'whisper') { noise(0.7, 3200, 0.05, 0, 'bandpass'); [1318, 1975].forEach((f, i) => osc(f, 'sine', 0.012, 0.9, i * 0.05)); }
    if (kind === 'sting') { noise(2.4, 160, 0.4, 0, 'lowpass'); [55, 58.3, 82.4].forEach((f) => osc(f, 'sawtooth', 0.07, 3.2, 0, f * 0.94)); }
  }

  /** Ambient bed: 'night' = wind + drone, 'memory' = thin high shimmer, 'under' = deep drone,
   *  'rain' = the title screen's rain. */
  ambience(kind: 'night' | 'memory' | 'under' | 'rain' | 'none') {
    const ctx = this.ctx, dest = this.dest;
    this.bed?.stop();
    this.bed = undefined;
    if (!ctx || !dest || kind === 'none') return;
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(dest);
    out.gain.setTargetAtTime(kind === 'memory' ? 0.25 : 0.4, ctx.currentTime, 1.5);
    const nodes: AudioScheduledSourceNode[] = [];
    const stopAll = () => {
      out.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
      setTimeout(() => { nodes.forEach((n) => n.stop()); out.disconnect(); }, 1500);
    };

    if (kind === 'rain') {
      // Two layers of noise: a bright hiss for the drops, a low rumble for the downpour.
      const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      for (const [type, freq, level] of [['highpass', 2500, 0.07], ['lowpass', 500, 0.22]] as const) {
        const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        src.buffer = buf;
        src.loop = true;
        f.type = type;
        f.frequency.value = freq;
        g.gain.value = level;
        src.connect(f).connect(g).connect(out);
        nodes.push(src);
      }
      nodes.forEach((n, i) => (n as AudioBufferSourceNode).start(ctx.currentTime, i * 1.3)); // offset the loops so they don't line up
      this.bed = { out, stop: stopAll };
      return;
    }

    const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const wind = ctx.createBufferSource();
    wind.buffer = buf;
    wind.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = kind === 'under' ? 'lowpass' : 'bandpass';
    bp.frequency.value = kind === 'under' ? 180 : 520;
    const wg = ctx.createGain();
    wg.gain.value = kind === 'memory' ? 0.08 : 0.35;
    wind.connect(bp).connect(wg).connect(out);
    nodes.push(wind);

    const freqs = kind === 'memory' ? [440, 443, 660] : kind === 'under' ? [41, 41.3, 61.7] : [55, 55.4, 82.4];
    for (const f of freqs) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f;
      g.gain.value = kind === 'memory' ? 0.015 : 0.06;
      o.connect(g).connect(out);
      nodes.push(o);
    }
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 0.08;
    lg.gain.value = 260;
    lfo.connect(lg).connect(bp.frequency);
    nodes.push(lfo);
    nodes.forEach((n) => n.start());
    this.bed = { out, stop: stopAll };
  }
}
