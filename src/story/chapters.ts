// Scene select: a checkpoint for every episode the player has reached. Each time an episode ends,
// the save as it stands then (evidence, choices, flags) is kept as the start of the next one. These
// survive RESTART STORY, so an unlocked episode stays unlocked. Read by the title's SCENE SELECT.
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

/** The save to start episode `n` from (episode 1 always starts fresh), or null if not reached yet. */
export function chapterSave(n: number): StorySave | null {
  if (n <= 0) return { episode: 0, flags: {}, found: [], remembered: [] };
  const s = loadChapters()[n];
  return s ? (JSON.parse(JSON.stringify(s)) as StorySave) : null;
}
