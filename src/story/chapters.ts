// Scene select: every episode up to the furthest one the player has reached can be played again.
// Each time an episode ends, the save is recorded (so we know how far they got, and have their
// evidence even after RESTART STORY). Replaying an episode keeps the evidence, choices and flags the
// player has now; it only moves them back to the start of that episode.
import type { StorySave } from '../world/Director';

const KEY = 'echoes_story_chapters_v1';

export function loadChapters(): Record<number, StorySave> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<number, StorySave>;
  } catch {
    return {};
  }
}

/** Keep the save at the start of episode `s.episode` (called whenever an episode ends). */
export function saveChapter(s: StorySave) {
  if (s.episode <= 0) return;
  const all = loadChapters();
  all[s.episode] = JSON.parse(JSON.stringify(s)) as StorySave;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* private mode: scene select just stays locked */
  }
}

/** The furthest episode index reached (0 = only Episode One). */
export function furthestEpisode(current?: StorySave | null) {
  const keys = Object.keys(loadChapters()).map(Number);
  return Math.max(0, current?.episode ?? 0, ...keys);
}

/**
 * The save to replay episode `n` with: the evidence, choices and flags the player has now (their
 * current save, or the furthest checkpoint if there isn't one), moved to the start of episode `n`.
 */
export function replaySave(n: number, current: StorySave | null): StorySave | null {
  if (n > furthestEpisode(current)) return null;
  const all = loadChapters();
  const latest = all[Math.max(0, ...Object.keys(all).map(Number))];
  const base = current && (current.found.length || current.episode) ? current : latest ?? { episode: 0, flags: {}, found: [], remembered: [] };
  const s = JSON.parse(JSON.stringify(base)) as StorySave;
  s.episode = n;
  return s;
}
