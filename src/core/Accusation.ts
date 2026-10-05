// A2 final accusation (content/accusation.json): name who caused the incident, backed by one clue
// per witness. Pure checks so tools/check-core.ts can test them; the scene only renders.
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

  /** Slots whose pick doesn't support the accusation (unpicked counts as wrong). */
  wrongSlots(picks: AccusationPicks): number {
    return story.accusation.slots.filter((s) => !s.accept.includes(picks[s.witness] ?? '')).length;
  },

  check(picks: AccusationPicks, conclusion: string | undefined): AccusationResult {
    const a = story.accusation;
    const f = a.feedback;
    if (!conclusion || a.slots.some((s) => !picks[s.witness])) return { ok: false, message: f.pickFirst };
    const wrong = this.wrongSlots(picks);
    const vars = { n: wrong, verb: wrong === 1 ? 'proves' : 'prove' };
    const pick = a.conclusions.find((c) => c.id === conclusion);
    if (pick?.correct) {
      return wrong ? { ok: false, message: fmt(f.rightButUnproven, vars) } : { ok: true, reaction: a.reactions[conclusion] };
    }
    return { ok: false, message: (a.reactions[conclusion] ?? '') + (wrong ? fmt(f.andCluesOff, vars) : '') };
  },

  /** Check and, when right, record it (the Finale may then play). */
  accuse(picks: AccusationPicks, conclusion: string | undefined): AccusationResult {
    const r = this.check(picks, conclusion);
    if (r.ok) gameState.setFlag('accused');
    return r;
  },
};
