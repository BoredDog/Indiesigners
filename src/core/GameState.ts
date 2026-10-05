// The single global investigation state (Appendix §4-5). Every change autosaves (A16).
// Scenes read and write through `gameState`; listen with gameState.on('evidence-added', fn)
// and remove the listener on scene shutdown.
import { comicSettings } from '../comic/settings';
import { Emitter } from './Emitter';
import { SaveManager, SAVE_VERSION } from './SaveManager';
import {
  DEDUCTION_IDS,
  WITNESSES,
  deduction,
  deductionsOf,
  evidenceOf,
  isEvidenceId,
  story,
  type DeductionId,
  type Question,
  type Thread,
  type WitnessId,
} from './StoryData';

export type DeductionState = 'open' | 'confirmed';
export type WitnessStatus = 'unvisited' | 'active' | 'resolved';
export type FinaleState = 'locked' | 'ready' | 'revealed' | 'complete';

export interface Settings {
  music: number; // 0..1 (audio parked, kept for the menu)
  sfx: number;
  textSize: 100 | 125 | 150;
  textSpeed: 'instant' | 'typewriter';
  reduceMotion: boolean;
  reduceFlashing: boolean;
}

export interface SaveData {
  version: number;
  started: boolean;
  evidence: string[];
  deductions: Record<DeductionId, DeductionState>;
  witnesses: Record<WitnessId, WitnessStatus>;
  unlocks: string[]; // locations/notes unlocked by deductions (D1 "After confirmation")
  threads: string[]; // thread ids whose two endpoint deductions are confirmed
  aftermathPending: string[]; // threads not yet shown on an Aftermath page
  casebookSeen: { evidence: string[]; threads: string[]; deductions: string[] };
  asked: string[]; // conversation question ids already asked
  flags: Record<string, boolean>; // one-shot tips etc.
  finale: FinaleState;
  settings: Settings;
}

type Events = {
  'evidence-added': [id: string];
  'deduction-confirmed': [id: DeductionId];
  'thread-added': [id: string];
  'witness-changed': [witness: WitnessId, status: WitnessStatus];
  'unlock-added': [id: string];
  'finale-changed': [state: FinaleState];
  'settings-changed': [settings: Settings];
  changed: [];
};

const DEFAULT_SETTINGS: Settings = {
  music: 0.3,
  sfx: 0.6,
  textSize: 100,
  textSpeed: 'instant',
  reduceMotion: false,
  reduceFlashing: false,
};

function fresh(settings: Settings = { ...DEFAULT_SETTINGS }): SaveData {
  return {
    version: SAVE_VERSION,
    started: false,
    evidence: [],
    deductions: Object.fromEntries(DEDUCTION_IDS.map((id) => [id, 'open'])) as Record<DeductionId, DeductionState>,
    witnesses: { mira: 'unvisited', arun: 'unvisited', leela: 'unvisited' },
    unlocks: [],
    threads: [],
    aftermathPending: [],
    casebookSeen: { evidence: [], threads: [], deductions: [] },
    asked: [],
    flags: {},
    finale: 'locked',
    settings,
  };
}

export class GameState extends Emitter<Events> {
  private d: SaveData = fresh();

  constructor() {
    super();
    // Settings survive between sessions even before a game is started.
    const saved = SaveManager.read<SaveData>();
    if (saved?.settings) this.d.settings = { ...DEFAULT_SETTINGS, ...saved.settings };
    this.applySettings();
  }

  // ---- lifecycle ----------------------------------------------------------

  /** True when a started investigation is saved (Title shows Continue). */
  hasSave(): boolean {
    return SaveManager.read<SaveData>()?.started === true;
  }

  /** Restore the saved game. Returns false (and keeps current state) if there is none. */
  load(): boolean {
    const saved = SaveManager.read<SaveData>();
    if (!saved?.started) return false;
    const base = fresh();
    this.d = {
      ...base,
      ...saved,
      deductions: { ...base.deductions, ...saved.deductions },
      witnesses: { ...base.witnesses, ...saved.witnesses },
      casebookSeen: { ...base.casebookSeen, ...saved.casebookSeen },
      settings: { ...DEFAULT_SETTINGS, ...saved.settings },
      evidence: (saved.evidence ?? []).filter(isEvidenceId),
    };
    this.applySettings();
    this.emit('changed');
    return true;
  }

  /** Wipe progress (settings are kept) and start a new investigation. */
  newGame(): void {
    this.d = fresh(this.d.settings);
    this.d.started = true;
    this.save();
    this.emit('changed');
  }

  save(): void {
    SaveManager.write(this.d);
  }

  /** Snapshot for tests / debugging. */
  snapshot(): SaveData {
    return structuredClone(this.d);
  }

  private commit(): void {
    this.save();
    this.emit('changed');
  }

  // ---- evidence -----------------------------------------------------------

  /** Returns true if the evidence was new. */
  addEvidence(id: string): boolean {
    if (!isEvidenceId(id)) throw new Error(`Unknown evidence id: ${id}`);
    if (this.d.evidence.includes(id)) return false;
    this.d.evidence.push(id);
    this.emit('evidence-added', id);
    this.commit();
    return true;
  }

  hasEvidence(id: string): boolean {
    return this.d.evidence.includes(id);
  }

  allEvidence(): readonly string[] {
    return this.d.evidence;
  }

  /** Known evidence ids from one witness's page (or the tower), in page order. */
  evidenceFor(witness: WitnessId | 'tower'): string[] {
    return evidenceOf(witness)
      .map((e) => e.id)
      .filter((id) => this.hasEvidence(id));
  }

  /** Core fragments found on a page, for "Evidence 2/5". */
  evidenceProgress(witness: WitnessId): { found: number; total: number } {
    const core = evidenceOf(witness).filter((e) => e.core);
    return { found: core.filter((e) => this.hasEvidence(e.id)).length, total: core.length };
  }

  /** Optional evidence found / total, for the ending summary and the epilogue check (A15). */
  optionalProgress(): { found: number; total: number } {
    const opt = story.evidence.filter((e) => !e.core);
    return { found: opt.filter((e) => this.hasEvidence(e.id)).length, total: opt.length };
  }

  // ---- deductions ---------------------------------------------------------

  deductionState(id: DeductionId): DeductionState {
    return this.d.deductions[id];
  }

  deductionsConfirmed(witness?: WitnessId): number {
    const ids = witness ? deductionsOf(witness).map((d) => d.id) : DEDUCTION_IDS;
    return ids.filter((id) => this.d.deductions[id] === 'confirmed').length;
  }

  allDeductionsConfirmed(): boolean {
    return this.deductionsConfirmed() === DEDUCTION_IDS.length;
  }

  /**
   * Record a confirmed deduction and apply only its authored consequences: its unlocks and any
   * thread whose two endpoints are now confirmed (A19: no recursive auto-solving).
   * Validation of the player's hypothesis lives in DeductionController. Returns new thread ids.
   */
  confirmDeduction(id: DeductionId): string[] {
    if (this.d.deductions[id] === 'confirmed') return [];
    this.d.deductions[id] = 'confirmed';
    this.emit('deduction-confirmed', id);

    for (const u of deduction(id).unlocks) {
      if (!this.d.unlocks.includes(u)) {
        this.d.unlocks.push(u);
        this.emit('unlock-added', u);
      }
    }

    const added: string[] = [];
    for (const t of story.threads) {
      if (this.d.threads.includes(t.id)) continue;
      if (this.d.deductions[t.from] === 'confirmed' && this.d.deductions[t.to] === 'confirmed') {
        this.d.threads.push(t.id);
        this.d.aftermathPending.push(t.id);
        added.push(t.id);
        this.emit('thread-added', t.id);
      }
    }

    if (this.allDeductionsConfirmed() && this.d.finale === 'locked') {
      this.d.finale = 'ready';
      this.emit('finale-changed', 'ready');
    }
    this.commit();
    return added;
  }

  hasUnlock(id: string): boolean {
    return this.d.unlocks.includes(id);
  }

  unlocks(): readonly string[] {
    return this.d.unlocks;
  }

  // ---- threads / casebook -------------------------------------------------

  threads(): readonly string[] {
    return this.d.threads;
  }

  threadData(): Thread[] {
    return story.threads.filter((t) => this.d.threads.includes(t.id));
  }

  /** Threads that appeared since the last Aftermath page; clears the queue. */
  takeAftermathThreads(): Thread[] {
    const ids = this.d.aftermathPending;
    this.d.aftermathPending = [];
    this.commit();
    return story.threads.filter((t) => ids.includes(t.id));
  }

  /** True when the casebook has evidence/threads/deductions the player has not opened yet ("NEW EVIDENCE"). */
  casebookHasNew(): boolean {
    const seen = this.d.casebookSeen;
    const confirmed = DEDUCTION_IDS.filter((id) => this.d.deductions[id] === 'confirmed');
    return (
      this.d.evidence.some((e) => !seen.evidence.includes(e)) ||
      this.d.threads.some((t) => !seen.threads.includes(t)) ||
      confirmed.some((id) => !seen.deductions.includes(id))
    );
  }

  /** Items the casebook should animate as new; call markCasebookSeen() after. */
  casebookNew(): { evidence: string[]; threads: string[]; deductions: string[] } {
    const seen = this.d.casebookSeen;
    return {
      evidence: this.d.evidence.filter((e) => !seen.evidence.includes(e)),
      threads: this.d.threads.filter((t) => !seen.threads.includes(t)),
      deductions: DEDUCTION_IDS.filter((id) => this.d.deductions[id] === 'confirmed' && !seen.deductions.includes(id)),
    };
  }

  markCasebookSeen(): void {
    this.d.casebookSeen = {
      evidence: [...this.d.evidence],
      threads: [...this.d.threads],
      deductions: DEDUCTION_IDS.filter((id) => this.d.deductions[id] === 'confirmed'),
    };
    this.commit();
  }

  // ---- witnesses & conversations -------------------------------------------

  witnessStatus(w: WitnessId): WitnessStatus {
    return this.d.witnesses[w];
  }

  setWitness(w: WitnessId, s: WitnessStatus): void {
    if (this.d.witnesses[w] === s) return;
    this.d.witnesses[w] = s;
    this.emit('witness-changed', w, s);
    this.commit();
  }

  /** Evidence-gated questions whose required clues are all known (A10). */
  questionsFor(w: WitnessId): Question[] {
    return story.dialogue[w].questions.filter((q) => q.requires.every((e) => this.hasEvidence(e)));
  }

  /** Unlocked questions not asked yet: drives the village "New evidence." shimmer. */
  unaskedQuestions(w: WitnessId): Question[] {
    return this.questionsFor(w).filter((q) => !this.d.asked.includes(q.id));
  }

  markAsked(questionId: string): void {
    if (this.d.asked.includes(questionId)) return;
    this.d.asked.push(questionId);
    this.commit();
  }

  wasAsked(questionId: string): boolean {
    return this.d.asked.includes(questionId);
  }

  // ---- flags, finale, settings --------------------------------------------

  flag(name: string): boolean {
    return this.d.flags[name] === true;
  }

  setFlag(name: string, value = true): void {
    if (this.flag(name) === value) return;
    this.d.flags[name] = value;
    this.commit();
  }

  get finale(): FinaleState {
    return this.d.finale;
  }

  setFinale(state: FinaleState): void {
    if (this.d.finale === state) return;
    this.d.finale = state;
    this.emit('finale-changed', state);
    this.commit();
  }

  get settings(): Readonly<Settings> {
    return this.d.settings;
  }

  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.d.settings[key] = value;
    this.applySettings();
    this.emit('settings-changed', this.d.settings);
    this.commit();
  }

  private applySettings(): void {
    comicSettings.reduceMotion = this.d.settings.reduceMotion;
    comicSettings.reduceFlashing = this.d.settings.reduceFlashing;
    comicSettings.textScale = (this.d.settings.textSize ?? 100) / 100;
  }
}

export const gameState = new GameState();

export { WITNESSES };
