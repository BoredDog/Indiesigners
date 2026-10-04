import { gameState } from '../core/GameState';
import { deduction, deductionsOf, evidence, isEvidenceId, story, type DeductionId } from '../core/StoryData';
import { setCasebookDeps, type CaseCard } from './casebook/CasebookDeps';
import { setMemoryDeps } from './memory/MemoryDeps';

/**
 * Connects the Memory and Casebook scenes to the real GameState + content/*.json
 * (they start on dev stand-ins). Call once at boot, before any scene uses them.
 */
export function wireSceneDeps(): void {
  setMemoryDeps({
    hasEvidence: (id) => gameState.hasEvidence(id),
    addEvidence: (id) => {
      if (isEvidenceId(id)) gameState.addEvidence(id);
      else console.warn(`Memory page uses unknown evidence id ${id}`);
    },
    deductionsFor: (w) =>
      deductionsOf(w).map((d) => ({
        id: d.id,
        requiredEvidence: d.requiredEvidence,
        confirmed: gameState.deductionState(d.id) === 'confirmed',
      })),
    confirmDeduction: (id) => void gameState.confirmDeduction(id as DeductionId),
    isResolved: (w) => gameState.witnessStatus(w) === 'resolved',
    seen: (k) => gameState.flag(k),
    markSeen: (k) => gameState.setFlag(k),
  });

  const notes = new Map(story.casebook.map((c) => [c.id, c]));
  setCasebookDeps({
    cards: () =>
      story.deductions.map(
        (d): CaseCard => ({
          id: d.id,
          witness: d.witness,
          question: deduction(d.id).question,
          requiredEvidence: d.requiredEvidence,
          confirmed: gameState.deductionState(d.id) === 'confirmed',
          conclusion: d.conclusion,
          notes: {
            pinned: notes.get(d.id)?.first ?? '',
            related: notes.get(d.id)?.after ?? '',
            final: notes.get(d.id)?.final ?? '',
          },
        }),
      ),
    hasEvidence: (id) => gameState.hasEvidence(id),
    evidenceText: (id) => (isEvidenceId(id) ? evidence(id).text : id),
    threads: () => gameState.threadData().map((t) => ({ from: t.from, to: t.to, type: t.type })),
    seen: (k) => gameState.flag(k),
    markSeen: (k) => gameState.setFlag(k),
  });
}
