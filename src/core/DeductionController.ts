// Validates hypotheses against authored requirements (Blueprint D1, A3, A5, A19, Appendix §6).
// Never invents clues and never auto-solves: only an explicit confirm() changes state.
import { gameState } from './GameState';
import {
  deduction,
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
   * Confirm the hypothesis. Wrong → "The evidence does not support…" with no penalty (A5).
   * Right → deduction confirmed, its authored unlocks and threads applied, autosaved.
   */
  attempt(id: DeductionId, selected: string[], conclusion: ConclusionKey): AttemptResult {
    if (gameState.deductionState(id) === 'confirmed') {
      const d = deduction(id);
      return { ok: true, deduction: d, reaction: d.reaction, unlocks: [], threads: [] };
    }
    if (!this.check(id, selected, conclusion)) return { ok: false, message: UNSUPPORTED };
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
