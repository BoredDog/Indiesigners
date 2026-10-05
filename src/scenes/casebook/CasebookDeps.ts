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

/** The side cards on the board (Blueprint J): THE FIGURE, NIA VANE, THE CASE REQUEST. */
export type SideCardId = 'figure' | 'nia' | 'case_request';

export interface CasebookDeps {
  cards(): CaseCard[];
  /** The investigator's current note on a side card (first / after / final, by progress). */
  sideNote(id: SideCardId): string;
  hasEvidence(id: string): boolean;
  evidenceText(id: string): string;
  /** Threads whose two endpoint cards are both known (Blueprint A20). */
  threads(): CaseThread[];
  seen(key: string): boolean;
  markSeen(key: string): void;
}

const DEV_CARDS: Omit<CaseCard, 'confirmed'>[] = [
  { id: 'sis_1', witness: 'mira', question: 'Who rang the village bell at 2:17?', requiredEvidence: ['ev_mira_bell', 'ev_mira_clocks', 'ev_mira_resonance'], conclusion: 'The Echo Lantern network rang it. No hand touched the rope.', notes: { pinned: 'The rope never moved. The bell rang anyway.', related: 'Corroborates the lantern network.', final: 'The bell was a broadcast, not a warning.' } },
  { id: 'sis_2', witness: 'mira', question: 'Why do witness memories show different times?', requiredEvidence: ['ev_mira_clocks', 'ev_mira_later_entry'], conclusion: '2:17 is when the network froze the clocks. The night went on.', notes: { pinned: 'Every clock stopped at 2:17.', related: 'Contradicts the 2:31 watch.', final: 'The clocks froze. The night didn\'t.' } },
  { id: 'sis_3', witness: 'mira', question: 'Who is the figure with the staff?', requiredEvidence: ['ev_mira_staff', 'ev_mira_later_entry'], conclusion: 'Veyra\'s lantern apprentice. He took Nia from the sickroom.', notes: { pinned: 'A staff at Nia\'s door. A name scraped from the register.', related: 'The same tools cross the river.', final: 'Veyra\'s lantern apprentice took Nia.' } },
  { id: 'bro_1', witness: 'arun', question: 'Why did the river disappear?', requiredEvidence: ['ev_arun_splash', 'ev_arun_clank'], conclusion: 'The emergency sluice drained it into the lantern\'s channels.', notes: { pinned: 'The river vanished from the surface.', related: 'Corroborates the underground network.', final: 'The sluice fed the river to the lantern.' } },
  { id: 'bro_2', witness: 'arun', question: 'When did Luke actually see the figure?', requiredEvidence: ['ev_arun_tick', 'ev_arun_footsteps'], conclusion: 'Between 2:17 and 2:31. The night went on after the clocks stopped.', notes: { pinned: 'The watch says 2:31.', related: 'Reveals the post-freeze timeline.', final: 'The village clock cannot be trusted.' } },
  { id: 'bro_3', witness: 'arun', question: 'Who was the walker carrying?', requiredEvidence: ['ev_arun_cloth', 'ev_arun_footsteps'], conclusion: 'Nia Vane, carried across the dry river to the lantern-house.', notes: { pinned: 'A silver hairclip on the walker\'s coat.', related: 'Reveals Nia as the carried child.', final: 'The apprentice carried his sister to the machine.' } },
  { id: 'mom_1', witness: 'leela', question: 'What can the Echo Lantern actually do?', requiredEvidence: ['ev_leela_tink', 'ev_leela_hum'], conclusion: 'It can extract, store and transfer memories, and bind multiple minds as anchors.', notes: { pinned: 'The Echo Lantern stores and transfers memory.', related: 'Reveals the village-wide anchor mechanism.', final: 'The machine could bind many minds at once.' } },
  { id: 'mom_2', witness: 'leela', question: 'Why were the memories altered?', requiredEvidence: ['ev_leela_click', 'ev_leela_paper'], conclusion: 'Elias ran a self-purge. His name, face and record were erased from Veyra.', notes: { pinned: 'The records show deliberate edits.', related: 'The purge answers to the apprentice staff.', final: 'He erased himself. Name, face, record.' } },
  { id: 'mom_3', witness: 'leela', question: 'What caused the mass disappearance?', requiredEvidence: ['ev_leela_click', 'ev_leela_hum', 'ev_leela_beep'], conclusion: 'Elias opened every node to save Nia. The village became her anchors.', notes: { pinned: 'The console logged an activation at 2:17.', related: 'Reveals Elias as the operator.', final: 'Elias Vane opened Veyra. Then he walked away. Where to?' } },
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
  ev_mira_bell: 'The bell rang at 2:17. The rope never moved.',
  ev_mira_clocks: 'School clock, tower clock, wall clock: all 2:17.',
  ev_mira_resonance: 'Lantern resonance hums in the bell frame.',
  ev_mira_later_entry: 'Ivy\'s ledger, by her own watch: \'2:31. Nia\'s cot is empty.\'',
  ev_mira_staff: 'The hand at Nia\'s door held an apprentice lantern staff.',
  ev_arun_splash: 'Ferry log: full current at 2:10.',
  ev_arun_tick: 'Luke\'s wind-up watch ran past 2:17. It stopped at 2:31.',
  ev_arun_clank: 'Emergency sluice: opens when the lantern runs hot. Drains to the lantern-house.',
  ev_arun_footsteps: 'Footsteps on the dry riverbed, minutes after the bell. Toward the lantern-house.',
  ev_arun_cloth: 'Nia\'s silver hairclip, snagged on the walker\'s coat.',
  ev_leela_tink: 'Echo Lantern spool: records, extracts and transfers memory.',
  ev_leela_hum: 'Village map: 32 anchor nodes, one for every soul.',
  ev_leela_beep: 'Nia Vane: memory fading. Single-node trials failed.',
  ev_leela_click: '2:17: link opened with the apprentice staff. Operator: E. Vane.',
  ev_leela_paper: 'Self-purge, keyed to the apprentice staff: erase the operator\'s name, face and record.',
};

const notes0: Record<SideCardId, string> = {
  figure: 'Same outline appears near every major clue.',
  nia: 'Clinic card in the sickroom register.',
  case_request: 'Unsigned. Found in my lantern case.',
};

export const devCasebookDeps: CasebookDeps = {
  cards: () => {
    const m = memoryDeps();
    return DEV_CARDS.map((c) => ({
      ...c,
      confirmed: m.deductionsFor(c.witness).some((d) => d.id === c.id && d.confirmed),
    }));
  },
  sideNote: (id) => ({ figure: notes0.figure, nia: notes0.nia, case_request: notes0.case_request })[id],
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
