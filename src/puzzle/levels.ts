// Browser-side level registry: every content/puzzles/*.json, bundled by Vite.
import { parseLevel } from './Rules';
import type { Level, LevelFile } from './types';

const files = import.meta.glob<LevelFile>('../../content/puzzles/*.json', { eager: true, import: 'default' });
const byId = new Map<string, LevelFile>(Object.values(files).map((f) => [f.id, f]));

/** Parsed level, or undefined if no level file exists (callers then skip the puzzle). */
export function getLevel(id: string | undefined): Level | undefined {
  const f = id ? byId.get(id) : undefined;
  if (!f) return undefined;
  try {
    return parseLevel(f);
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

export const LEVEL_IDS = [...byId.keys()].sort();

/** On-screen puzzle text (kept here so content/ui_text.json stays Nav's). */
export const PUZZLE_TEXT = {
  moves: 'MOVES {moves}  ·  PAR {par}',
  undo: 'UNDO',
  reset: 'RESET',
  hint: 'HINT',
  skip: 'SKIP',
  back: 'BACK',
  slip: 'The memory slips… the ink took that step.',
  caught: 'The echo saw you. The memory rewinds.',
  hintShown: 'The lantern shows the next steps.',
  hintNone: 'No path from here. Reset the memory.',
  skipConfirm: 'Skip this Echo Path and recover the fragment anyway?',
  solved: 'FRAGMENT RECOVERED',
  controls: 'Click a neighbouring tile or use the arrow keys / WASD.  Z = undo · R = reset',
  light: 'LIGHT',
  // First time a move is blocked for each reason (once per board).
  blocked: {
    ink: 'Ink is erased memory. Move the light to move the shadows.',
    gate: 'A closed gate. Its rope or node opens it.',
    water: 'Flooded. A sluice drains this channel.',
    crate: 'The crate will not move that way.',
  } as Record<string, string>,
} as const;
