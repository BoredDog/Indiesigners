import Phaser from 'phaser';
import { COLORS } from '../../comic';
import cluesJson from '../../../content/village_clues.json';

// V20 (final script §4): the village investigation. Text lives in content/village_clues.json;
// hotspot positions and placeholder props live here and follow the village background.

export type ClueId = 'footprints' | 'key' | 'bell' | 'clocks' | 'records' | 'symbols' | 'recording';

export interface VillageClue {
  id: ClueId;
  evidence: string;
  title: string;
  hover: string;
  discovery: string;
  narration: string[];
}

export const CLUES = cluesJson.clues as VillageClue[];

/** Hotspots on the 1920×1080 village (zone = x ± w/2, y - h .. y), clear of the witnesses, tower and well. */
export const CLUE_SPOTS: Record<ClueId, { x: number; y: number; w: number; h: number }> = {
  footprints: { x: 1040, y: 875, w: 170, h: 60 }, // street in front of the tower
  key: { x: 1172, y: 885, w: 80, h: 60 }, // just past the footprints
  bell: { x: 910, y: 228, w: 140, h: 112 }, // the belfry
  clocks: { x: 910, y: 385, w: 160, h: 157 }, // the tower clock face
  records: { x: 1345, y: 770, w: 80, h: 110 }, // notice on the blue house
  symbols: { x: 220, y: 770, w: 110, h: 130 }, // mark on the left house wall
  recording: { x: 1722, y: 790, w: 110, h: 110 }, // old recorder by the green house
};

/** Text shown when a clue is found: the discovery, then the narration lines. */
export function discoveryText(c: VillageClue): string {
  return [c.discovery, ...c.narration].join('\n');
}

/** The spiral mark that recurs at the tower, the doors and the well. */
function symbol(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, alpha: number) {
  g.lineStyle(Math.max(2, r * 0.18), COLORS.spiritTeal, alpha);
  g.strokeCircle(x, y, r);
  g.beginPath();
  for (let k = 0; k <= 24; k++) {
    const a = (k / 24) * Math.PI * 3;
    const rr = (r * 0.75 * k) / 24;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (k === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.strokePath();
  g.lineBetween(x - r * 1.2, y + r * 1.3, x + r * 1.2, y + r * 1.3);
}

/**
 * Placeholder props so each hotspot has something to see (Bhumi's village art replaces them).
 * Returns one container per clue, named `clue:<id>`.
 */
export function drawClueProps(scene: Phaser.Scene): Record<ClueId, Phaser.GameObjects.Container> {
  const out = {} as Record<ClueId, Phaser.GameObjects.Container>;
  const add = (id: ClueId, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    const g = scene.add.graphics();
    draw(g);
    out[id] = scene.add.container(0, 0, [g]).setName(`clue:${id}`);
  };
  add('footprints', (g) => {
    // Pairs of prints walking left toward the tower door, then nothing.
    g.fillStyle(0x2a2420, 0.75);
    for (let k = 0; k < 6; k++) {
      const x = 1110 - k * 30;
      const y = 852 - k * 3 + (k % 2 ? -8 : 8);
      g.fillEllipse(x, y, 20, 9).fillEllipse(x - 11, y, 7, 6);
    }
  });
  add('key', (g) => {
    g.lineStyle(5, 0x8a7a55, 1).strokeCircle(1158, 866, 9);
    g.lineBetween(1167, 866, 1192, 866).lineBetween(1186, 866, 1186, 874).lineBetween(1192, 866, 1192, 873);
    g.fillStyle(0x7a1010, 0.85).fillCircle(1176, 868, 5).fillCircle(1160, 873, 3);
  });
  add('bell', (g) => {
    // The rope hangs straight and still under the bell.
    g.lineStyle(4, 0xc9a66b, 1).lineBetween(932, 205, 932, 262);
    g.lineStyle(4, 0xc9a66b, 1).strokeEllipse(932, 268, 12, 16);
  });
  add('clocks', () => {
    /* the tower clock itself (already in the background) */
  });
  add('records', (g) => {
    g.fillStyle(COLORS.paper, 0.95).fillRect(1312, 676, 66, 84);
    g.lineStyle(3, COLORS.ink, 1).strokeRect(1312, 676, 66, 84);
    g.lineStyle(2, COLORS.ink, 0.7);
    for (let k = 0; k < 6; k++) g.lineBetween(1320, 690 + k * 11, 1366 - (k % 3) * 8, 690 + k * 11);
    g.fillStyle(0xc0392b, 1).fillCircle(1345, 680, 5);
  });
  add('symbols', (g) => {
    symbol(g, 220, 700, 26, 0.75);
    // The same mark, smaller, at the tower door and by the well (decoration; one hotspot).
    symbol(g, 868, 700, 12, 0.5);
    symbol(g, 1236, 700, 12, 0.5);
  });
  add('recording', (g) => {
    g.fillStyle(0x5a3d22, 1).fillRect(1690, 742, 64, 44);
    g.lineStyle(3, COLORS.ink, 1).strokeRect(1690, 742, 64, 44);
    g.fillStyle(0x2a2420, 1).fillCircle(1708, 764, 11).fillCircle(1736, 764, 11);
    g.lineStyle(3, COLORS.ink, 1).lineBetween(1722, 742, 1740, 708);
    g.fillStyle(0xc9a66b, 1).fillTriangle(1736, 700, 1760, 690, 1752, 716);
  });
  return out;
}
