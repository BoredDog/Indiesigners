import type { Witness } from './MemoryData';

/**
 * What the Memory scene needs from the game. Kept as an interface so the scene works before
 * GameState (feat/core) is merged: `setMemoryDeps(...)` swaps the dev stand-in for the real one.
 */
export interface MemoryDeps {
  hasEvidence(id: string): boolean;
  addEvidence(id: string): void;
  /** Core deductions for this witness, with the evidence each one needs. */
  deductionsFor(witness: Witness): { id: string; requiredEvidence: string[]; confirmed: boolean }[];
  confirmDeduction(id: string): void; // only used by the dev fallback when no Deduction scene exists
  isResolved(witness: Witness): boolean;
  /** One-time tips ("Tip: Inspect loud words…"). */
  seen(key: string): boolean;
  markSeen(key: string): void;
}

// Dev stand-in: in-memory state + Mira's deductions from Blueprint D1 (requirements approximated
// to this page's fragments until deductions.json lands).
const devEvidence = new Set<string>();
const devConfirmed = new Set<string>();
const devSeen = new Set<string>();
const DEV_DEDUCTIONS: Record<Witness, { id: string; requiredEvidence: string[] }[]> = {
  mira: [
    { id: 'sis_1', requiredEvidence: ['ev_mira_bell', 'ev_mira_clocks', 'ev_mira_resonance'] },
    { id: 'sis_2', requiredEvidence: ['ev_mira_clocks', 'ev_mira_later_entry'] },
    { id: 'sis_3', requiredEvidence: ['ev_mira_staff', 'ev_mira_later_entry'] },
  ],
  arun: [],
  leela: [],
};

export const devMemoryDeps: MemoryDeps = {
  hasEvidence: (id) => devEvidence.has(id),
  addEvidence: (id) => void devEvidence.add(id),
  deductionsFor: (w) => DEV_DEDUCTIONS[w].map((d) => ({ ...d, confirmed: devConfirmed.has(d.id) })),
  confirmDeduction: (id) => void devConfirmed.add(id),
  isResolved: () => false,
  seen: (k) => devSeen.has(k),
  markSeen: (k) => void devSeen.add(k),
};

let current: MemoryDeps = devMemoryDeps;
export const memoryDeps = (): MemoryDeps => current;
export function setMemoryDeps(deps: MemoryDeps): void {
  current = deps;
}
