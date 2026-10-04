import type { BubbleKind, CutoutDef, Rect, RowSpec } from '../../comic';
import mira from '../../../content/pages/mira.json';

// Shape of content/pages/<witness>.json (layout + where each fragment sits). Story text that
// isn't tied to a position (deductions, conversations) lives in Nav's content/*.json.

export type Witness = 'mira' | 'arun' | 'leela';

export interface FragmentDef {
  evidence: string; // evidence id, shared with GameState / evidence.json
  panel: string;
  sfx: string;
  text: string;
  x: number;
  y: number; // panel-local
  core: boolean; // counts towards "Evidence n/5"; optional evidence never gates anything
  puzzle?: string; // Echo Paths puzzle that guards this fragment
  first?: boolean; // pulse it as the page's teaching clue
  color?: string;
  size?: number;
  angle?: number;
  card?: { x: number; y: number }; // where the evidence card goes (panel-local); default: below the word
}

export interface BubbleDef {
  panel: string;
  kind: BubbleKind;
  text: string;
  x: number;
  y: number;
  tail?: { x: number; y: number };
  maxWidth?: number;
}

export interface MemoryPageData {
  witness: Witness;
  title: string;
  background: string;
  layout: RowSpec[];
  panels: { id: string; src: Rect; cutouts?: CutoutDef[] }[];
  openingNarration: string;
  closingNarration: string;
  bubbles: BubbleDef[];
  fragments: FragmentDef[];
}

export const MEMORY_PAGES: Partial<Record<Witness, MemoryPageData>> = {
  mira: mira as MemoryPageData,
};
