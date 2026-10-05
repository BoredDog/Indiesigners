// Sound for the road. Footsteps, creaks, page turns and the bell are Kenney CC0 samples
// (public/assets/trail/audio); wind and the low drone are synthesized live with WebAudio.
import Phaser from 'phaser';

const FILES = {
  step0: 'footstep_grass_000', step1: 'footstep_grass_001', step2: 'footstep_grass_002', step3: 'footstep_grass_003', step4: 'footstep_grass_004',
  creak1: 'creak1', creak2: 'creak2', creak3: 'creak3',
  page: 'bookFlip1', click: 'metalClick', bell: 'impactBell_heavy_000', sting: 'doorClose_4',
} as const;
type Key = keyof typeof FILES;

export class TrailAudio {
  private scene: Phaser.Scene;
  private step_i = 0;
  private ambience?: { stop: () => void; gain: GainNode };
  private isWalking = false;

  static preload(scene: Phaser.Scene) {
    for (const [k, f] of Object.entries(FILES)) {
      if (!scene.cache.audio.exists(`tr_${k}`)) scene.load.audio(`tr_${k}`, `assets/trail/audio/${f}.ogg`);
    }
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.startAmbience();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.ambience?.stop());
  }

  private play(k: Key, volume = 0.5, detune = 0) {
    if (!this.scene.cache.audio.exists(`tr_${k}`)) return;
    this.scene.sound.play(`tr_${k}`, { volume, detune });
  }

  step() {
    if (!this.isWalking) return;
    this.play(`step${this.step_i++ % 5}` as Key, 0.18, -300 + Math.random() * 200);
    if (Math.random() < 0.18) this.play(`creak${1 + Math.floor(Math.random() * 3)}` as Key, 0.12, -400);
  }
  creak() { this.play('creak2', 0.3, -600); }
  page() { this.play('page', 0.5); }
  click() { this.play('click', 0.35); }
  sting() { this.play('sting', 0.4, -800); }
  bell(heavy = false) { this.play('bell', heavy ? 0.6 : 0.3, heavy ? -700 : -300); }

  walking(on: boolean) {
    this.isWalking = on;
    if (this.ambience) {
      const ctx = this.ambience.gain.context;
      this.ambience.gain.gain.setTargetAtTime(on ? 0.5 : 0.32, ctx.currentTime, 0.8);
    }
  }

  /** Wind (filtered noise with a slow sweep) + a detuned low drone. */
  private startAmbience() {
    const mgr = this.scene.sound as Phaser.Sound.WebAudioSoundManager;
    const ctx = mgr.context;
    if (!ctx) return;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(mgr.destination ?? ctx.destination);
    out.gain.setTargetAtTime(0.4, ctx.currentTime, 2);

    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; // brown noise
      d[i] = last * 3.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 500;
    bp.Q.value = 0.7;
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.frequency.value = 0.07;
    sweepGain.gain.value = 300;
    sweep.connect(sweepGain).connect(bp.frequency);
    const windGain = ctx.createGain();
    windGain.gain.value = 0.35;
    noise.connect(bp).connect(windGain).connect(out);

    const drone = [55, 55.4, 82.4].map((f) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.06;
      o.connect(g).connect(out);
      return o;
    });
    noise.start();
    sweep.start();
    drone.forEach((o) => o.start());
    this.ambience = {
      gain: out,
      stop: () => {
        out.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
        setTimeout(() => {
          [noise, sweep, ...drone].forEach((n) => n.stop());
          out.disconnect();
        }, 1200);
      },
    };
  }
}
