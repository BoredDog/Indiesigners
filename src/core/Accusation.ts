// A2 final accusation (content/accusation.json, script v2 d9): name who caused the incident,
// backed by one card per witness. Pure checks so tools/check-core.ts can test them; the scene only renders.
import { gameState } from './GameState';
import { fmt, story, type WitnessId } from './StoryData';

export type AccusationPicks = Partial<Record<WitnessId, string>>;

export type AccusationResult = { ok: true; reaction: string } | { ok: false; message: string };

export const Accusation = {
  get text() {
    return story.accusation;
  },

  /** Known evidence the player can pick for a witness's slot (everything found on that page). */
  cards(witness: WitnessId): string[] {
    return story.evidence.filter((e) => e.witness === witness && gameState.hasEvidence(e.id)).map((e) => e.id);
  },

  /** Slots whose pick supports the accusation (unpicked counts as not holding). */
  holdingSlots(picks: AccusationPicks): number {
    return story.accusation.slots.filter((s) => s.accept.includes(picks[s.witness] ?? '')).length;
  },

  /**
   * Feedback order (no penalty, nothing locks): pick everything first; then the slots are judged
   * ("{n} of 3 witness cards hold"); only when all three hold is the conclusion judged, so
   * guessing names can't brute-force the answer. Right → the conclusion's narration.
   */
  check(picks: AccusationPicks, conclusion: string | undefined): AccusationResult {
    const a = story.accusation;
    const f = a.feedback;
    if (!conclusion || a.slots.some((s) => !picks[s.witness])) return { ok: false, message: f.pickFirst };
    const holding = this.holdingSlots(picks);
    if (holding < a.slots.length) return { ok: false, message: fmt(f.slotsHold, { n: holding }) };
    const pick = a.conclusions.find((c) => c.id === conclusion);
    const reaction = a.reactions[conclusion] ?? '';
    return pick?.correct ? { ok: true, reaction } : { ok: false, message: reaction };
  },

  /** Check and, when right, record it (the Finale may then play). */
  accuse(picks: AccusationPicks, conclusion: string | undefined): AccusationResult {
    const r = this.check(picks, conclusion);
    if (r.ok) gameState.setFlag('accused');
    return r;
  },
};
