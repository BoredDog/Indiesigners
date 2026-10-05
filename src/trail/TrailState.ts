// Rules for "The Road to Veyra". Pure TypeScript (no Phaser) so tools/check-trail.ts can play it.
import {
  CROSSING, DOUBT_TEXT, EVENTS, LANDMARKS, ROAD_MILES, TUNING,
  type Choice, type DoubtId, type Effects, type LanternMode, type Landmark, type Pace, type TrailEvent,
} from './TrailData';

export interface LedgerEntry {
  text: string;
  /** 'rations' = the portions don't add up; 'phantom' = this never happened. */
  questionable?: 'rations' | 'phantom';
  questioned?: boolean;
  redacted?: boolean;
}

export interface TrailSnapshot {
  mile: number;
  oil: number;
  rations: number;
  coins: number;
  composure: number;
  tonic: number;
  pace: Pace;
  lantern: LanternMode;
  hours: number;
  rationsEaten: number;
  nextLandmark: number;
  nextEventMile: number;
  doubts: DoubtId[];
  ledger: LedgerEntry[];
  flags: Record<string, boolean>;
  seenEvents: string[];
}

export type Rng = () => number;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const SAVE_KEY = 'echoes_trail_v1';

export class TrailState {
  s!: TrailSnapshot;
  private checkpoint!: string;
  private rng: Rng;

  constructor(rng: Rng = Math.random) {
    this.rng = rng;
    this.reset();
  }

  reset() {
    this.s = {
      mile: 0,
      oil: 0,
      rations: 0,
      coins: TUNING.start.coins,
      composure: TUNING.start.composure,
      tonic: 0,
      pace: 'steady',
      lantern: 'dim',
      hours: 0,
      rationsEaten: 0,
      nextLandmark: 1,
      nextEventMile: 8,
      doubts: [],
      ledger: [{ text: 'Night 1. Left Ashcombe Ferry with Nia. She says she knows the way.' }],
      flags: {},
      seenEvents: [],
    };
    this.saveCheckpoint();
  }

  // ---------------------------------------------------------------- derived
  get night() {
    return Math.floor(this.s.hours / 8) + 1;
  }
  get landmark(): Landmark | undefined {
    return LANDMARKS[this.s.nextLandmark];
  }
  get milesLeft() {
    return Math.max(0, ROAD_MILES - this.s.mile);
  }
  get hallucinating() {
    return this.s.composure < TUNING.hallucinateBelow;
  }
  get severe() {
    return this.s.composure < TUNING.severeBelow;
  }
  get dark() {
    return this.s.oil <= 0;
  }
  /** 0..1 radius of the lantern pool, used by the scene for the light. */
  get lightLevel() {
    if (this.dark) return 0.12;
    return this.s.lantern === 'bright' ? 1 : 0.62;
  }
  get ending(): 'truth' | 'denial' {
    return this.s.doubts.length >= TUNING.doubtsForTruth ? 'truth' : 'denial';
  }

  /** What the HUD shows. When composure is low, the narrator misreads his own supplies. */
  shown(kind: 'oil' | 'rations' | 'miles'): string {
    const real = kind === 'oil' ? this.s.oil : kind === 'rations' ? this.s.rations : this.milesLeft;
    if (!this.hallucinating) return String(Math.round(real));
    const wobble = this.severe ? 0.6 : 0.3;
    const fake = Math.max(0, Math.round(real * (1 + (this.rng() * 2 - 1) * wobble)));
    return this.rng() < 0.15 ? '??' : String(fake);
  }

  // ---------------------------------------------------------------- outfitting
  buy(item: 'oil' | 'rations' | 'tonic', qty = 1): boolean {
    const cost = TUNING.prices[item] * qty;
    if (cost > this.s.coins || qty <= 0) return false;
    this.s.coins -= cost;
    this.s[item] += qty;
    return true;
  }
  sell(item: 'oil' | 'rations' | 'tonic', qty = 1): boolean {
    if (this.s[item] < qty || qty <= 0) return false;
    this.s.coins += TUNING.prices[item] * qty;
    this.s[item] -= qty;
    return true;
  }

  // ---------------------------------------------------------------- travel
  /** One hour on the road. Returns what interrupts travel, if anything. */
  travelHour(): { landmark?: Landmark; event?: TrailEvent; lost?: boolean; nightEnded?: boolean } {
    const s = this.s;
    const target = this.landmark!.mile;
    s.mile = Math.min(target, s.mile + TUNING.milesPerHour[s.pace]);
    s.hours += 1;

    const darkNow = this.dark;
    s.oil = Math.max(0, s.oil - TUNING.oilPerHour[s.lantern]);
    const eat = Math.min(s.rations, TUNING.rationsPerHour);
    s.rations = Math.max(0, s.rations - eat);
    s.rationsEaten += eat;

    let dc = darkNow ? TUNING.composurePerHour.dark : TUNING.composurePerHour[s.lantern];
    dc += TUNING.paceComposure[s.pace];
    if (eat < TUNING.rationsPerHour) dc += TUNING.starving;
    s.composure = clamp(s.composure + dc, 0, 100);

    let nightEnded = false;
    if (s.hours % 8 === 0) {
      nightEnded = true;
      this.writeNight();
    }
    if (s.composure <= 0) return { lost: true, nightEnded };
    if (s.mile >= target) return { landmark: this.landmark, nightEnded };
    if (s.mile >= s.nextEventMile) {
      const [a, b] = TUNING.eventEveryMiles;
      s.nextEventMile = s.mile + a + this.rng() * (b - a);
      const ev = this.pickEvent();
      if (ev) {
        s.seenEvents.push(ev.id);
        return { event: ev, nightEnded };
      }
    }
    return { nightEnded };
  }

  private writeNight() {
    const n = this.night - 1;
    // The narrator always writes two portions. The sack only ever lost one person's share.
    this.s.ledger.push({
      text: `Night ${n}. ${Math.round(this.s.mile)} miles from the ferry. Nia and I shared supper — two portions.`,
      questionable: n >= 1 ? 'rations' : undefined,
    });
  }

  pickEvent(): TrailEvent | undefined {
    const s = this.s;
    const ok = (e: TrailEvent) =>
      !s.seenEvents.includes(e.id) &&
      (e.minMile ?? 0) <= s.mile &&
      (!e.needsLantern || e.needsLantern === s.lantern) &&
      (!e.phantom || this.hallucinating) &&
      e.choices.some((c) => this.canChoose(c));
    const pool = EVENTS.filter(ok);
    if (!pool.length) return undefined;
    // When the narrator is slipping, the phantoms come first.
    const phantoms = pool.filter((e) => e.phantom);
    const from = phantoms.length && this.rng() < 0.7 ? phantoms : pool;
    return from[Math.floor(this.rng() * from.length)];
  }

  canChoose(c: Choice): boolean {
    const e = c.effects ?? {};
    return (e.coins ?? 0) + this.s.coins >= 0 && (e.tonic ?? 0) + this.s.tonic >= 0;
  }

  choose(ev: TrailEvent, i: number): string {
    const c = ev.choices[i];
    if (!c || !this.canChoose(c)) return '';
    this.apply(c.effects);
    if (c.doubt) this.addDoubt(c.doubt);
    if (c.ledger) this.s.ledger.push({ text: c.ledger, questionable: ev.phantom ? 'phantom' : undefined });
    return c.result;
  }

  apply(e: Effects = {}) {
    const s = this.s;
    s.oil = Math.max(0, s.oil + (e.oil ?? 0));
    s.rations = Math.max(0, s.rations + (e.rations ?? 0));
    s.coins = Math.max(0, s.coins + (e.coins ?? 0));
    s.tonic = Math.max(0, s.tonic + (e.tonic ?? 0));
    s.composure = clamp(s.composure + (e.composure ?? 0), 0, 100);
    if (e.miles) s.mile = clamp(s.mile + e.miles, 0, this.landmark ? this.landmark.mile - 1 : ROAD_MILES);
  }

  addDoubt(d: DoubtId): boolean {
    if (this.s.doubts.includes(d)) return false;
    this.s.doubts.push(d);
    return true;
  }
  doubtText(d: DoubtId) {
    return DOUBT_TEXT[d];
  }

  // ---------------------------------------------------------------- camp actions
  rest(): string {
    const r = TUNING.rest;
    if (this.s.rations < r.rations) return 'Not enough food to rest. You lie awake listening to the cart creak.';
    this.s.rations -= r.rations;
    this.s.rationsEaten += r.rations / 2;
    this.s.oil = Math.max(0, this.s.oil - r.oil);
    this.s.composure = clamp(this.s.composure + r.composure, 0, 100);
    this.s.hours += 4;
    return this.hallucinating
      ? 'You sleep. Nia sits by the cart all night. She doesn’t blink.'
      : 'You sleep a few hours. Nia keeps watch. You feel steadier.';
  }

  /** The tonic steadies you — and takes the last thing you were sure of. */
  drinkTonic(): string {
    if (this.s.tonic <= 0) return '';
    this.s.tonic -= 1;
    this.s.composure = clamp(this.s.composure + TUNING.tonic.composure, 0, 100);
    const lost = this.s.doubts.pop();
    const last = [...this.s.ledger].reverse().find((l) => !l.redacted);
    if (last) last.redacted = true;
    return lost
      ? `Bitter, then warm. The fog thins. You can’t remember why you were worried about ${DOUBT_TEXT[lost].split(/[.:]/)[0].toLowerCase()}.`
      : 'Bitter, then warm. The fog thins. A page of the ledger blurs and you let it.';
  }

  questionEntry(i: number): string {
    const l = this.s.ledger[i];
    if (!l || !l.questionable || l.questioned || l.redacted) return '';
    l.questioned = true;
    if (l.questionable === 'rations') {
      const eatenBy = this.s.rationsEaten;
      const ate = Math.round(eatenBy);
      this.addDoubt('rations');
      return `You count the sack. ${ate} portions gone in ${this.night} nights. Enough for one traveller. Not two.`;
    }
    this.s.composure = clamp(this.s.composure + 6, 0, 100);
    return 'You check the mile posts against the map. You never left the road. It never happened.';
  }

  search(lm: Landmark): string {
    if (!lm.search || this.s.flags[lm.search.once]) return 'There is nothing else here. There never was.';
    this.s.flags[lm.search.once] = true;
    this.apply(lm.search.effects);
    if (lm.search.doubt) this.addDoubt(lm.search.doubt);
    return lm.search.text;
  }

  cross(how: 'ford' | 'float' | 'ferry'): { ok: boolean; text: string } {
    if (how === 'ferry') {
      if (this.s.coins < CROSSING.ferry.cost) return { ok: false, text: 'You don’t have the fare.' };
      this.s.coins -= CROSSING.ferry.cost;
      this.apply(CROSSING.ferry.effects);
      this.addDoubt(CROSSING.ferry.doubt);
      return { ok: true, text: CROSSING.ferry.text };
    }
    const c = CROSSING[how];
    if (this.rng() < c.risk) {
      this.apply(c.effects);
      return { ok: false, text: c.bad };
    }
    return { ok: true, text: c.ok };
  }

  /** Leave a landmark: the next stretch of road begins. */
  depart() {
    this.s.nextLandmark = Math.min(LANDMARKS.length - 1, this.s.nextLandmark + 1);
    this.s.nextEventMile = this.s.mile + 6;
    this.saveCheckpoint();
  }

  // ---------------------------------------------------------------- saving
  saveCheckpoint() {
    this.checkpoint = JSON.stringify(this.s);
    try {
      localStorage.setItem(SAVE_KEY, this.checkpoint);
    } catch {
      /* no storage (tests, private mode) */
    }
  }
  /** After THE FOG KEEPS YOU: back to the last landmark, a little worse off. */
  restoreCheckpoint() {
    this.s = JSON.parse(this.checkpoint);
    this.s.composure = Math.max(this.s.composure, 40);
    this.s.coins = Math.max(0, this.s.coins - 5);
    // No dead ends: you wake with a little oil and bread that someone left by the cart.
    this.s.oil = Math.max(this.s.oil, 8);
    this.s.rations = Math.max(this.s.rations, 6);
  }
  static hasSave(): boolean {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  }
  load(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      this.s = JSON.parse(raw);
      this.checkpoint = raw;
      return true;
    } catch {
      return false;
    }
  }
  static wipe() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
  }
}
