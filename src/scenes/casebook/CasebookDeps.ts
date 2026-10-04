import { memoryDeps } from '../memory/MemoryDeps';
import type { Witness } from '../memory/MemoryData';

// What the Casebook needs from the game. Like MemoryDeps, it starts on a dev stand-in built from
// Blueprint D1/D2/J and switches to GameState + content/*.json with `setCasebookDeps(...)`.

export type ThreadType = 'corroborates' | 'contradicts' | 'reveals';

export interface CaseCard {
  id: string; // deduction id sis_1 … mom_3
  witness: Witness;
  question: string;
  requiredEvidence: string[];
  confirmed: boolean;
  conclusion: string;
  notes: { pinned: string; related: string; final: string }; // Elias's handwritten notes (Part J)
}

export interface CaseThread {
  from: string;
  to: string;
  type: ThreadType;
}

export interface CasebookDeps {
  cards(): CaseCard[];
  hasEvidence(id: string): boolean;
  evidenceText(id: string): string;
  /** Threads whose two endpoint cards are both known (Blueprint A20). */
  threads(): CaseThread[];
  seen(key: string): boolean;
  markSeen(key: string): void;
}

const DEV_CARDS: Omit<CaseCard, 'confirmed'>[] = [
  { id: 'sis_1', witness: 'mira', question: 'Who activated the village bell at 2:17?', requiredEvidence: ['ev_mira_bell', 'ev_mira_clocks', 'ev_mira_resonance'], conclusion: 'The Echo Lantern triggered the bell through the underground network. No person rang it.', notes: { pinned: 'Who rang the bell? The rope was untouched.', related: 'Corroborates the lantern network.', final: 'The bell was a broadcast, not a warning.' } },
  { id: 'sis_2', witness: 'mira', question: 'Why do witness memories show different times?', requiredEvidence: ['ev_mira_clocks', 'ev_mira_later_entry'], conclusion: '2:17 is the system freeze. Events continued after the clocks stopped.', notes: { pinned: 'Every clock stopped at 2:17.', related: 'Contradicts the 2:31 watch.', final: 'The timeline was frozen, not the night.' } },
  { id: 'sis_3', witness: 'mira', question: 'Who is the fourth figure?', requiredEvidence: ['ev_mira_staff', 'ev_mira_later_entry'], conclusion: 'The recurring figure is Elias Vane, the former Veyra apprentice.', notes: { pinned: 'A damaged lantern is next to a missing apprentice name.', related: 'Reveals the recurring figure as Elias.', final: 'The fourth figure was the investigator himself.' } },
  { id: 'bro_1', witness: 'arun', question: 'Why did the river disappear?', requiredEvidence: ['ev_arun_clank'], conclusion: 'The river was diverted underground during the lantern overload.', notes: { pinned: 'The river vanished from the surface.', related: 'Corroborates the underground network.', final: 'The water was diverted into the lantern channels.' } },
  { id: 'bro_2', witness: 'arun', question: 'When did Arun actually see the figure?', requiredEvidence: ['ev_arun_tick'], conclusion: 'The night continued after 2:17, proving the village timeline is false.', notes: { pinned: 'The watch says 2:31.', related: 'Reveals the post-freeze timeline.', final: 'The village clock cannot be trusted.' } },
  { id: 'bro_3', witness: 'arun', question: 'Who was Elias carrying to the lantern chamber?', requiredEvidence: ['ev_arun_cloth'], conclusion: "Nia was the child in Elias's arms. The experiment was meant to preserve her mind.", notes: { pinned: "A silver hairclip was caught on the figure's coat.", related: 'Reveals Nia as the carried child.', final: 'Elias was transporting his sister to the machine.' } },
  { id: 'mom_1', witness: 'leela', question: 'What can the Echo Lantern actually do?', requiredEvidence: ['ev_leela_tink'], conclusion: 'It can extract, store and transfer memories, and bind multiple minds as anchors.', notes: { pinned: 'The Echo Lantern stores and transfers memory.', related: 'Reveals the village-wide anchor mechanism.', final: 'The machine could bind many minds at once.' } },
  { id: 'mom_2', witness: 'leela', question: 'Why were the memories altered?', requiredEvidence: ['ev_leela_click'], conclusion: 'Elias triggered a second pulse to erase his role and hide the experiment.', notes: { pinned: 'The records show deliberate edits.', related: "Corroborates Elias's handwriting and motive.", final: 'He erased the evidence after the failure.' } },
  { id: 'mom_3', witness: 'leela', question: 'What caused the mass disappearance?', requiredEvidence: ['ev_leela_whoom'], conclusion: 'Elias activated the network to save Nia, trapping villagers and creating the ghost loops.', notes: { pinned: 'The master console contains an activation sequence.', related: 'Reveals Elias as the operator.', final: 'He caused the incident.' } },
];

const DEV_THREADS: CaseThread[] = [
  { from: 'sis_1', to: 'mom_1', type: 'corroborates' },
  { from: 'sis_2', to: 'bro_2', type: 'contradicts' },
  { from: 'sis_3', to: 'bro_3', type: 'reveals' },
  { from: 'bro_1', to: 'mom_3', type: 'corroborates' },
  { from: 'bro_3', to: 'mom_2', type: 'reveals' },
  { from: 'mom_2', to: 'sis_3', type: 'corroborates' },
];

const DEV_EVIDENCE_TEXT: Record<string, string> = {
  ev_mira_bell: 'The village bell rang at 2:17.',
  ev_mira_clocks: 'Three clocks stopped at 2:17.',
  ev_mira_resonance: 'Lantern resonance reached the bell tower.',
  ev_mira_later_entry: 'A later entry reads 2:31.',
  ev_mira_staff: 'The figure carried the apprentice lantern staff.',
  ev_arun_clank: 'Emergency sluice opens beneath the workshop.',
  ev_arun_tick: 'Pocket watch stopped at 2:31.',
  ev_arun_cloth: "Silver hairclip caught on the coat.",
  ev_leela_tink: 'Echo Lantern memory spool.',
  ev_leela_click: 'Network link opened by Elias.',
  ev_leela_whoom: 'Master log: Elias activated the network.',
};

export const devCasebookDeps: CasebookDeps = {
  cards: () => {
    const m = memoryDeps();
    return DEV_CARDS.map((c) => ({
      ...c,
      confirmed: m.deductionsFor(c.witness).some((d) => d.id === c.id && d.confirmed),
    }));
  },
  hasEvidence: (id) => memoryDeps().hasEvidence(id),
  evidenceText: (id) => DEV_EVIDENCE_TEXT[id] ?? id,
  threads: () => {
    const known = (cardId: string) =>
      DEV_CARDS.find((c) => c.id === cardId)!.requiredEvidence.some((e) => memoryDeps().hasEvidence(e));
    return DEV_THREADS.filter((t) => known(t.from) && known(t.to));
  },
  seen: (k) => memoryDeps().seen(k),
  markSeen: (k) => memoryDeps().markSeen(k),
};

let current: CasebookDeps = devCasebookDeps;
export const casebookDeps = (): CasebookDeps => current;
export function setCasebookDeps(deps: CasebookDeps): void {
  current = deps;
}
