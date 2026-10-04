// Typed, read-only view of content/*.json (Blueprint text). No runtime mutation (Appendix §4).
import evidenceJson from '../../content/evidence.json';
import deductionsJson from '../../content/deductions.json';
import threadsJson from '../../content/threads.json';
import dialogueJson from '../../content/dialogue.json';
import uiJson from '../../content/ui_text.json';
import openingJson from '../../content/opening.json';
import finaleJson from '../../content/finale.json';
import casebookJson from '../../content/casebook_notes.json';
import memoryJson from '../../content/memory_text.json';

export const WITNESSES = ['mira', 'arun', 'leela'] as const;
export type WitnessId = (typeof WITNESSES)[number];
export type Speaker = WitnessId | 'elias';

export const DEDUCTION_IDS = ['sis_1', 'sis_2', 'sis_3', 'bro_1', 'bro_2', 'bro_3', 'mom_1', 'mom_2', 'mom_3'] as const;
export type DeductionId = (typeof DEDUCTION_IDS)[number];

export type ThreadType = 'corroborates' | 'contradicts' | 'reveals';

export interface Evidence {
  id: string;
  witness: WitnessId | 'tower';
  panel: string | null;
  sfx: string;
  text: string;
  core: boolean;
  puzzle: string | null;
}

export interface Deduction {
  id: DeductionId;
  witness: WitnessId;
  panel: string;
  question: string;
  requiredDescription: string;
  requiredEvidence: string[];
  supportingEvidence: string[];
  conclusion: string;
  wrongConclusions: string[];
  unlocks: string[];
  unlockText: string;
  reaction: string;
}

export interface Thread {
  id: string;
  from: DeductionId;
  type: ThreadType;
  to: DeductionId;
  why: string;
  caption: string;
  reaction: { speaker: WitnessId; line: string };
}

export interface Question {
  id: string;
  requires: string[];
  ask: string;
  answer: string;
  added?: boolean;
}

export interface WitnessDialogue {
  name: string;
  role: string;
  location: string;
  enterButton: string;
  first: string[];
  repeat: string;
  postMemory: string;
  questions: Question[];
  resolution: { unresolvedLoop: string; scene: string; lastLine: string };
}

export interface Popup {
  when: string;
  text: string;
  buttons: string[];
}

export interface UiText {
  popups: Record<string, Popup>;
  title: Record<'logo' | 'subtitle' | 'cta' | 'continue' | 'newGame' | 'settings' | 'credits', string>;
  tutorial: { firstClueCaption: string };
  village: Record<string, string>;
  memory: Record<string, string>;
  aftermath: {
    title: string;
    nothingNew: string;
    return: string;
    newEvidenceBadge: string;
    threadLabels: Record<ThreadType, string>;
  };
  summary: { replayHint: string };
}

export interface OpeningFrame {
  id: number;
  see: string;
  narration: string;
  dialogue: { speaker: Speaker; line: string } | null;
  sfx: string;
  animation: string;
}

export interface FinaleFrame {
  id: number;
  see: string;
  narration: string;
  shows: string;
  sfx: string;
  animation: string;
  button?: string;
}

export interface Finale {
  frames: FinaleFrame[];
  truthEnding: { outcome: string; narration: string; panels: string[]; finalState: string };
  epilogue: { condition: string; outcome: string; narration: string; panel: string; finalState: string };
  summary: { title: string; shows: string; replayHint: string; buttons: string[] };
}

export interface CasebookCard {
  id: string;
  title: string;
  first: string;
  after: string;
  final: string;
}

export interface MemoryPanelText {
  id: string;
  drawn: string;
  dialogue: { speaker: Speaker; line: string; tone: string }[];
  narration: string;
  evidence: string[];
  moment: DeductionId | null;
  silhouette: boolean;
}

export interface MemoryPageText {
  title: string;
  setting: string;
  layout: string;
  silhouette: string;
  openingNarration: string;
  closingNarration: string;
  twistNarration: string;
  panels: MemoryPanelText[];
}

const evidenceList = (evidenceJson as unknown as { evidence: Evidence[] }).evidence;
const deductionList = (deductionsJson as unknown as { deductions: Deduction[] }).deductions;
const threadList = (threadsJson as unknown as { threads: Thread[] }).threads;

export const story = {
  evidence: evidenceList,
  deductions: deductionList,
  threads: threadList,
  dialogue: (dialogueJson as unknown as { witnesses: Record<WitnessId, WitnessDialogue> }).witnesses,
  ui: uiJson as unknown as UiText,
  opening: openingJson as unknown as { frames: OpeningFrame[]; falseAssumption: string },
  finale: finaleJson as unknown as Finale,
  casebook: (casebookJson as unknown as { cards: CasebookCard[] }).cards,
  memory: (memoryJson as unknown as { pages: Record<WitnessId, MemoryPageText> }).pages,
} as const;

const evidenceById = new Map(evidenceList.map((e) => [e.id, e]));
const deductionById = new Map(deductionList.map((d) => [d.id, d]));

export function evidence(id: string): Evidence {
  const e = evidenceById.get(id);
  if (!e) throw new Error(`Unknown evidence id: ${id}`);
  return e;
}

export function isEvidenceId(id: string): boolean {
  return evidenceById.has(id);
}

export function deduction(id: string): Deduction {
  const d = deductionById.get(id as DeductionId);
  if (!d) throw new Error(`Unknown deduction id: ${id}`);
  return d;
}

export function evidenceOf(witness: WitnessId | 'tower'): Evidence[] {
  return evidenceList.filter((e) => e.witness === witness);
}

export function deductionsOf(witness: WitnessId): Deduction[] {
  return deductionList.filter((d) => d.witness === witness);
}

export function witnessName(w: WitnessId): string {
  return story.dialogue[w].name;
}

/** Fill `{name}` placeholders, e.g. fmt(ui.popups.evidenceFound.text, { evidence: '...' }). */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Throws on broken cross-references between content files (run in tools/check-core.ts). */
export function validateStory(): string[] {
  const problems: string[] = [];
  const known = (id: string, where: string) => {
    if (!evidenceById.has(id)) problems.push(`${where}: unknown evidence ${id}`);
  };
  for (const id of DEDUCTION_IDS) if (!deductionById.has(id)) problems.push(`missing deduction ${id}`);
  for (const d of deductionList) {
    if (d.requiredEvidence.length < 2 || d.requiredEvidence.length > 3) problems.push(`${d.id}: needs 2-3 required evidence (A3)`);
    if (d.wrongConclusions.length !== 2) problems.push(`${d.id}: needs exactly 2 wrong conclusions`);
    d.requiredEvidence.forEach((e) => {
      known(e, d.id);
      // Required evidence must come from the deduction's own page so visit order never soft-locks (D3).
      if (evidenceById.get(e)?.witness !== d.witness) problems.push(`${d.id}: required ${e} is not on ${d.witness}'s page`);
      if (evidenceById.get(e)?.core === false) problems.push(`${d.id}: required ${e} is optional evidence`);
    });
    d.supportingEvidence.forEach((e) => known(e, d.id));
  }
  for (const t of threadList) {
    if (!deductionById.has(t.from) || !deductionById.has(t.to)) problems.push(`${t.id}: bad endpoint`);
  }
  for (const w of WITNESSES) {
    const core = evidenceOf(w).filter((e) => e.core).length;
    if (core !== 5) problems.push(`${w}: ${core} core evidence, expected 5 (A4)`);
    for (const q of story.dialogue[w].questions) q.requires.forEach((e) => known(e, q.id));
    for (const p of story.memory[w].panels) p.evidence.forEach((e) => known(e, `${w} ${p.id}`));
  }
  return problems;
}
