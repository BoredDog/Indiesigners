// Validates hypotheses against authored requirements (Blueprint D1, A3, A5, A19, Appendix §6).
// Never invents clues and never auto-solves: only an explicit confirm() changes state.
import { gameState } from './GameState';
import {
  deduction,
  fmt,
  deductionsOf,
  evidenceOf,
  story,
  type Deduction,
  type DeductionId,
  type Thread,
  type WitnessId,
} from './StoryData';

export type ConclusionKey = 'correct' | 'wrong_0' | 'wrong_1';

export interface ConclusionOption {
  key: ConclusionKey;
  text: string;
}

export type AttemptResult =
  | { ok: true; deduction: Deduction; reaction: string; unlocks: string[]; threads: Thread[] }
  | { ok: false; message: string };

export const UNSUPPORTED = story.ui.popups.unsupported.text;

export const DeductionController = {
  /** All required evidence is known (the RECONSTRUCT button can show). */
  isAvailable(id: DeductionId): boolean {
    return deduction(id).requiredEvidence.every((e) => gameState.hasEvidence(e));
  },

  /** Open deductions of a witness whose evidence is complete. */
  available(witness: WitnessId): Deduction[] {
    return deductionsOf(witness).filter((d) => gameState.deductionState(d.id) === 'open' && this.isAvailable(d.id));
  },

  /** Evidence cards the player can pick from: everything known from this witness's page. */
  cards(id: DeductionId): string[] {
    const d = deduction(id);
    return evidenceOf(d.witness)
      .map((e) => e.id)
      .filter((e) => gameState.hasEvidence(e));
  },

  /**
   * The correct conclusion plus the two authored wrong ones, in a stable per-deduction order
   * (shuffled by id so the right answer isn't always first, but identical between visits).
   */
  conclusions(id: DeductionId): ConclusionOption[] {
    const d = deduction(id);
    const opts: ConclusionOption[] = [
      { key: 'correct', text: d.conclusion },
      { key: 'wrong_0', text: d.wrongConclusions[0] },
      { key: 'wrong_1', text: d.wrongConclusions[1] },
    ];
    const seed = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
    const rot = seed % 3;
    return [...opts.slice(rot), ...opts.slice(0, rot)];
  },

  /** Pure check: do these cards + this conclusion support the deduction? */
  check(id: DeductionId, selected: string[], conclusion: ConclusionKey): boolean {
    const d = deduction(id);
    const allowed = new Set([...d.requiredEvidence, ...d.supportingEvidence]);
    const picked = new Set(selected);
    return (
      conclusion === 'correct' &&
      d.requiredEvidence.every((e) => picked.has(e) && gameState.hasEvidence(e)) &&
      [...picked].every((e) => allowed.has(e))
    );
  },

  /**
   * B1 closeness feedback for a wrong attempt (Golden Idol style): says whether the cards or the
   * conclusion are the problem, and how many cards fit or are missing, never which ones.
   */
  closeness(id: DeductionId, selected: string[], conclusion: ConclusionKey | undefined): string {
    const c = story.ui.closeness;
    if (!conclusion || selected.length === 0) return c.nothingYet;
    const d = deduction(id);
    const allowed = new Set([...d.requiredEvidence, ...d.supportingEvidence]);
    const picked = new Set(selected);
    const missing = d.requiredEvidence.filter((e) => !picked.has(e)).length;
    const extra = [...picked].filter((e) => !allowed.has(e)).length;
    const fit = [...picked].filter((e) => d.requiredEvidence.includes(e)).length;
    const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
    const words = {
      missing: n(missing, 'clue is', 'clues are'),
      extra: String(extra),
      extraWord: extra === 1 ? "card doesn't" : "cards don't",
      fit: String(fit),
      fitWord: fit === 1 ? 'fits' : 'fit',
    };
    if (conclusion === 'correct') {
      if (missing && extra) return fmt(c.conclusionRightMissingAndExtra, words);
      if (extra) return fmt(c.conclusionRightExtra, words);
      if (missing) return fmt(c.conclusionRightMissing, words);
      return UNSUPPORTED; // right cards + conclusion but evidence not known (can't happen via the UI)
    }
    if (!missing && !extra) return c.cardsFitConclusionWrong;
    return fit ? fmt(c.someCardsFit, words) : UNSUPPORTED;
  },

  /**
   * Confirm the hypothesis. Wrong → closeness feedback (B1), no penalty (A5).
   * Right → deduction confirmed, its authored unlocks and threads applied, autosaved.
   */
  attempt(id: DeductionId, selected: string[], conclusion: ConclusionKey): AttemptResult {
    if (gameState.deductionState(id) === 'confirmed') {
      const d = deduction(id);
      return { ok: true, deduction: d, reaction: d.reaction, unlocks: [], threads: [] };
    }
    if (!this.check(id, selected, conclusion)) return { ok: false, message: this.closeness(id, selected, conclusion) };
    const d = deduction(id);
    const threadIds = gameState.confirmDeduction(id);
    return {
      ok: true,
      deduction: d,
      reaction: d.reaction,
      unlocks: d.unlocks,
      threads: story.threads.filter((t) => threadIds.includes(t.id)),
    };
  },
};
