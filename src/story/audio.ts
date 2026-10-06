// Story-mode sound. Footsteps, creaks, page turns and the bell are Kenney CC0 samples
// (public/assets/story/audio). Wind, drone, heartbeat and glitch are synthesized with WebAudio.
import Phaser from 'phaser';

const FILES = {
  step0: 'footstep_grass_000', step1: 'footstep_grass_001', step2: 'footstep_grass_002', step3: 'footstep_grass_003', step4: 'footstep_grass_004',
  creak1: 'creak1', creak2: 'creak2', creak3: 'creak3',
  page: 'bookFlip1', click: 'metalClick', bell: 'impactBell_heavy_000', slam: 'doorClose_4',
} as const;
export type SoundKey = keyof typeof FILES;

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
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (this.bed?.stop(), this.hum(false)));
  }

  private get ctx(): AudioContext | undefined {
    return (this.scene.sound as Phaser.Sound.WebAudioSoundManager).context;
  }
  private get dest(): AudioNode | undefined {
    const m = this.scene.sound as Phaser.Sound.WebAudioSoundManager;
    return m.destination ?? this.ctx?.destination;
  }

  play(k: SoundKey, volume = 0.5, detune = 0) {
    if (this.scene.cache.audio.exists(`st_${k}`)) this.scene.sound.play(`st_${k}`, { volume, detune });
  }
  step() {
    this.play(`step${this.stepI++ % 5}` as SoundKey, 0.2, -300 + Math.random() * 200);
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

  /** Short synthesized one-shots. */
  tone(kind: 'heartbeat' | 'glitch' | 'whoom' | 'chime' | 'drone') {
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
  }

  /** Ambient bed: 'night' = wind + drone, 'memory' = thin high shimmer, 'under' = deep drone + drips. */
  ambience(kind: 'night' | 'memory' | 'under' | 'none') {
    const ctx = this.ctx, dest = this.dest;
    this.bed?.stop();
    this.bed = undefined;
    if (!ctx || !dest || kind === 'none') return;
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(dest);
    out.gain.setTargetAtTime(kind === 'memory' ? 0.25 : 0.4, ctx.currentTime, 1.5);
    const nodes: AudioScheduledSourceNode[] = [];

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
    this.bed = {
      out,
      stop: () => {
        out.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
        setTimeout(() => { nodes.forEach((n) => n.stop()); out.disconnect(); }, 1500);
      },
    };
  }
}
