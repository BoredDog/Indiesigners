// Echo Paths level + state types (PLAN.md §3). Pure data: no Phaser, so tools/ can import it.

export type Dir = 'N' | 'E' | 'S' | 'W';
export const DIR_ORDER: readonly Dir[] = ['N', 'E', 'S', 'W'];
export const DIRS: Record<Dir, readonly [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

/** A sentinel (memory echo) walks its path one tile per turn, ping-pong unless `loop`. */
export interface SentinelDef {
  path: [number, number][];
  loop?: boolean;
  /** Facing for a sentinel that never moves (single-tile path). */
  face?: Dir;
}

/**
 * Level file in content/puzzles/<id>.json.
 * Built-in tile chars: `.` floor, `#` pillar (tall: blocks, casts shadow), `_` void (pit),
 * `S` start, `G` goal, `D` clock dial (rotates the light 90° clockwise when entered),
 * `C` crate on floor (tall, pushable), `x` collapsing floor (gone once the wisp leaves it).
 * Other chars come from `legend`:
 *   `gate:g1` (closed) / `gate:g1:open`, `water:s1` (flooded) / `water:s1:dry`,
 *   `lever:g1`, `sluice:s1`, `node:g1,g2` (each toggles every listed group when entered).
 */
export interface LevelFile {
  id: string;
  title?: string;
  tip?: string; // one-line rule hint shown when the board opens
  tiles: string[];
  legend?: Record<string, string>;
  light: Dir; // side the light comes FROM; shadows fall the opposite way
  shadow?: number; // shadow length in tiles (default 2)
  sentinels?: SentinelDef[];
  reward?: string; // evidence id (informational; the scene gets it from the caller)
  par: number;
}

export type Cell =
  | { k: 'floor' }
  | { k: 'pillar' }
  | { k: 'void' }
  | { k: 'goal' }
  | { k: 'dial' }
  | { k: 'collapse' }
  | { k: 'gate'; group: number; open: boolean }
  | { k: 'water'; group: number; dry: boolean }
  | { k: 'switch'; kind: 'lever' | 'sluice' | 'node'; groups: number[]; mask: number };

export interface Level {
  id: string;
  title: string;
  tip?: string;
  w: number;
  h: number;
  cells: Cell[]; // index = y * w + x
  groups: string[]; // group names; bit i of State.toggles = group i flipped from its start
  start: number;
  goal: number;
  light: number; // index into DIR_ORDER
  shadow: number;
  crates: number[];
  sentinels: { path: number[]; loop: boolean; face: Dir }[];
  period: number; // turns after which every sentinel is back where it started (1 = none)
  par: number;
  reward?: string;
}

export interface State {
  pos: number;
  light: number;
  toggles: number;
  crates: number[]; // sorted cell indices
  t: number; // turns taken (sentinel phase)
  collapsed: number[]; // sorted cell indices that became pits
}

export type StepEvent =
  | 'blocked' // nothing happened (wall, closed gate, water, ink, unpushable crate)
  | 'moved'
  | 'slip' // the wisp's tile turned to ink: the memory slips (scene rewinds)
  | 'caught' // a sentinel reached / faced the wisp (scene rewinds)
  | 'win';

export interface StepResult {
  event: StepEvent;
  state: State; // unchanged when blocked
  pushed?: { from: number; to: number };
  rotated?: boolean;
  toggled?: number[]; // group indices
  collapsed?: number; // cell that just fell away
  reason?: 'edge' | 'wall' | 'gate' | 'water' | 'ink' | 'crate' | 'void';
}
