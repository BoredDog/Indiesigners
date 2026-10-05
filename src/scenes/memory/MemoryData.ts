import type { BubbleKind, CutoutDef, Rect, RowSpec } from '../../comic';
import { evidence } from '../../core/StoryData';
import arun from '../../../content/pages/arun.json';
import leela from '../../../content/pages/leela.json';
import mira from '../../../content/pages/mira.json';

// content/pages/<witness>.json holds layout only: panel crops, bubbles and where each fragment
// sits. A fragment's SFX word, text, core flag and puzzle come from content/evidence.json.

export type Witness = 'mira' | 'arun' | 'leela';

/** Fragment placement as written in the page file. */
interface FragmentLayout {
  evidence: string; // evidence id in content/evidence.json
  panel: string;
  x: number;
  y: number; // panel-local
  first?: boolean; // pulse it as the page's teaching clue
  color?: string;
  size?: number;
  angle?: number;
  card?: { x: number; y: number }; // where the evidence card goes (panel-local); default: below the word
  light?: boolean; // A1: only visible under the spirit-light (optional evidence only)
}

/** A1: hidden teal residue shown only under the spirit-light. fx/fy = fraction of the panel. */
export interface ResidueDef {
  panel: string;
  fx: number;
  fy: number;
  text: string;
  size?: number;
  angle?: number;
}

/** Placement + story data, as the Memory scene uses it. */
export interface FragmentDef extends FragmentLayout {
  sfx: string;
  text: string;
  core: boolean; // counts towards "Evidence n/5"; optional evidence never gates anything
  puzzle?: string; // Echo Paths puzzle that guards this fragment
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
  residue?: ResidueDef[];
}

type PageFile = Omit<MemoryPageData, 'fragments'> & { fragments: FragmentLayout[] };

function resolve(page: PageFile): MemoryPageData {
  return {
    ...page,
    fragments: page.fragments.map((f) => {
      const e = evidence(f.evidence);
      return { ...f, sfx: e.sfx, text: e.text, core: e.core, puzzle: e.puzzle ?? undefined };
    }),
  };
}

export const MEMORY_PAGES: Record<Witness, MemoryPageData> = {
  mira: resolve(mira as PageFile),
  arun: resolve(arun as PageFile),
  leela: resolve(leela as PageFile),
};
